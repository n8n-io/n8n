#!/usr/bin/env node
// Trim and crop a DreamCut window recording to the page: record-window.mjs
// shows a full-viewport magenta flash (#ff00ff, 160 ms) just before the
// choreography starts, so the flash marks both where the page is in the
// window (its box) and when the take begins (just after it). This finds
// the flash in the first --search seconds, crops every frame to its box,
// cuts from two 60 fps frames after it for --dur seconds, scales to
// --width (the height follows the box) and encodes at --fps.
//
// Usage:
//   flash-crop.mjs raw.mov out.mp4 --dur S [--width 1080] [--fps 30] [--search 6] [--crf 15]
//
// A flash frame is one where at least half as many pixels are magenta
// (red and blue over 200, green under 80) as in the most magenta frame,
// on a 96 px wide copy at 60 fps. Prints the flash's frames, the start,
// the crop and the output's size. Sound is dropped. Needs ffmpeg and
// ffprobe on PATH.
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import fs from 'node:fs';

// The header above, for --help.
const USAGE = (() => { const l = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n'); let i = 1, u = []; while (l[i].startsWith('//')) u.push(l[i++].slice(3)); return u.join('\n'); })();
const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: { dur: { type: 'string' }, width: { type: 'string', default: '1080' }, fps: { type: 'string', default: '30' },
    search: { type: 'string', default: '6' }, crf: { type: 'string', default: '15' }, help: { type: 'boolean', short: 'h' } },
});
if (o.help || positionals.length !== 2 || !o.dur) { console.log(USAGE); process.exit(o.help ? 0 : 1); }
const [raw, out] = positionals, dur = +o.dur, width = +o.width;
const magenta = (r, g, b) => r > 200 && g < 80 && b > 200;

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', raw]).toString()).streams[0];
const W = probe.width, H = probe.height, sw = 96, sh = Math.max(2, Math.round((H * sw) / W));
const small = execFileSync('ffmpeg', ['-v', 'error', '-t', o.search, '-i', raw, '-vf', `fps=60,scale=${sw}:${sh}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 });
const fsz = sw * sh * 3, n = Math.floor(small.length / fsz), count = [];
for (let f = 0; f < n; f++) {
  let c = 0;
  for (let i = f * fsz; i < (f + 1) * fsz; i += 3) if (magenta(small[i], small[i + 1], small[i + 2])) c++;
  count.push(c);
}
const most = Math.max(0, ...count);
if (most < sw * sh * 0.05) { console.error(`no magenta flash in the first ${o.search} s of ${raw}`); process.exit(1); }
const first = count.findIndex((c) => c >= most / 2), last = count.findLastIndex((c) => c >= most / 2);
const big = execFileSync('ffmpeg', ['-v', 'error', '-ss', String((first + last) / 2 / 60), '-i', raw, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 });
let x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 3;
  if (magenta(big[i], big[i + 1], big[i + 2])) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}
if (x1 < 0) { console.error('the flash frame has no magenta at full size'); process.exit(1); }
const cw = x1 - x0 + 1, ch = y1 - y0 + 1, start = (last + 2) / 60, outH = Math.round((width * ch) / cw / 2) * 2;
console.log(JSON.stringify({ flash: [first, last], start: +start.toFixed(3), crop: [cw, ch, x0, y0], out: [width, outH] }));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(start), '-i', raw, '-t', String(dur), '-vf', `crop=${cw}:${ch}:${x0}:${y0},scale=${width}:${outH}:flags=lanczos,fps=${o.fps}`,
  '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', o.crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
console.log(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,nb_frames:format=duration', '-of', 'compact=p=0', out]).toString().trim().replace(/\n/g, ' '));
