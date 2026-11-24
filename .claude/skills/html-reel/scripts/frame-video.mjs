#!/usr/bin/env node
// Frame landscape or 4:3 videos (a post's demo, the post it quotes, a
// screen recording, a YouTube clip) in a reel's shape, cut to words: the
// pieces play in order, each a span of a source over its own stretch of
// the reel's clock (so each one's speed is span ÷ seconds), in a box over a
// blurred copy of itself or a flat ground, with an optional see-through
// title layer on top (render-frames.mjs --alpha). Full-frame pieces (a
// post card, a title card rendered on its own) splice in between. The
// faceless reel's body: no camera, the demo is the picture.
//
// Usage:
//   frame-video.mjs --pieces pieces.json --out body.mp4 [--video demo.mp4] [--times T.json] [--start 0]
//                   [--size 1080x1920] [--box x,y,w,h] [--radius 28] [--backdrop blur|dim|#0b0b0d]
//                   [--overlay titles.mov] [--cover 3.6[:0.2]] [--stills 1.2,4.5] [--fps 30] [--crf 16]
//
// pieces.json, in order:
//   { "from": 3.2, "to": 7.0, "until": "comment" }   the source's seconds from → to, until a word
//   { "from": 3.2, "to": 7.0, "dur": 2.5 }           … or for 2.5 seconds of the reel
//   { "video": "quote.mp4", "from": 0, "to": 4, "until": "skill", "crop": [0.1, 0.1, 0.8, 0.8], "push": [1, 1.06] }
//   { "insert": "card.mp4", "until": "describe" }     a full-frame piece, from its start
//   { "from": 9, "to": 12, "until": "step", "box": "top" }   the screen in the top half, for a split
// "until" names a word in --times (named-times.py's T.json): the piece ends
// where that word starts. Every boundary is snapped to the frame it lands
// on, from --start (the reel's second the body begins at), so nothing
// drifts however many pieces there are. "video" defaults to --video.
// "crop" ([x, y, w, h] as shares of the source, 0–1) shows part of it, at
// the box's shape: on a 4:3 source in a 4:3 box, w = h; a 4:3 crop of a
// 16:9 video, w = 0.75 × h. A crop at another shape is filled and centred
// to fit, with a warning. "push" ([from, to]) moves in slowly inside the
// box over the piece (1 → 1.06), the box itself still. "insert" is a video
// or picture shown full frame for the piece's stretch. "box" lays out one
// piece: "center" (the box, the default), "top" or "bottom" (filling that
// half of the frame, square, for a 50/50 split with the camera in the other
// half: lay the camera in over it in Fil's editor, so a take can replace
// its placeholder), "full" (full bleed), or [x, y, w, h] in output pixels.
// A half is 1080 × 960: a crop that fills it is w = 0.844 × h of a 4:3
// source, 0.633 × h of a 16:9 one.
// "backdrop" sets one piece's ground (blur, dim or a colour) over
// --backdrop: a quoted post's pieces on their own source's ground.
//
// The box: by default as wide as the frame less 48 px each side, at the
// first video's shape, its top at 29% of the height (y 560 of 1920), with
// the titles in the band above it and the captions under it. --radius 0
// and a --backdrop colour give a square, flat frame for a technical
// source; the blurred copy and rounded corners suit an app. Look.md says
// which. Each piece is read from its own span of its file (an input
// seeked to it), so a long source isn't decoded whole; but every piece is
// one more input and filter chain (22 pieces with three inserts peaked at
// 5.9 GB): past about 15 pieces, make the body in two halves and join them
// (ffmpeg's concat demuxer, -c copy), and pre-scale a 4K 60 fps source
// once (ffmpeg -vf scale=1440:-2,fps=30).
// Speeds outside 0.5–2.2 are flagged: fast-forward or slow motion shows on
// anything that moves, not on a still page.
// --cover T[:HOLD] opens the body on its cover: its first HOLD seconds
// (0.2) show its frame at T (a second of the reel, like the words'), titles
// and all, the moment the hook looks its best, as the reel's first frame
// and the still Reels, TikTok and Shorts show for it.
// The film is BT.709, limited range, with a contact sheet of the whole of
// it beside it (<out>-sheet.jpg, a frame every half-second) and, with
// --stills, those moments as PNGs (<out>-stills/).

