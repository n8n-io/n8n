#!/usr/bin/env python3
"""Merge the blind judge panel into verdicts.json.

  merge_verdicts.py <run-dir>

Reads judge/blind-map.json and judge/verdicts-*.json. Each judge file has one entry for each
builder letter:

  {"A": {"summary": "...", "goalMet": true, "goalReason": "...", "verdict": "pass",
         "checks": [{"id": "4", "ok": true, "text": "...", "evidence": [{"node": "...", "path": "...", "value": "..."}]}]}}

For each criterion id, the merged check takes the value that all judges or a majority of the judges
gave. A split is listed under disagreements. Without a majority, the check is not confirmed (ok null).
The summary and the findings outside the criteria come from the first judge.
"""

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_report import load_case, parse_criteria  # noqa: E402

VERSION = 2
VOTE_TEXT = {True: 'met', False: 'not met', None: 'not confirmed'}


def majority(values):
	"""The value that more than half of the votes have, or None when no value has a majority."""
	value, count = Counter(values).most_common(1)[0]
	return value if count * 2 > len(values) else None


def first_check(judge, cid):
	return next((c for c in judge.get('checks') or [] if str(c.get('id')) == cid), None)


def merge_quality(judges):
	"""The quality checks by majority, in the order of the first judge that answered each check."""
	ids = list(dict.fromkeys(str(q.get('id')) for j in judges for q in j.get('quality') or [] if q.get('id')))
	merged = []
	for qid in ids:
		found = [next((q for q in j.get('quality') or [] if str(q.get('id')) == qid), None) for j in judges]
		votes = [q.get('ok') if q else None for q in found]
		ok = majority(votes)
		pick = next((q for q, v in zip(found, votes) if q and v == ok), None) or next(q for q in found if q)
		item = {'id': qid, 'ok': ok, 'text': pick.get('text', ''), 'votes': votes}
		if len(set(votes)) > 1:
			item['note'] = f'{Counter(votes)[ok]} of {len(judges)} judges.' if ok is not None else 'Judges disagree.'
		merged.append(item)
	return merged


def merge_builder(judges, criteria_ids):
	n = len(judges)
	lead = judges[0]
	checks, disagreements = [], []
	for cid in criteria_ids:
		found = [first_check(j, cid) for j in judges]
		votes = [c.get('ok') if c else None for c in found]
		if all(c is None for c in found):
			continue
		ok = majority(votes)
		pick = next((c for c, v in zip(found, votes) if c and v == ok), None) or next(c for c in found if c)
		check = {k: v for k, v in pick.items() if k != 'ok'}
		check.update(id=cid, ok=ok, votes=votes)
		if len(set(votes)) > 1:
			counts = ', '.join(f'{count} {VOTE_TEXT[v]}' for v, count in Counter(votes).items())
			disagreements.append({'id': cid, 'votes': votes, 'texts': [c.get('text') if c else None for c in found]})
			note = f'Judges disagree ({counts}).' if ok is None else f'{Counter(votes)[ok]} of {n} judges.'
			check['note'] = note
		checks.append(check)
	checks += [dict(c) for c in lead.get('checks') or [] if str(c.get('id')) not in criteria_ids]

	goal_votes = [j.get('goalMet') for j in judges]
	goal = majority(goal_votes)
	if goal is None:
		goal = False if goal_votes.count(False) * 2 >= n else None
	if len(set(goal_votes)) > 1:
		reasons = [j.get('goalReason') for j in judges if j.get('goalMet') is False and j.get('goalReason')]
		disagreements.append({'id': 'goal', 'votes': goal_votes, 'texts': reasons})
	verdicts = [j.get('verdict') for j in judges if j.get('verdict')]
	return {
		'quality': merge_quality(judges),
		'version': VERSION,
		'judges': n,
		'verdict': majority(verdicts) if verdicts else None,
		'summary': lead.get('summary', ''),
		'goalMet': goal,
		'goalReason': next((j.get('goalReason') for j in judges if j.get('goalMet') is goal and j.get('goalReason')), ''),
		'checks': checks,
		'disagreements': disagreements,
	}


def main():
	run_dir = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
	judge_dir = run_dir / 'judge'
	blind_map = json.loads((judge_dir / 'blind-map.json').read_text())
	files = sorted(judge_dir.glob('verdicts-*.json'))
	if not files:
		sys.exit(f'No judge/verdicts-*.json in {run_dir}.')
	panel = [json.loads(f.read_text()) for f in files]
	groups = parse_criteria(load_case(run_dir).get('expected') or '') or []
	criteria_ids = [num for _, items in groups for num, _ in items]

	merged = {}
	for letter, builder in blind_map.items():
		judges = [p[letter] for p in panel if letter in p]
		if not judges:
			print(f'{builder}: no judge gave a verdict for builder {letter}')
			continue
		merged[builder] = merge_builder(judges, criteria_ids)
		split = len(merged[builder]['disagreements'])
		print(f'{builder} (builder {letter}): {len(judges)} judges, {split} disagreement{"" if split == 1 else "s"}')
	(run_dir / 'verdicts.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False))
	print(run_dir / 'verdicts.json')


if __name__ == '__main__':
	main()
