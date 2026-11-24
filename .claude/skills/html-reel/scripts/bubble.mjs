#!/usr/bin/env node
// The camera shrinking into a bubble: the speaker full frame over a
// background clip, then, between the --shrink times, eased (cubic in-out)
// into a rounded box (--box) with a thin light edge, where it stays while
// the background plays. In the box the camera is cropped around --focus
// (its centre and width in the camera frame, by the end of the shrink), so
// the face stays framed as the box narrows.
//
// Usage:
//   bubble.mjs --bg bg.mp4 --cam cam.mp4 --out out.mp4 --shrink 8.30:8.65 [--cam-from S]
//              [--box 721,1072.5,268,375] [--radius 30] [--edge 0.55] [--focus 540,861.5,760]
//              [--dur S] [--fps 30] [--size 1080x1920] [--chrome PATH] [--keep]
//
// Times are seconds of the output, which starts at the background's first
// frame; --cam-from is where in the camera clip the output starts. The box
// is x,y,width,height in output pixels; --edge is the edge's opacity when
// the box is done. --dur defaults to the background's length. Frames are
// pulled with ffmpeg into a temporary folder (--keep keeps it), drawn on an
// OffscreenCanvas in headless Chrome, and encoded with libx264 -crf 16,
// yuv420p, +faststart, with no sound (the edit carries the voice), plus a
// contact sheet (<out>-sheet.jpg, six frames a second). Needs playwright
// (or playwright-core) and ffmpeg; Chrome from --chrome, CHROME_PATH, or
// playwright's own.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The header above, for --help.
const USAGE = (() => { const l = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n'); let i = 1, u = []; while (l[i].startsWith('//')) u.push(l[i++].slice(3)); return u.join('\n'); })();
const { values: o } = parseArgs({
  options: {
    bg: { type: 'string' }, cam: { type: 'string' }, out: { type: 'string' }, shrink: { type: 'string' }, 'cam-from': { type: 'string', default: '0' },
    box: { type: 'string', default: '721,1072.5,268,375' }, radius: { type: 'string', default: '30' }, edge: { type: 'string', default: '0.55' },
    focus: { type: 'string', default: '540,861.5,760' }, dur: { type: 'string' }, fps: { type: 'string', default: '30' },
    size: { type: 'string', default: '1080x1920' }, chrome: { type: 'string' }, keep: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  },
});
if (o.help || !o.bg || !o.cam || !o.out || !o.shrink) { console.log(USAGE); process.exit(o.help ? 0 : 1); }
async function chromium() {
  for (const n of ['playwright', 'playwright-core']) try { const m = await import(n); return m.chromium || m.default.chromium; } catch {}
  const req = createRequire(path.join(process.cwd(), 'x.js'));
  for (const n of ['playwright', 'playwright-core']) try { const m = await import(pathToFileURL(req.resolve(n)).href); return m.chromium || m.default.chromium; } catch {}
  throw new Error('playwright not found: npm i playwright-core here or beside this script');
}

const [W, H] = o.size.toLowerCase().split('x').map(Number), fps = +o.fps;
const [S0, S1] = o.shrink.split(':').map(Number);
const box = o.box.split(',').map(Number), focus = o.focus.split(',').map(Number), radius = +o.radius, edge = +o.edge;
const dur = o.dur ? +o.dur : +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', o.bg]).toString();
const N = Math.round(dur * fps);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bubble-'));
for (const d of ['b', 'c', 'o']) fs.mkdirSync(path.join(tmp, d));
const fit = `fps=${fps},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`;
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', o.bg, '-vf', fit, '-frames:v', String(N), '-q:v', '2', path.join(tmp, 'b/%04d.jpg')]);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', o['cam-from'], '-i', o.cam, '-vf', fit, '-frames:v', String(N), '-q:v', '2', path.join(tmp, 'c/%04d.jpg')]);
const have = (d) => fs.readdirSync(path.join(tmp, d)).length;
console.log(`${N} frames: ${have('b')} from the background, ${have('c')} from the camera`);