import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const USAGE = (() => { const l = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n'); let i = 1, u = []; while (l[i].startsWith('//')) u.push(l[i++].slice(3)); return u.join('\n'); })();
const { values: o } = parseArgs({
  options: {
    video: { type: 'string' }, pieces: { type: 'string' }, out: { type: 'string', default: 'body.mp4' }, times: { type: 'string' }, start: { type: 'string', default: '0' },
    size: { type: 'string', default: '1080x1920' }, box: { type: 'string' }, radius: { type: 'string', default: '28' }, backdrop: { type: 'string', default: 'blur' },
    overlay: { type: 'string' }, cover: { type: 'string' }, stills: { type: 'string' }, fps: { type: 'string', default: '30' }, crf: { type: 'string', default: '16' }, help: { type: 'boolean', short: 'h' },
  },
});
if (o.help || !o.pieces) { console.log(USAGE); process.exit(o.help ? 0 : 1); }

const run = (cmd, args) => execFileSync(cmd, args, { maxBuffer: 1 << 30 });
const [FW, FH] = o.size.split('x').map(Number);
const fps = +o.fps;
const even = (v) => Math.max(2, Math.round(v / 2) * 2);
const pieces = JSON.parse(fs.readFileSync(o.pieces, 'utf8'));
const T = o.times ? JSON.parse(fs.readFileSync(o.times, 'utf8')) : {};
const dims = new Map();
const sizeOf = (file) => {
  if (!dims.has(file)) {
    const s = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file]).toString()).streams[0];
    dims.set(file, [s.width, s.height]);
  }
  return dims.get(file);
};
for (const p of pieces) if (!p.insert && !(p.video || o.video)) throw new Error('a piece has no video: give --video or the piece its own "video"');

// Where each piece starts and ends on the reel, snapped to frames.
const t0 = +o.start;
let t = t0;
const spans = pieces.map((p, i) => {
  const end = p.until != null ? T[p.until] : p.dur != null ? t + p.dur : NaN;
  if (p.until != null && !Number.isFinite(T[p.until])) throw new Error(`piece ${i + 1}: no word "${p.until}" in --times`);
  if (!(end > t)) throw new Error(`piece ${i + 1}: it must end after it starts (${t.toFixed(3)} s); give "until" or "dur"`);
  const f0 = Math.round(t * fps), f1 = Math.round(end * fps);
  t = end;
  return { f0, f1, frames: f1 - f0, at: f0 / fps, dur: (f1 - f0) / fps };
});
const N = spans.reduce((n, s) => n + s.frames, 0);

