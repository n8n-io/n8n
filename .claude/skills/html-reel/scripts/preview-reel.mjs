#!/usr/bin/env node
// A local preview of the reel as Fil's editor will lay it out, before
// anything is uploaded or exported: the picture, the camera (the creator's
// placeholder or their takes) at the same `set` values the editor takes
// (fit, crop, scale, x, y, corner_radius), cinematic captions word by word,
// the voice and Fil's sound effects, at −14 LUFS. Judge the layouts with
// words on them here; an export costs a window and a wait.
//
// Usage:
//   preview-reel.mjs plan.json [--out preview.mp4] [--fps 30] [--size 1080x1920]
//                    [--stills 3.5,9,17.5] [--chrome PATH] [--keep]
//
// plan.json (paths are relative to it):
//   { "picture": "picture.mp4", "duration": 31,
//     "camera": [ { "src": "cam/placeholder.png", "layout": "full", "from": 6.23, "to": 7.33 },
//                 { "src": "cam/placeholder.png", "layout": "bubble", "from": 7.33, "to": 13.5 },
//                 { "src": "take-2.mp4", "src_from": 4.2, "from": 13.5, "to": 15.7,
//                   "set": { "fit": "fit", "crop": [0, 0.15, 1, 0.65], "y": 480 } } ],
//     "voice": "voice/voice.mp3", "voice_at": 0, "picture_sound": false,
//     "sfx": [ { "id": "click", "at": 3.09, "volume": 0.15 }, { "file": "whoosh.mp3", "at": 6.2 } ],
//     "captions": { "words": "voice/words.json", "list": "captions.txt", "off": [[0, 6.2]], "from": 0.2,
//                   "font": "Inter Tight", "size": 78, "weight": 800, "ink": "#ffffff",
//                   "accent": "#efb36c", "outline": 5, "outline_color": "#08080a",
//                   "offset": 0, "max_words": 3, "max_chars": 22,
//                   "ranges": [ { "start": 6.23, "end": 7.33, "position": "bottom", "offset": -380 } ] },
//     "loudness": -14 }
//
// A camera layer's layout is one of fil-editor.md's: full (fit fill, scale
// 1), bubble (268 × 375 at the bottom right, 30 px corners), bottom (the
// split's lower half), top (the ask's upper half); its `set` overrides or
// replaces it, with the editor's meaning: the crop is shares of the source
// [x0, y0, x1, y1], fit "fit" fits the cropped box in the frame and "fill"
// covers it, scale multiplies that, x and y move its centre from the
// frame's middle in frame pixels. Keyframes aren't drawn: a shrink shows its
// end. Fil's soft shadow and edge aren't drawn either.
// Captions come from Fil's list (get_video with captions "list", saved as
// text: its lines and their times) or from a words file ([[word, start,
// end], …]) grouped as Fil groups them (up to max_words words and max_chars
// letters a line, a new line after . , ? ! or a pause over 0.4 s). With
// both, the list gives the lines and the words light up on their own
// times; with the list alone, they're spread through the line by letters.
// Each word appears as it's said, the spoken one in the accent, and the
// line's centre sits `offset` px below the frame's middle (or `position`
// "bottom" or "top", as Fil lays one line out), as in Fil. `ranges` are
// Fil's caption ranges (edit_video {"op":"captions","ranges":[…]}): from
// start to end the line sits at that position and offset instead, so a
// full-frame face has it under the chin while a split keeps it on the seam.
// `off` ranges hide the captions (under the hook's or the ask's big type);
// `from` holds them back until the cover's first frames are over (0.2).
// Sound effects by id come from fil.design/video-kit/3/sfx/<id>.mp3.
// Writes the MP4 (libx264 -preset veryfast -crf 18, BT.709, AAC), a contact sheet at exact
// half-seconds (<out>-sheet.jpg) and any --stills as full-size JPEGs.
// Needs ffmpeg, and playwright (or playwright-core) for the captions;
// Chrome from --chrome, CHROME_PATH, or playwright's own.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The header above, for --help.
const USAGE = (() => { const l = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n'); let i = 1, u = []; while (l[i].startsWith('//')) u.push(l[i++].slice(3)); return u.join('\n'); })();
const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: 'preview.mp4' }, fps: { type: 'string', default: '30' }, size: { type: 'string', default: '1080x1920' },
    stills: { type: 'string' }, chrome: { type: 'string' }, keep: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  },
});
if (o.help || positionals.length !== 1) { console.log(USAGE); process.exit(o.help ? 0 : 1); }

