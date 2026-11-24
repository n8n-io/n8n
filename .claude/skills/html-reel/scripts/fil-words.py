#!/usr/bin/env python3
"""The real take's words, [[word, start, end], ...] in seconds, from what a
transcript tool printed. It reads three formats, telling them apart itself:

- Fil's captions list, the text get_video returns with captions "list":
  lines like `- k3f9a.12 · 1.24–1.52 s · “screen”`. Captions made with
  look.max_words 1 give one word a line; a cue of several words is split
  evenly across its span, by letters. Other lines (clips, lanes) are skipped.
- "t word|t word|…" (a start time and a word, as cut/master-words.txt was
  saved). It has no ends, so a word ends where the next one starts, at most
  --max-word seconds (0.8) later.
- whisper.cpp's JSON (-ojf, one token a segment): tokens without a leading
  space join the word before them.

Usage:
  fil-words.py captions.txt [--out words.json] [--offset 0] [--max-word 0.8]
  fil-words.py - < captions.txt        (read from stdin)

--offset S adds S seconds to every time (a scene's start, say). Prints the
word count, the span and the longest pause. Python 3 standard library only."""
import argparse, json, re, sys

CUE = re.compile(r'^\s*-\s+(\S+)\s+·\s+(-?[\d.]+)\s*[–-]\s*(-?[\d.]+)\s*s\s+·\s+[“"](.*)[”"]\s*$')


def from_captions(text):
    words = []
    for line in text.splitlines():
        m = CUE.match(line)
        if not m:
            continue
        s, e, cue = float(m.group(2)), float(m.group(3)), m.group(4).split()
        if not cue:
            continue
        total = sum(len(w) for w in cue) or 1
        t = s
        for w in cue:
            d = (e - s) * len(w) / total
            words.append([w, round(t, 3), round(t + d, 3)])
            t += d
    return words


def from_pipes(text, max_word):
    pairs = []
    for item in text.strip().split('|'):
        item = item.strip()
        if item:
            t, w = item.split(None, 1)
            pairs.append((float(t), w.strip()))
    return [[w, round(t, 3), round(min(pairs[i + 1][0], t + max_word) if i + 1 < len(pairs) else t + max_word, 3)]
            for i, (t, w) in enumerate(pairs)]


def from_whisper(d):
    words = []
    for seg in d.get('transcription', []):
        tx = seg.get('text', '')
        if not tx.strip():
            continue
        s, e = seg['offsets']['from'] / 1000, seg['offsets']['to'] / 1000
        if words and not tx.startswith(' '):
            words[-1][0] += tx.strip()
            words[-1][2] = round(e, 3)
        else:
            words.append([tx.strip(), round(s, 3), round(e, 3)])
    return words


def parse(text, max_word=0.8):
    st = text.lstrip()
    if st.startswith('{'):
        return from_whisper(json.loads(text))
    if st.startswith('['):
        return [[w[0], float(w[1]), float(w[2] if len(w) > 2 else w[1])] for w in json.loads(text)]
    if CUE.search(text) or any(CUE.match(l) for l in text.splitlines()):
        return from_captions(text)
    if re.match(r'^\s*-?[\d.]+\s+\S', st) and '|' in st:
        return from_pipes(text, max_word)
    raise SystemExit('not a captions list, a "t word|…" line or whisper.cpp JSON')


def main():
    p = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__.split('\n\n', 1)[1])
    p.add_argument('src', help='the text get_video printed, a "t word|…" file or whisper.cpp JSON (- for stdin)')
    p.add_argument('--out', default='words.json')
    p.add_argument('--offset', type=float, default=0.0, help='seconds added to every time')
    p.add_argument('--max-word', type=float, default=0.8, help='longest word when the format has no ends (s)')
    o = p.parse_args()
    text = sys.stdin.read() if o.src == '-' else open(o.src).read()
    words = [[w, round(s + o.offset, 3), round(e + o.offset, 3)] for w, s, e in parse(text, o.max_word)]
    if not words:
        raise SystemExit('no words found')
    with open(o.out, 'w') as f:
        json.dump(words, f)
    gaps = [(words[i + 1][1] - words[i][2], words[i][0], words[i + 1][0]) for i in range(len(words) - 1)]
    g = max(gaps) if gaps else (0, '', '')
    print(f'{len(words)} words, {words[0][1]:.2f}–{words[-1][2]:.2f} s; longest pause {g[0]:.2f} s ({g[1]} … {g[2]}) -> {o.out}')


if __name__ == '__main__':
    main()
