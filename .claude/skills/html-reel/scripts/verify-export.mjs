#!/usr/bin/env node
// Check a finished export before it goes anywhere: its size, frame rate,
// length and streams (ffprobe), its integrated loudness and true peak
// (ffmpeg's ebur128, against --target LUFS, -14 for Instagram and the
// rest), and a contact sheet of about 30 frames. With --raw voice.wav (the
// joined take's voice, before cleaning) it also compares the high band,
// above 7 kHz, where room hiss lives and little of the voice does: the
// export's against the raw voice's over the same stretch, as its level and
// as its share of the whole (high band minus full band), which a loudness
// change doesn't move. A cleaned voice (Studio Sound) shows as a share
// several dB under the raw one's; in the run it was -9.1 dB. (Music under
// the voice adds some high band back, so a smaller drop can still be a
// cleaned voice; a drop near 0 is the raw one.)
//
// Usage:
//   verify-export.mjs export.mp4 [--target=-14] [--sheet sheet.jpg]
//                     [--raw voice.wav] [--raw-at 0] [--from S] [--to S]
//
// --raw-at is where the raw voice starts on the export's clock (0 when the
// export is cut on the joined take's clock); --from and --to limit the
// compared stretch, in export seconds (default all they share). Exits 1
// when the loudness is more than 1 LU off the target or the true peak is
// over -1 dBTP. Needs ffmpeg and ffprobe on PATH.
import { execFileSync, spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import fs from 'node:fs';

// The header above, for --help.
const USAGE = (() => { const l = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n'); let i = 1, u = []; while (l[i].startsWith('//')) u.push(l[i++].slice(3)); return u.join('\n'); })();
// A negative value after its flag ("--target -14") reads as a flag of its
// own to parseArgs: join the two first.
const argv = process.argv.slice(2).reduce((out, a, i, all) => (/^-\d/.test(a) && /^--[a-z-]+$/.test(all[i - 1] || '') ? (out[out.length - 1] += '=' + a, out) : (out.push(a), out)), []);
const { values: o, positionals } = parseArgs({
  args: argv,
  allowPositionals: true,
  options: { target: { type: 'string', default: '-14' }, sheet: { type: 'string' }, raw: { type: 'string' }, 'raw-at': { type: 'string', default: '0' },
    from: { type: 'string' }, to: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
});
if (o.help || positionals.length !== 1) { console.log(USAGE); process.exit(o.help ? 0 : 1); }
const file = positionals[0], target = +o.target;
const run = (cmd, args) => execFileSync(cmd, args, { maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] });

// Streams.
const pr = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames,sample_rate,channels,pix_fmt,duration:format=duration,size,bit_rate', '-of', 'json', file]).toString());
const dur = +pr.format.duration;
const fr = (s) => { const [a, b] = s.split('/').map(Number); return b ? a / b : a; };
console.log(`${file}: ${dur.toFixed(3)} s, ${(pr.format.size / 1e6).toFixed(1)} MB, ${Math.round(pr.format.bit_rate / 1000)} kb/s`);
for (const s of pr.streams) {
  if (s.codec_type === 'video') console.log(`  video ${s.codec_name} ${s.width}×${s.height} ${s.pix_fmt}, ${+fr(s.avg_frame_rate).toFixed(3)} fps (r ${s.r_frame_rate}), ${s.nb_frames} frames, ${(+s.duration).toFixed(3)} s`);
  else if (s.codec_type === 'audio') console.log(`  audio ${s.codec_name} ${s.sample_rate} Hz ${s.channels} ch, ${(+s.duration).toFixed(3)} s`);
  else console.log(`  ${s.codec_type} ${s.codec_name || ''}`);
}
const v = pr.streams.find((s) => s.codec_type === 'video'), hasAudio = pr.streams.some((s) => s.codec_type === 'audio');
let bad = false;

// Loudness.
if (hasAudio) {
  // ebur128 prints its summary on stderr.
  const err = spawnSync('ffmpeg', ['-nostats', '-hide_banner', '-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr;
  const sum = err.slice(err.lastIndexOf('Summary:'));
  const I = +(/I:\s+(-?[\d.]+) LUFS/.exec(sum) || [])[1], LRA = +(/LRA:\s+(-?[\d.]+) LU/.exec(sum) || [])[1];
  const TP = +(/True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS/.exec(sum) || [])[1];
  const off = Math.abs(I - target) > 1, hot = TP > -1;
  bad ||= off || hot;
  console.log(`loudness ${I.toFixed(1)} LUFS (target ${target}${off ? ', OFF' : ', ok'}), true peak ${TP.toFixed(1)} dBTP${hot ? ' (over -1)' : ''}, range ${LRA.toFixed(1)} LU`);
} else console.log('no sound');

// Contact sheet.
if (v) {
  const sheet = o.sheet || file.replace(/\.[a-z0-9]+$/i, '') + '-sheet.jpg';
  const cols = 10, rows = 3, w = v.width >= v.height ? 192 : 120;
  run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', `fps=${(cols * rows) / dur},scale=${w}:-2,tile=${cols}x${rows}:padding=3:color=0x222222`, '-frames:v', '1', sheet]);
  console.log('sheet', sheet);
}

// The high band, export vs raw voice.
if (o.raw) {
  const at = +o['raw-at'];
  const rawDur = +run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', o.raw]).toString();
  const a = o.from != null ? +o.from : Math.max(0, at), b = o.to != null ? +o.to : Math.min(dur, at + rawDur);
  const pcm = (f, start, hp) => {
    const buf = run('ffmpeg', ['-v', 'error', '-ss', String(start), '-t', String(b - a), '-i', f, '-map', '0:a:0', '-ac', '1', '-ar', '48000',
      ...(hp ? ['-af', 'highpass=f=7000,highpass=f=7000,highpass=f=7000'] : []), '-f', 'f32le', '-']);
    return new Float32Array(buf.buffer, buf.byteOffset, buf.length >> 2);
  };
  const db = (x) => 10 * Math.log10(Math.max(x, 1e-20));
  const ms = (x) => x.reduce((s, y) => s + y * y, 0) / x.length;
  const measure = (f, start) => {
    const full = db(ms(pcm(f, start, false))), level = db(ms(pcm(f, start, true)));
    return { full, level, share: level - full };
  };
  const e = measure(file, a), r = measure(o.raw, a - at);
  const f1 = (x) => x.toFixed(1).padStart(7);
  console.log(`high band (> 7 kHz), ${a.toFixed(2)}–${b.toFixed(2)} s of the export (raw from ${(a - at).toFixed(2)} s):`);
  console.log('              full    high   high − full (dB RMS)');
  console.log(`  export   ${f1(e.full)} ${f1(e.level)} ${f1(e.share)}`);
  console.log(`  raw      ${f1(r.full)} ${f1(r.level)} ${f1(r.share)}`);
  console.log(`  the export's high band is ${(e.share - r.share).toFixed(1)} dB relative to the raw voice's`);
  console.log(e.share - r.share < -3 ? '  well under the raw voice\'s: the cleaned voice is in it'
    : '  the export\'s high band is close to the raw voice\'s: check the voice was cleaned (Studio Sound) before export');
}
process.exit(bad ? 1 : 0);