const planPath = path.resolve(positionals[0]);
const P = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const at = (f) => path.resolve(path.dirname(planPath), f);
const [FW, FH] = o.size.split('x').map(Number);
const FPS = Number(o.fps);
const r3 = (x) => Math.round(x * 1000) / 1000;
const even = (x) => Math.max(2, 2 * Math.round(x / 2));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-reel-'));
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
const probe = (f) => {
  const s = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,codec_type:format=duration', '-of', 'json', f]));
  const v = s.streams.find((x) => x.codec_type === 'video');
  return { w: v?.width, h: v?.height, dur: Number(s.format.duration) || 0, audio: s.streams.some((x) => x.codec_type === 'audio') };
};

const picture = at(P.picture);
const pic = probe(picture);
const DUR = Number(P.duration) || pic.dur;

// fil-editor.md's camera layouts, as the editor's set values.
const LAYOUTS = {
  full: { fit: 'fill', scale: 1 },
  bubble: { fit: 'fit', crop: [0.18, 0.12, 0.815, 0.62], scale: 0.248, x: 315, y: 300, corner_radius: 30 },
  bottom: { fit: 'fit', crop: [0, 0.15, 1, 0.65], scale: 1, y: 480 },
  top: { fit: 'fit', crop: [0, 0.15, 1, 0.65], scale: 1, y: -480 },
};

/** Where a picture lands in the frame under the editor's set values. */
function boxOf(src, set) {
  const [x0, y0, x1, y1] = set.crop || [0, 0, 1, 1];
  const cw = (x1 - x0) * src.w, ch = (y1 - y0) * src.h;
  const s0 = (set.fit === 'fill' ? Math.max : Math.min)(FW / cw, FH / ch) * (set.scale ?? 1);
  const w = even(cw * s0), h = even(ch * s0);
  const cx = FW / 2 + (set.x || 0), cy = FH / 2 + (set.y || 0);
  return { crop: { x: Math.round(x0 * src.w), y: Math.round(y0 * src.h), w: Math.round(cw), h: Math.round(ch) }, w, h, left: Math.round(cx - w / 2), top: Math.round(cy - h / 2), r: set.corner_radius || 0 };
}

/** A rounded-box mask, drawn at 4× and scaled down so its corners are smooth. */
function maskOf(w, h, r, file) {
  const W = w * 4, H = h * 4, R = r * 4;
  const lum = `255*lte(pow(max(0\\,max(${R}-X\\,X-${W - 1 - R}))\\,2)+pow(max(0\\,max(${R}-Y\\,Y-${H - 1 - R}))\\,2)\\,${R * R})`;
  ff(['-f', 'lavfi', '-i', `color=black:s=${W}x${H}`, '-frames:v', '1', '-vf', `format=gray,geq=lum='${lum}',scale=${w}:${h}:flags=area`, file]);
  return file;
}