// The box: the first video's shape (or --box), its top at 29% of the frame.
const first = pieces.find((p) => !p.insert);
const [sw0, sh0] = first ? sizeOf(path.resolve(first.video || o.video)) : [16, 9];
const ar0 = sw0 / sh0;
let [bx, by, bw, bh] = o.box ? o.box.split(',').map(Number) : (() => {
  const w = FW - 96, h = w / ar0;
  return [48, Math.round(FH * 0.29), w, h];
})();
[bx, by, bw, bh] = [Math.round(bx), Math.round(by), even(bw), even(bh)];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-video-'));
// A piece's box, and whether its corners are rounded (the halves and full
// bleed are square: they meet the frame's edges or the camera's half).
const boxOf = (p) => {
  if (p.box === 'top') return { x: 0, y: 0, w: FW, h: even(FH / 2), round: false };
  if (p.box === 'bottom') return { x: 0, y: FH - even(FH / 2), w: FW, h: even(FH / 2), round: false };
  if (p.box === 'full') return { x: 0, y: 0, w: FW, h: FH, round: false };
  if (Array.isArray(p.box)) return { x: Math.round(p.box[0]), y: Math.round(p.box[1]), w: even(p.box[2]), h: even(p.box[3]), round: true };
  return { x: bx, y: by, w: bw, h: bh, round: true };
};
// Rounded corners: a mask for each box size, made once.
const masks = new Map();
const maskOf = (w, h) => {
  const R = Math.min(+o.radius, w / 2, h / 2);
  if (!(R > 0)) return null;
  const key = `${w}x${h}`;
  if (masks.has(key)) return masks.get(key);
  const mask = path.join(tmp, `mask-${key}.png`);
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=black:s=${w}x${h}`, '-frames:v', '1', '-vf',
    `format=gray,geq=lum='255*lte(hypot(max(max(${R}-X\\,X-(W-1-${R}))\\,0)\\,max(max(${R}-Y\\,Y-(H-1-${R}))\\,0))\\,${R})'`, mask]);
  masks.set(key, mask);
  return mask;
};

const inputs = [], parts = [], warn = [];
const backdrop = (src, i, kind = o.backdrop) => {
  if (kind === 'blur') return `${src}scale=${FW}:${FH}:force_original_aspect_ratio=increase,crop=${FW}:${FH},boxblur=40:3,eq=brightness=-0.22:saturation=1.1[bg${i}]`;
  if (kind === 'dim') return `${src}scale=${FW}:${FH}:force_original_aspect_ratio=increase,crop=${FW}:${FH},eq=brightness=-0.45[bg${i}]`;
  return `${src}nullsink;color=c=${kind.replace('#', '0x')}:s=${FW}x${FH}:r=${fps}[bg${i}]`;
};
for (const [i, p] of pieces.entries()) {
  const s = spans[i];
  // This piece's input: the number of inputs before it.
  const k = inputs.filter((x) => x === '-i').length;
  if (p.insert) {
    // Full frame, from its start, for its stretch (a picture held).
    const file = path.resolve(p.insert);
    const still = /\.(png|jpe?g|webp)$/i.test(file);
    inputs.push(...(still ? ['-loop', '1', '-t', String(s.dur + 0.1), '-i', file] : ['-t', String(s.dur + 0.5), '-i', file]));
    parts.push(`[${k}:v]fps=${fps},scale=${FW}:${FH}:force_original_aspect_ratio=increase,crop=${FW}:${FH},setsar=1,trim=end_frame=${s.frames},setpts=N/${fps}/TB,format=rgba[v${i}]`);
    continue;
  }
  const file = path.resolve(p.video || o.video);
  const [sw, sh] = sizeOf(file);
  const span = p.to - p.from, speed = span / s.dur;
  if (!(span > 0)) throw new Error(`piece ${i + 1}: from < to`);
  if (speed < 0.5 || speed > 2.2) warn.push(`piece ${i + 1} plays at ${speed.toFixed(2)}× (fine on a still page or a deliberate slow move, not on motion)`);
  const c = p.crop || [0, 0, 1, 1];
  const B = boxOf(p), bAr = B.w / B.h;
  const cropAr = (sw * c[2]) / (sh * c[3]);
  if (Math.abs(cropAr / bAr - 1) > 0.02) warn.push(`piece ${i + 1}: its ${p.crop ? 'crop' : 'video'} is ${cropAr.toFixed(3)}:1, its box ${bAr.toFixed(3)}:1, so it's filled and centred (crop w = h × ${(bAr / (sw / sh)).toFixed(3)} keeps it whole)`);
  const mask = B.round ? maskOf(B.w, B.h) : null;
  // Its own span of its file, seeked to, so only that is decoded.
  inputs.push('-ss', String(p.from), '-t', String(span + 0.5), '-i', file);
  const [z0, z1] = p.push || [1, 1];
  const z = `(${z0}+(${z1 - z0})*min(t/${s.dur.toFixed(4)}\\,1))`;
  const cw = `iw*${c[2]}`, ch = `ih*${c[3]}`;
  const crop = z0 === 1 && z1 === 1
    ? `crop=${cw}:${ch}:iw*${c[0]}:ih*${c[1]}`
    : `crop=w='${cw}/${z}':h='${ch}/${z}':x='iw*${c[0]}+(${cw}-${cw}/${z})/2':y='ih*${c[1]}+(${ch}-${ch}/${z})/2'`;
  parts.push(`[${k}:v]setpts=(PTS-STARTPTS)/${speed.toFixed(5)},fps=${fps},trim=end_frame=${s.frames},setpts=N/${fps}/TB,${crop},scale=${B.w}:${B.h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${B.w}:${B.h},setsar=1,split[fg${i}][b${i}]`);
  parts.push(backdrop(`[b${i}]`, i, p.backdrop || o.backdrop));
  if (mask) parts.push(`[fg${i}]format=rgba[fgc${i}];movie=${mask.replace(/[:\\']/g, '\\$&')},format=gray,loop=-1:size=1,setpts=N/${fps}/TB[m${i}];[fgc${i}][m${i}]alphamerge[fga${i}]`);
  parts.push(`[bg${i}][${mask ? `fga${i}` : `fg${i}`}]overlay=x=${B.x}:y=${B.y}:shortest=1,trim=end_frame=${s.frames},format=rgba[v${i}]`);
}
const nIn = inputs.filter((x) => x === '-i').length;
parts.push(`${pieces.map((_, i) => `[v${i}]`).join('')}concat=n=${pieces.length}:v=1:a=0[v0]`);
if (o.overlay) {
  inputs.push('-i', path.resolve(o.overlay));
  parts.push(`[${nIn}:v]fps=${fps},format=rgba,scale=${FW}:${FH}[ov];[v0][ov]overlay=0:0:eof_action=pass[v1]`);
} else parts.push('[v0]null[v1]');
let body = 'v1';
if (o.cover) {
  // Its cover frame held, then the rest from there: as many frames in all.
  const [at, hold = 0.2] = o.cover.split(':').map(Number);
  const f = Math.max(0, Math.min(N - 1, Math.round((at - t0) * fps))), k = Math.max(1, Math.round(hold * fps));
  parts.push(`[v1]split[cv0][cv1];[cv0]trim=start_frame=${f}:end_frame=${f + 1},setpts=PTS-STARTPTS,loop=loop=${k - 1}:size=1:start=0,setpts=N/${fps}/TB[cvc];[cv1]trim=start_frame=${k},setpts=PTS-STARTPTS[cvr];[cvc][cvr]concat=n=2:v=1:a=0[v2]`);
  body = 'v2';
}
// BT.709, limited range, as every player expects.
parts.push(`[${body}]scale=out_range=tv:out_color_matrix=bt709,format=yuv420p[v]`);

