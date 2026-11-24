#!/usr/bin/env python3
"""Name every word of a voiceover by itself, so scenes and pieces are timed
to words, not to seconds: T.zoom, T.htmlEnd, "until": "comment". A word's
name is its letters and digits in lower case ("open-sourced" → opensourced,
"5.0" → 50); a word said again gets a number (skill, skill2, skill3); each
also has its end (skillEnd). `end` is the voice's last word's end.

Writes T.json, and with --js a script for the scenes (window.T = {…}).
frame-video.mjs takes T.json with --times, so a piece can say where it
ends by a word ("until": "comment") instead of its seconds.

Usage:
  named-times.py words.json --out T.json [--js scenes/words.js] [--offset 0]
--offset adds seconds to every time (the voice starts that late on the reel).
"""
import argparse, json, re

ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
ap.add_argument('words')
ap.add_argument('--out', required=True)
ap.add_argument('--js')
ap.add_argument('--offset', type=float, default=0)
a = ap.parse_args()

words = json.load(open(a.words))
T, seen = {}, {}
for w in words:
    base = re.sub(r'[^a-z0-9]', '', str(w[0]).lower()) or 'w'
    if base[0].isdigit():
        base = 'n' + base
    seen[base] = seen.get(base, 0) + 1
    name = base if seen[base] == 1 else f'{base}{seen[base]}'
    T[name] = round(w[1] + a.offset, 3)
    if len(w) > 2:
        T[name + 'End'] = round(w[2] + a.offset, 3)
T['end'] = round((words[-1][2] if len(words[-1]) > 2 else words[-1][1]) + a.offset, 3)
json.dump(T, open(a.out, 'w'), indent=0)
if a.js:
    open(a.js, 'w').write("/* The voice's words, named: seconds on the reel's clock (named-times.py). */\nwindow.T = " + json.dumps(T) + ';\n')
print(' '.join(f'{k}:{v}' for k, v in T.items() if not k.endswith('End')))