// ---- Captions: each state (a line, so many words said) as a see-through PNG, played by an ffconcat list.
function captionLines(C) {
  const words = C.words ? JSON.parse(fs.readFileSync(at(C.words), 'utf8')).map(([w, s, e]) => ({ w: String(w), s, e: e ?? s + 0.3 })) : null;
  const maxW = C.max_words ?? 3, maxC = C.max_chars ?? 22;
  let lines = [];
  if (C.list) {
    const CUE = /^\s*-\s+(\S+)\s+·\s+(-?[\d.]+)\s*[–-]\s*(-?[\d.]+)\s*s\s+·\s+[“"](.*)[”"]\s*$/;
    for (const l of fs.readFileSync(at(C.list), 'utf8').split('\n')) {
      const m = l.match(CUE);
      if (!m) continue;
      const s = Number(m[2]), e = Number(m[3]), text = m[4].split(/\s+/).filter(Boolean);
      let ws = words ? words.filter((x) => x.s >= s - 0.05 && x.s < e - 0.02) : [];
      if (ws.length !== text.length) {
        // No word times for this line: spread it by letters.
        const total = text.reduce((a, w) => a + w.length, 0) || 1;
        let t = s;
        ws = text.map((w) => { const d = (e - s) * w.length / total, x = { s: t, e: t + d }; t += d; return x; });
      }
      lines.push({ s, e, words: text.map((w, i) => ({ w, s: ws[i].s })) });
    }
  } else if (words) {
    let cur = null;
    words.forEach((x, i) => {
      const prev = words[i - 1];
      const brk = !cur || cur.words.length >= maxW || cur.words.map((y) => y.w).concat(x.w).join(' ').length > maxC
        || /[.,?!;:]$/.test(prev?.w || '') || x.s - (prev?.e ?? x.s) > 0.4;
      if (brk) { cur = { s: x.s, e: x.e, words: [] }; lines.push(cur); }
      cur.words.push({ w: x.w, s: x.s });
      cur.e = x.e;
    });
    // A line stays up until the next one, unless a pause comes first.
    lines.forEach((l, i) => { const n = lines[i + 1]; l.e = n ? Math.min(n.s, l.e + 0.5) : l.e + 0.5; });
  }
  const off = C.off || [];
  // None over the cover: a line starts once its frames are over (`from`).
  for (const l of lines) l.s = Math.max(l.s, C.from || 0);
  return lines.filter((l) => l.e - l.s > 0.05 && !off.some(([a, b]) => l.s >= a - 0.01 && l.s < b));
}

async function chromium() {
  for (const n of ['playwright', 'playwright-core']) try { const m = await import(n); return m.chromium || m.default.chromium; } catch {}
  const req = createRequire(path.join(process.cwd(), 'x.js'));
  for (const n of ['playwright', 'playwright-core']) try { const m = await import(pathToFileURL(req.resolve(n)).href); return m.chromium || m.default.chromium; } catch {}
  throw new Error('playwright not found: npm i playwright-core here or beside this script');
}

async function captionLayer(C) {
  const lines = captionLines(C);
  if (!lines.length) return null;
  const font = C.font || 'Inter Tight', size = C.size ?? 78, weight = C.weight ?? 800, outline = C.outline ?? 5;
  // The line's centre at `t`, as Fil's captions.js cueLayout has one line:
  // 7.5% of the frame from its top or foot (plus the line's half and its
  // padding), or the middle; then the offset. A range's position left out
  // is the look's, its offset 0 (or the look's, with no position either).
  const lh = size * 1.28, m = FH * 0.075;
  const cyOf = (pos, y) => (pos === 'top' ? m + lh / 2 + size * 0.18 : pos === 'bottom' ? FH - m - lh / 2 - size * 0.18 : FH / 2) + (y || 0);
  const ranges = C.ranges || [];
  const edges = [...new Set(ranges.flatMap((r) => [r.start, r.end]))];
  const cyAt = (t) => {
    const r = ranges.findLast((x) => t >= x.start - 1e-6 && t < x.end - 1e-6);
    return r ? cyOf(r.position ?? C.position, r.offset ?? (r.position == null ? C.offset : 0)) : cyOf(C.position, C.offset);
  };
  const fam = encodeURIComponent(font).replace(/%20/g, '+');
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=${fam}:wght@${weight}&display=block" rel="stylesheet">
<style>html,body{margin:0;background:transparent}
#f{position:relative;width:${FW}px;height:${FH}px;overflow:hidden}
#cap{position:absolute;left:0;right:0;top:${cyAt(0)}px;transform:translateY(-50%);text-align:center;white-space:nowrap;
 font-family:'${font}',sans-serif;font-weight:${weight};font-size:${size}px;line-height:1.28;color:${C.ink || '#ffffff'};letter-spacing:-0.01em;
 -webkit-text-stroke:${outline * 2}px ${C.outline_color || '#08080a'};paint-order:stroke fill}