const browser = await (await chromium()).launch({ executablePath: o.chrome || process.env.CHROME_PATH || undefined, headless: true });
try {
  const p = await browser.newPage();
  // Serve the frames from a made-up origin so fetch() works.
  await p.route('http://f/**', (r) => {
    const file = path.join(tmp, new URL(r.request().url()).pathname);
    return fs.existsSync(file) ? r.fulfill({ body: fs.readFileSync(file), contentType: 'image/jpeg' }) : r.fulfill({ status: 404 });
  });
  await p.goto('http://f/b/0001.jpg');
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const t = i / fps;
    const k0 = Math.min(1, Math.max(0, (t - S0) / (S1 - S0)));
    const k = k0 < 0.5 ? 4 * k0 ** 3 : 1 - (-2 * k0 + 2) ** 3 / 2;
    const n = String(Math.min(i + 1, have('b'))).padStart(4, '0'), m = String(Math.min(i + 1, have('c'))).padStart(4, '0');
    const data = await p.evaluate(async ({ n, m, k, W, H, box, focus, radius, edge }) => {
      const load = async (u) => createImageBitmap(await (await fetch(u)).blob());
      const [bg, cam] = await Promise.all([load('http://f/b/' + n + '.jpg'), load('http://f/c/' + m + '.jpg')]);
      const c = new OffscreenCanvas(W, H), g = c.getContext('2d');
      const L = (a, b) => a + (b - a) * k;
      g.drawImage(bg, 0, 0, W, H);
      const [bx, by, bw, bh] = box, [fx, fy, fw] = focus;
      const dw = L(W, bw), dh = L(H, bh), dx = L(0, bx), dy = L(0, by), r = L(0, radius);
      // The part of the camera shown: all of it at first, the focus crop at the end.
      const sw = L(W, fw), sh = sw / (dw / dh);
      const sx = Math.max(0, Math.min(W - sw, L(W / 2, fx) - sw / 2)), sy = Math.max(0, Math.min(H - sh, L(H / 2, fy) - sh / 2));
      g.save(); g.beginPath(); g.roundRect(dx, dy, dw, dh, r); g.clip();
      g.drawImage(cam, sx, sy, sw, sh, dx, dy, dw, dh); g.restore();
      if (k > 0) { g.lineWidth = 2; g.strokeStyle = `rgba(255,255,255,${edge * k})`; g.beginPath(); g.roundRect(dx + 1, dy + 1, dw - 2, dh - 2, Math.max(0, r - 1)); g.stroke(); }
      const buf = new Uint8Array(await (await c.convertToBlob({ type: 'image/jpeg', quality: 0.96 })).arrayBuffer());
      let s = '';
      for (let j = 0; j < buf.length; j += 0x8000) s += String.fromCharCode(...buf.subarray(j, j + 0x8000));
      return btoa(s);
    }, { n, m, k, W, H, box, focus, radius, edge });
    fs.writeFileSync(path.join(tmp, 'o', String(i + 1).padStart(4, '0') + '.jpg'), Buffer.from(data, 'base64'));
    if (i % (fps * 2) === 0) console.log(`frame ${i}/${N}`, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
  await browser.close();
  const out = path.resolve(o.out), sheet = out.replace(/\.[a-z0-9]+$/i, '') + '-sheet.jpg';
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(tmp, 'o/%04d.jpg'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  const n = Math.ceil(dur * 6), cols = Math.min(8, n);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out, '-vf', `fps=6,scale=180:-1,tile=${cols}x${Math.ceil(n / cols)}:padding=3`, '-frames:v', '1', sheet]);
  console.log(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,nb_frames:format=duration', '-of', 'compact=p=0', out]).toString().trim().replace(/\n/g, ' '));
  console.log('->', out, sheet);
} catch (e) {
  console.error(e.message);
  await browser.close().catch(() => {});
  process.exitCode = 1;
} finally {
  if (o.keep) console.log('frames kept in', tmp); else fs.rmSync(tmp, { recursive: true, force: true });
}