run('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', parts.join(';'), '-map', '[v]', '-frames:v', String(N), '-r', String(fps),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', o.crf, '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-movflags', '+faststart', '-an', o.out]);
fs.rmSync(tmp, { recursive: true, force: true });

// The whole of it, a frame every half-second (frames picked exactly: fps=2
// picks them about 0.25 s late), and any stills asked for.
const stem = o.out.replace(/\.[a-z0-9]+$/i, '');
const n = Math.ceil(N / (fps / 2)), cols = 10, step = Math.max(1, Math.round(fps / 2));
run('ffmpeg', ['-v', 'error', '-y', '-i', o.out, '-vf', `select='not(mod(n\\,${step}))',scale=180:-1,tile=${cols}x${Math.ceil(n / cols)}:padding=4:color=0x222222`, '-fps_mode', 'vfr', '-frames:v', '1', stem + '-sheet.jpg']);
if (o.stills) {
  fs.mkdirSync(stem + '-stills', { recursive: true });
  for (const at of o.stills.split(',').map(Number))
    run('ffmpeg', ['-v', 'error', '-y', '-ss', String(at - t0), '-i', o.out, '-frames:v', '1', path.join(stem + '-stills', `t${at.toFixed(2).padStart(6, '0')}.png`)]);
}
console.log(JSON.stringify({ out: o.out, start: t0, seconds: +(N / fps).toFixed(3), frames: N, box: [bx, by, bw, bh], pieces: spans.map((s, i) => ({ at: +s.at.toFixed(3), dur: +s.dur.toFixed(3), ...(pieces[i].until ? { until: pieces[i].until } : {}) })), warnings: warn }, null, 1));