#cap span{margin:0 0.12em}#cap .now{color:${C.accent || '#efb36c'}}</style></head>
<body><div id="f"><div id="cap"></div></div></body></html>`;
  const browser = await (await chromium()).launch({ executablePath: o.chrome || process.env.CHROME_PATH || undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: FW, height: FH } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(async (f) => { await document.fonts.load(`${f.weight} ${f.size}px '${f.font}'`); await document.fonts.ready; }, { font, size, weight });
  const dir = path.join(tmp, 'cap');
  fs.mkdirSync(dir);
  const blank = path.join(dir, 'blank.png');
  await page.evaluate(() => { document.getElementById('cap').innerHTML = ''; });
  await page.screenshot({ path: blank, omitBackground: true });
  // [file, start] in order; each lasts until the next.
  const seq = [[blank, 0]];
  let n = 0;
  for (const l of lines) {
    for (let i = 0; i < l.words.length; i++) {
      const s = Math.max(l.s, l.words[i].s), e = i + 1 < l.words.length ? Math.max(l.s, l.words[i + 1].s) : l.e;
      if (e - s < 0.5 / FPS) continue;
      // A range starting or ending while the word shows moves the line there.
      const cuts = [s, ...edges.filter((x) => x > s + 1e-6 && x < e - 1e-6).sort((a, b) => a - b), e];
      for (let k = 0; k + 1 < cuts.length; k++) {
        if (k && cuts[k + 1] - cuts[k] < 0.5 / FPS) continue;
        const file = path.join(dir, `c${String(n++).padStart(4, '0')}.png`);
        await page.evaluate(({ ws, cur, top }) => {
          const esc = (x) => x.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
          const el = document.getElementById('cap');
          el.style.top = top + 'px';
          el.innerHTML = ws.slice(0, cur + 1).map((w, j) => `<span class="${j === cur ? 'now' : ''}">${esc(w)}</span>`).join('');
        }, { ws: l.words.map((w) => w.w), cur: i, top: cyAt(cuts[k]) });
        await page.screenshot({ path: file, omitBackground: true });
        seq.push([file, cuts[k]]);
      }
    }
    seq.push([blank, l.e]);
  }
  await browser.close();
  const list = ['ffconcat version 1.0'];
  seq.forEach(([f, s], i) => {
    const e = i + 1 < seq.length ? seq[i + 1][1] : DUR;
    if (e - s > 0) list.push(`file '${f}'`, `duration ${r3(e - s)}`);
  });
  list.push(`file '${blank}'`);
  const file = path.join(tmp, 'captions.ffconcat');
  fs.writeFileSync(file, list.join('\n') + '\n');
  console.log(`${lines.length} caption lines, ${n} states`);
  return file;
}

async function sfxFile(x, i) {
  if (x.file) return at(x.file);
  const file = path.join(tmp, `sfx-${i}-${x.id}.mp3`);
  const res = await fetch(`https://fil.design/video-kit/3/sfx/${encodeURIComponent(x.id)}.mp3`);
  if (!res.ok) throw new Error(`sound effect ${x.id}: ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

// ---- One ffmpeg pass: the picture, the camera layers, the captions; the voice and the effects mixed.
const inputs = ['-i', picture];
const vf = [`[0:v]scale=${FW}:${FH}:force_original_aspect_ratio=increase,crop=${FW}:${FH},setsar=1,fps=${FPS},format=yuv420p[v0]`];
let last = 'v0', k = 1;
(P.camera || []).forEach((c, i) => {
  const src = at(c.src), info = probe(src);
  const set = { ...(LAYOUTS[c.layout] || {}), ...(c.set || {}) };
  const b = boxOf(info, set);
  // A picture is cropped, scaled and masked once, then repeated (a looped input would decode it every frame).
  const still = !info.dur || /\.(png|jpe?g|webp)$/i.test(src);
  if (still) inputs.push('-i', src);
  else inputs.push('-ss', String(c.src_from || 0), '-t', String(r3(c.to - c.from)), '-i', src);
  const ci = k++;
  const repeat = (d) => `loop=loop=-1:size=1,setpts=N/(${FPS}*TB),trim=duration=${r3(d + 2 / FPS)}`;
  let chain = `[${ci}:v]crop=${b.crop.w}:${b.crop.h}:${b.crop.x}:${b.crop.y},scale=${b.w}:${b.h},setsar=1,format=rgba`;
  if (b.r) {
    inputs.push('-i', maskOf(b.w, b.h, b.r, path.join(tmp, `mask-${i}.png`)));
    const mi = k++;
    vf.push(`${chain}[c${i}]`, `[${mi}:v]format=gray${still ? '' : ',' + repeat(c.to - c.from)}[m${i}]`, `[c${i}][m${i}]alphamerge[ca${i}]`);
    chain = `[ca${i}]null`;
  }
  chain += still ? ',' + repeat(c.to) : `,setpts=PTS-STARTPTS+${r3(c.from)}/TB`;
  vf.push(`${chain}[cr${i}]`);
  chain = `[cr${i}]`;
  vf.push(`[${last}]${chain}overlay=${b.left}:${b.top}:enable='gte(t,${r3(c.from)})*lt(t,${r3(c.to)})':eof_action=pass[v${i + 1}]`);
  last = `v${i + 1}`;
  console.log(`camera ${i + 1}: ${c.layout || 'set'} ${b.w}×${b.h} at ${b.left},${b.top}${b.r ? `, ${b.r} px corners` : ''}, ${c.from}–${c.to} s`);
});
const capFile = P.captions ? await captionLayer(P.captions) : null;
if (capFile) {
  inputs.push('-f', 'concat', '-safe', '0', '-i', capFile);
  vf.push(`[${k++}:v]format=rgba[cap]`, `[${last}][cap]overlay=0:0:eof_action=pass,format=yuv420p[v]`);
} else vf.push(`[${last}]null[v]`);

const sounds = [];
if (P.picture_sound && pic.audio) sounds.push({ i: 0, delay: 0, volume: 1 });
if (P.voice) { inputs.push('-i', at(P.voice)); sounds.push({ i: k++, delay: P.voice_at || 0, volume: P.voice_volume ?? 1 }); }
for (const [j, x] of (P.sfx || []).entries()) { inputs.push('-i', await sfxFile(x, j)); sounds.push({ i: k++, delay: x.at, volume: x.volume ?? 0.15 }); }
const af = sounds.map((s, j) => `[${s.i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${s.volume},adelay=${Math.round(s.delay * 1000)}:all=1[a${j}]`);
if (sounds.length) af.push(`${sounds.map((_, j) => `[a${j}]`).join('')}amix=inputs=${sounds.length}:normalize=0:duration=longest,apad=whole_dur=${DUR},atrim=end=${DUR},loudnorm=I=${P.loudness ?? -14}:TP=-1.5:LRA=11,aresample=48000[au]`);

const out = path.resolve(o.out);
ff([...inputs, '-filter_complex', [...vf, ...af].join(';'), '-map', '[v]', ...(sounds.length ? ['-map', '[au]', '-c:a', 'aac', '-b:a', '192k'] : []),
  '-t', String(DUR), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart', out]);

const stem = out.replace(/\.[^.]+$/, '');
const step = Math.round(FPS / 2), n = Math.ceil(DUR * 2), cols = 10;
ff(['-i', out, '-vf', `select='not(mod(n\\,${step}))',scale=180:-1,tile=${cols}x${Math.ceil(n / cols)}:padding=4:color=0x222222`, '-fps_mode', 'vfr', '-frames:v', '1', stem + '-sheet.jpg']);
for (const t of (o.stills || '').split(',').filter(Boolean)) ff(['-ss', t, '-i', out, '-frames:v', '1', '-q:v', '3', `${stem}-${Number(t).toFixed(1)}.jpg`]);
if (!o.keep) fs.rmSync(tmp, { recursive: true, force: true });
else console.log('kept', tmp);
console.log(`${DUR} s -> ${out}, ${stem}-sheet.jpg`);
