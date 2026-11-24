#!/usr/bin/env python3
"""Tighten a voiceover's pauses, keeping its words where they are relative
to each other: every silence longer than --longer gets its middle cut out,
--keep seconds of it left (half each side), with 10 ms fades at the joins,
and the words file is moved onto the new clock. For a text-to-speech voice
that pauses longer between sentences than the reel can spare (a cloned
voice read 71 words in 31.8 s, 2.2 words a second; tightened, 29.5 s),
without generating it again.

Silences are measured from the sound (ffmpeg silencedetect at --db), never
guessed from the word times.

Usage:
  tighten-voice.py voice.mp3 words.json --out voice-tight.wav --words-out words-tight.json
                   [--longer 0.3] [--keep 0.25] [--db -40]
words.json: [[word, start, end], …] (vo-words.py or fil-words.py write it).
"""
import argparse, json, re, subprocess, sys

ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
ap.add_argument('voice')
ap.add_argument('words')
ap.add_argument('--out', required=True)
ap.add_argument('--words-out', required=True)
ap.add_argument('--longer', type=float, default=0.3, help='only silences longer than this (s)')
ap.add_argument('--keep', type=float, default=0.25, help='seconds of each kept, half either side')
ap.add_argument('--db', type=float, default=-40, help='silence below this level (dB)')
a = ap.parse_args()

log = subprocess.run(['ffmpeg', '-v', 'info', '-i', a.voice, '-af', f'silencedetect=n={a.db}dB:d={a.longer}', '-f', 'null', '-'],
                     capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]
ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a.voice]))
words = json.load(open(a.words))
first, last = min(w[1] for w in words), max(w[2] for w in words)
# Only the pauses between words: the lead-in and the tail are left alone.
cuts = []
for s, e in zip(starts, ends):
    if s > first and e < last and e - s > a.keep:
        cuts.append((s + a.keep / 2, e - a.keep / 2))
if not cuts:
    print('nothing to tighten: no pause longer than', a.longer, 's')

keep, t = [], 0.0
for s, e in cuts:
    keep.append((t, s))
    t = e
keep.append((t, dur))
f = 0.01
parts = [f'[0:a]atrim={s:.4f}:{e:.4f},asetpts=PTS-STARTPTS,afade=t=in:d={f},afade=t=out:st={max(0, e - s - f):.4f}:d={f}[s{i}]'
         for i, (s, e) in enumerate(keep)]
parts.append(''.join(f'[s{i}]' for i in range(len(keep))) + f'concat=n={len(keep)}:v=0:a=1[a]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.voice, '-filter_complex', ';'.join(parts), '-map', '[a]', '-ar', '48000', a.out], check=True)


def remap(x):
    gone = 0.0
    for s, e in cuts:
        if x >= e:
            gone += e - s
        elif x > s:
            return round(s - gone, 3)
    return round(x - gone, 3)


new = [[w[0], remap(w[1]), remap(w[2])] for w in words]
json.dump(new, open(a.words_out, 'w'))
removed = sum(e - s for s, e in cuts)
n = len(new)
print(json.dumps({'pauses_cut': len(cuts), 'removed': round(removed, 3), 'length': round(dur - removed, 3),
                  'words': n, 'words_per_second': round(n / max(0.1, new[-1][2] - new[0][1]), 2)}))
