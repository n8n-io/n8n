#!/usr/bin/env python3
"""The word-anchor map from the scratch voice's clock onto the real take's.
The scenes were animated to the scratch voice (vo-words.py); the take says
the same script at its own pace. Every word both say is an anchor, a pair
(real time, scratch time), and the map M(t) runs in straight lines between
anchors, at the real pace (slope 1) past either end. Nothing is re-animated,
only re-timed: reel-clock.js plays t = W(τ) through the same pairs.

Usage:
  timemap.py --scratch scratch.json --real real.json [--out anchors.json]
             [--alias open-sourced=open ...] [--pair WORD:SCRATCH_T=REAL_T ...]
             [--scene START:END] [--at 1.2,3.4]

Both word files are [[word, start, end], ...] or [[word, start], ...]
(vo-words.py and fil-words.py write them). Words are matched in order with
difflib's SequenceMatcher on normalised words (lowercase, letters and digits
only); --alias a=b makes word a count as b (said "open source" for
"open-sourced": --alias open-sourced=open), and --pair adds an anchor by hand
for a word said differently (--pair happens:2.65=2.44). Anchors that would
run backwards are dropped, so the map only moves forward.

It writes {"anchors": [[real, scratch, word], ...]} (real first: [τ, t], as
reel-clock.js takes them) and prints the coverage: how many anchors, the
longest stretch without one, and the scratch words left unmatched.
--scene START:END (scratch seconds of one scene) writes that scene's LOCAL
anchors instead, both clocks from the scene's start (τ − M(START),
t − START), pinned at both ends, with the scene's real duration and where
it starts on the real take. --at prints M(t) for scratch times.
Python 3 standard library only."""
import argparse, difflib, json, re, sys


def load(path):
    with open(path) as f:
        return [(str(w[0]), float(w[1])) for w in json.load(f)]


def make_norm(aliases):
    base = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())
    table = {base(a): base(b) for a, b in aliases}
    return lambda w: table.get(base(w), base(w))


def anchors(scr, real, norm, pairs=()):
    """[(scratch, real, word), ...]: matched words plus the manual pairs,
    sorted by scratch time, kept only while both clocks move forward."""
    sm = difflib.SequenceMatcher(a=[norm(w) for w, _ in scr], b=[norm(w) for w, _ in real], autojunk=False)
    got = []
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            got.append((scr[a + k][1], real[b + k][1], scr[a + k][0]))
    got += list(pairs)
    got.sort()
    mono = []
    for p in got:
        if not mono or (p[0] > mono[-1][0] and p[1] > mono[-1][1]):
            mono.append(p)
    return mono


def mapper(mono):
    """M(t): scratch seconds -> real seconds."""
    def M(t):
        a = mono
        if t <= a[0][0]:
            return a[0][1] + (t - a[0][0])
        if t >= a[-1][0]:
            return a[-1][1] + (t - a[-1][0])
        for i in range(len(a) - 1):
            if a[i][0] <= t <= a[i + 1][0]:
                k = (t - a[i][0]) / (a[i + 1][0] - a[i][0])
                return a[i][1] + k * (a[i + 1][1] - a[i][1])
    return M


def coverage(scr, real, mono):
    used = [p[0] for p in mono]
    unmatched = [f'{w}@{s:.2f}' for w, s in scr if not any(abs(s - u) < 0.06 for u in used)]
    edges = [(real[0][1], 'start')] + [(p[1], p[2]) for p in mono] + [(real[-1][1], 'end')]
    gap = max(((edges[i + 1][0] - edges[i][0], edges[i], edges[i + 1]) for i in range(len(edges) - 1)), key=lambda g: g[0])
    print(f'{len(scr)} scratch words, {len(real)} real words, {len(mono)} anchors')
    print(f'longest stretch without an anchor: {gap[0]:.2f} s of the take, {gap[1][1]}@{gap[1][0]:.2f} → {gap[2][1]}@{gap[2][0]:.2f}')
    print(f'{len(unmatched)} scratch words unmatched' + (': ' + ' '.join(unmatched) if unmatched else ''))


def main():
    p = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__.split('\n\n', 1)[1])
    p.add_argument('--scratch', required=True, help='the scratch voice\'s words')
    p.add_argument('--real', required=True, help='the real take\'s words')
    p.add_argument('--out', help='where to write the anchors (default anchors.json; with --scene, only when given)')
    p.add_argument('--alias', action='append', default=[], metavar='A=B', help='count word A as word B (repeatable)')
    p.add_argument('--pair', action='append', default=[], metavar='WORD:SCRATCH_T=REAL_T', help='an anchor by hand (repeatable)')
    p.add_argument('--scene', metavar='START:END', help='one scene\'s local anchors, START and END in scratch seconds')
    p.add_argument('--at', help='print M(t) for these scratch times, comma-separated')
    p.add_argument('--quiet', action='store_true', help='skip the coverage report')
    o = p.parse_args()

    aliases = [a.split('=', 1) for a in o.alias]
    pairs = []
    for s in o.pair:
        m = re.match(r'^(.*):(-?[\d.]+)=(-?[\d.]+)$', s)
        if not m:
            p.error(f'--pair {s}: expected WORD:SCRATCH_T=REAL_T')
        pairs.append((float(m.group(2)), float(m.group(3)), m.group(1)))
    scr, real = load(o.scratch), load(o.real)
    mono = anchors(scr, real, make_norm(aliases), pairs)
    if len(mono) < 2:
        sys.exit(f'only {len(mono)} anchors: are these the same script?')
    M = mapper(mono)
    if not o.quiet:
        coverage(scr, real, mono)

    if o.at:
        for t in (float(x) for x in o.at.split(',')):
            print(f'M({t:g}) = {M(t):.3f}')

    if o.scene:
        a, b = (float(x) for x in o.scene.split(':'))
        r0, r1 = M(a), M(b)
        loc = [[0.0, 0.0, 'start']]
        loc += [[round(m - r0, 4), round(s - a, 4), w] for s, m, w in mono if a < s < b]
        loc += [[round(r1 - r0, 4), round(b - a, 4), 'end']]
        out = {'anchors': loc, 'dur': round(r1 - r0, 4), 'real': [round(r0, 4), round(r1, 4)], 'scratch': [a, b]}
        print(f'scene {a:g}–{b:g} s of the scratch voice: {b - a:.3f} s; on the take {r0:.3f}–{r1:.3f} s, {r1 - r0:.3f} s; {len(loc)} local anchors')
        if o.out:
            with open(o.out, 'w') as f:
                json.dump(out, f)
            print('->', o.out)
        else:
            print(json.dumps(out))
        return

    path = o.out or 'anchors.json'
    with open(path, 'w') as f:
        json.dump({'anchors': [[m, s, w] for s, m, w in mono]}, f)
    print('->', path)


if __name__ == '__main__':
    main()
