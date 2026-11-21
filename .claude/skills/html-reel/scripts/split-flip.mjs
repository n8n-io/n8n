#!/usr/bin/env node
// The 50/50 split: the camera's middle band in the bottom half over a base
// clip (the scenes, drawn for the top half), zooming in from --zoom to full
// size and fading in over --zoom-dur seconds, then, with --flip F0:F1,
// sliding up to the top half between F0 and F1 on an eased (cubic in-out)
// move, so the scenes below can take the bottom half.
//
// Usage:
//   split-flip.mjs --base base.mp4 --cam cam.mp4 --out out.mp4 [--cam-from S] [--flip F0:F1]
//                  [--crop-y Y] [--zoom 0.86] [--zoom-dur 0.35] [--dur S] [--fps 30]
//                  [--size 1080x1920] [--crf 16]
//
// Times are seconds of the output, which starts at the base's first frame;
// --cam-from is where in the camera clip it starts (the camera's time on
// the joined take). The camera is scaled to the output's width and a band
// half the output's height is cut from it at --crop-y (default its middle;
// the run used 380 of 1920, a little higher, for the face). --dur defaults
// to the base's length. The output is video only (the edit carries the
// voice), libx264 -preset slow, yuv420p, +faststart, plus a contact sheet
// (<out>-sheet.jpg, two frames a second). Needs ffmpeg and ffprobe.
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

// The header above, for --help.
const USAGE = (() => { const l = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n'); let i = 1, u = []; while (l[i].startsWith('//')) u.push(l[i++].slice(3)); return u.join('\n'); })();
const { values: o } = parseArgs({
  options: {
    base: { type: 'string' }, cam: { type: 'string' }, out: { type: 'string' }, 'cam-from': { type: 'string', default: '0' }, flip: { type: 'string' },
    'crop-y': { type: 'string' }, zoom: { type: 'string', default: '0.86' }, 'zoom-dur': { type: 'string', default: '0.35' }, dur: { type: 'string' },
    fps: { type: 'string', default: '30' }, size: { type: 'string', default: '1080x1920' }, crf: { type: 'string', default: '16' }, help: { type: 'boolean', short: 'h' },
  },
});
if (o.help || !o.base || !o.cam || !o.out) { console.log(USAGE); process.exit(o.help ? 0 : 1); }

const probe = (f, e) => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', e, '-of', 'csv=p=0', f]).toString().trim();
const [W, H] = o.size.toLowerCase().split('x').map(Number), half = H / 2, fps = +o.fps;
const dur = o.dur ? +o.dur : +probe(o.base, 'format=duration');
const N = Math.round(dur * fps), cf = +o['cam-from'], z = +o.zoom, zd = +o['zoom-dur'];
const [cw, ch] = probe(o.cam, 'stream=width,height').split(',').map(Number);
const camH = Math.round((ch * W) / cw / 2) * 2;
const cropY = o['crop-y'] != null ? +o['crop-y'] : Math.round((camH - half) / 2);
// Scale from z to 1 over zd seconds (even sizes), centred in its half.
const grow = `(${z}+${1 - z}*min(t/${zd}\\,1))`;
let y = `${half}+(${half}-h)/2`;
if (o.flip) {
  const [F0, F1] = o.flip.split(':').map(Number);
  const k = `((t-${F0})/(${F1 - F0}))`;
  const ease = `if(lt(${k}\\,0.5)\\,4*pow(${k}\\,3)\\,1-pow(-2*${k}+2\\,3)/2)`;
  y = `if(lt(t\\,${F0})\\,${y}\\,if(lt(t\\,${F1})\\,${half}*(1-${ease})\\,0))`;
}
const graph = [
  `[0:v]setpts=PTS-STARTPTS,fps=${fps},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=yuv420p,trim=end_frame=${N}[base]`,
  `[1:v]trim=start=${cf}:end=${cf + dur},setpts=PTS-STARTPTS,fps=${fps},scale=${W}:-2,crop=${W}:${half}:0:${cropY},format=rgba,` +
    `scale=w='trunc(${W}*${grow}/2)*2':h='trunc(${half}*${grow}/2)*2':eval=frame,fade=t=in:st=0:d=${zd}:alpha=1[cam]`,
  `[base][cam]overlay=x='(W-w)/2':y='${y}':eval=frame:eof_action=pass,format=yuv420p[v]`,
].join(';');
const out = path.resolve(o.out), sheet = out.replace(/\.[a-z0-9]+$/i, '') + '-sheet.jpg';
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', o.base, '-i', o.cam, '-filter_complex', graph, '-map', '[v]', '-frames:v', String(N),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', o.crf, '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out]);
const n = Math.ceil(dur * 2), cols = Math.min(11, n);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out, '-vf', `fps=2,scale=180:-1,tile=${cols}x${Math.ceil(n / cols)}:padding=3`, '-frames:v', '1', sheet]);
console.log(`camera band y ${cropY}–${cropY + half} of ${camH}` + (o.flip ? `, flip ${o.flip}` : ''));
console.log(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,nb_frames:format=duration', '-of', 'compact=p=0', out]).toString().trim().replace(/\n/g, ' '));
console.log('->', out, sheet);
