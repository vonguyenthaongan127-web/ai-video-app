import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── env ────────────────────────────────────────────────────
const {
  PEXELS_API_KEY,
  PIXABAY_API_KEY,
  UNSPLASH_ACCESS_KEY,
  ELEVENLABS_API_KEY,
  GOOGLE_CLOUD_TTS_KEY,
  PORT = 3000,
} = process.env;

// ── middleware ─────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));   // serves index.html + assets from studio-clean/

// ── helpers ────────────────────────────────────────────────
const fwd = (res, promise) =>
  promise
    .then(async (r) => res.status(r.status).json(await r.json()))
    .catch((e) => res.status(500).json({ error: e.message }));

// ── Pexels ─────────────────────────────────────────────────
app.get('/api/pexels/photos', (req, res) =>
  fwd(res, fetch(`https://api.pexels.com/v1/search?${new URLSearchParams(req.query)}`,
    { headers: { Authorization: PEXELS_API_KEY } }))
);

app.get('/api/pexels/videos', (req, res) =>
  fwd(res, fetch(`https://api.pexels.com/videos/search?${new URLSearchParams(req.query)}`,
    { headers: { Authorization: PEXELS_API_KEY } }))
);

// ── Pixabay ────────────────────────────────────────────────
app.get('/api/pixabay/photos', (req, res) =>
  fwd(res, fetch(`https://pixabay.com/api/?${new URLSearchParams({ key: PIXABAY_API_KEY, ...req.query })}`))
);

app.get('/api/pixabay/videos', (req, res) =>
  fwd(res, fetch(`https://pixabay.com/api/videos/?${new URLSearchParams({ key: PIXABAY_API_KEY, ...req.query })}`))
);

// ── Unsplash ───────────────────────────────────────────────
app.get('/api/unsplash', (req, res) =>
  fwd(res, fetch(`https://api.unsplash.com/search/photos?${new URLSearchParams(req.query)}`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }))
);

// ── ElevenLabs TTS ─────────────────────────────────────────
app.post('/api/tts/elevenlabs/:voiceId', async (req, res) => {
  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${req.params.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify(req.body),
      }
    );
    if (!r.ok) return res.status(r.status).json({ error: `EL ${r.status}` });
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Google Cloud TTS ───────────────────────────────────────
app.post('/api/tts/google', async (req, res) => {
  try {
    const r = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_TTS_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      }
    );
    if (!r.ok) return res.status(r.status).json({ error: `GCLOUD ${r.status}` });
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── start ──────────────────────────────────────────────────
app.listen(PORT, () => console.log(`server running on port ${PORT}`));
