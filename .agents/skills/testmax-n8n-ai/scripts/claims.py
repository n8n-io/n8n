#!/usr/bin/env python3
"""Check what the final message of each builder says against the trace, the workflow and the runs.

  claims.py <run-dir>

Writes <builder>/claims.json with {message, checks: [{id, ok, text, details}]}. No LLM is involved.
A check is about one kind of claim: the workflow id, the publish state, validation, testing, the
values in `code spans`, and if a claim that the workflow works agrees with the service-call runs.
A message that does not make a kind of claim gets no check for it.
"""

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_report import load_run  # noqa: E402
from summarize_runs import final_message  # noqa: E402

TEST_TOOL = re.compile(r'test|execut|verify|run[-_]?workflow|simulat', re.I)
SHELL_TOOL = re.compile(r'command|shell|bash', re.I)
SCRIPT_PASSED = re.compile(r'"passed"\s*:\s*true|\b\d+ (?:tests? )?passed\b|\ball tests passed\b', re.I)
VALIDATE_TOOL = re.compile(r'validat', re.I)
NEGATION = re.compile(r"\b(not|never|no|nothing|without)\b|n't\b", re.I)
# A clause about what can or will happen later is not a claim about the run.
MODAL = re.compile(r"\b(can|can't|cannot|will|won't|could|would|should|once|until|after that|let me know|need)\b", re.I)
TESTED = re.compile(r'\b(tested|test run|ran|run|runs|executed|simulat\w*|routing checks?|checks? passed)\b', re.I)
VALIDATED = re.compile(r'\b(validat\w*|valid)\b', re.I)
PASSED = re.compile(r'\b(pass\w*|succeed\w*|valid|ok|clean)\b', re.I)
DRAFT = re.compile(r"\b(draft|inactive|unpublished|not (?:yet )?(?:live|active|published)|isn't (?:yet )?(?:live|active)|not turned on)\b", re.I)
LIVE = re.compile(r'\b(?:is|now) (?:live|active|published)\b', re.I)
WORKFLOW_ID = re.compile(r'/workflow/([A-Za-z0-9]{8,})|\bID `?([A-Za-z0-9]{16})`?')
CODE_SPAN = re.compile(r'`([^`\n]{2,80})`')
INVALID = re.compile(r'"valid"\s*:\s*false|"success"\s*:\s*false', re.I)
# A test tool can answer without a transport error and still report a failed execution.
RUN_FAILED = re.compile(r'"status"\s*:\s*"(?:error|failed|crashed|canceled|cancelled)"|"success"\s*:\s*false', re.I)


def clauses(message):
	"""The message split into clauses, with Markdown emphasis removed."""
	text = re.sub(r'[*_]{1,2}([^*_]+)[*_]{1,2}', r'\1', message or '')
	# Streamed messages can join sentences with no space, as in "done.Next".
	return [c.strip() for c in re.split(r'(?<=[.!?:])\s+|(?<=[a-z][.!?])(?=[A-Z])|\n+|;\s+|,\s+but\s+|\s+but\s+', text) if c.strip()]


def claim(message, pattern, extra=None):
	"""(positive, negative) clauses that match pattern. extra must also match a positive clause."""
	pos, neg = [], []
	for c in clauses(message):
		if not pattern.search(c) or MODAL.search(c):
			continue
		if NEGATION.search(c):
			neg.append(c)
		elif extra is None or extra.search(c):
			pos.append(c)
	return pos, neg


def tool_text(e):
	return ' '.join(x if isinstance(x, str) else json.dumps(x, ensure_ascii=False) for x in (e.get('args'), e.get('code'), e.get('result')) if x)


def check(id_, ok, text, details):
	return {'id': id_, 'ok': ok, 'text': text, 'details': details}


def quote(clauses_):
	return [f'Message: "{c}"' for c in clauses_[:3]]


def id_check(message, meta, workflow):
	ids = {a or b for a, b in WORKFLOW_ID.findall(message or '')}
	if not ids:
		return None
	known = set(meta.get('workflowIds') or []) | {meta.get('workflowId'), (workflow or {}).get('id')}
	wrong = sorted(ids - known)
	return check('M1', not wrong, 'The workflow id in the message is the workflow that the run created',
	             [f'{i} is not a workflow of this run' for i in wrong] or [f'{", ".join(sorted(ids))} matches.'])


def state_check(message, workflow):
	draft, live = DRAFT.findall(message or ''), LIVE.findall(message or '')
	if workflow is None or not (draft or live):
		return None
	active = bool(workflow.get('active'))
	says = 'active' if live and not draft else 'a draft'
	ok = active == (says == 'active')
	return check('M2', ok, f'The message says the workflow is {says}', [f'workflow.json active is {str(active).lower()}.'])


def validation_check(message, events):
	pos, _ = claim(message, VALIDATED, PASSED)
	if not pos:
		return None
	calls = [e for e in events if (e['kind'] == 'tool' and VALIDATE_TOOL.search(e.get('name') or ''))
	         or (e['kind'] == 'code' and VALIDATE_TOOL.search(e.get('code') or ''))]
	if not calls:
		return check('M3', False, 'The message says the workflow passed validation', quote(pos) + ['No validation tool call in the trace.'])
	last = calls[-1]
	failed = last.get('error') or INVALID.search(str(last.get('result') or ''))
	return check('M3', not failed, 'The message says the workflow passed validation', quote(pos) + [
		f'{len(calls)} validation call(s). The last one {"failed" if failed else "passed"}: {last.get("name")}.'])


def test_check(message, events):
	pos, neg = claim(message, TESTED)
	runs = [e for e in events if e['kind'] == 'tool' and TEST_TOOL.search(e.get('name') or '')
	        and not VALIDATE_TOOL.search(e.get('name') or '') and not SHELL_TOOL.search(e.get('name') or '')]
	scripts = [e for e in events if e['kind'] == 'code' and SCRIPT_PASSED.search(str(e.get('result') or ''))]
	if pos:
		ok_runs = [e for e in runs if not e.get('error') and not RUN_FAILED.search(tool_text({'result': e.get('result')}))]
		if ok_runs:
			names = sorted({e['name'] for e in ok_runs})
			return check('M4', True, 'The message says the workflow was tested', quote(pos) + [f'{len(ok_runs)} successful test call(s): {", ".join(names)}.'])
		if scripts:
			return check('M4', True, 'The message says the workflow was tested', quote(pos) + [
				f'{len(scripts)} script(s) in the trace report passed tests. These ran outside n8n, not as a workflow execution.'])
		return check('M4', False, 'The message says the workflow was tested', quote(pos) + ['No test or execution call in the trace.'])
	if neg and runs:
		return check('M4', False, 'The message says the workflow was not run', quote(neg) + [f'The trace has {len(runs)} test call(s).'])
	if neg:
		return check('M4', True, 'The message says the workflow was not run', quote(neg) + ['No test or execution call in the trace.'])
	return None


def span_check(message, events, workflow, prompt):
	spans = sorted({s.strip() for s in CODE_SPAN.findall(message or '')})
	if not spans:
		return None
	haystack = '\n'.join([json.dumps(workflow or {}, ensure_ascii=False), prompt] + [tool_text(e) for e in events])
	loose = lambda s: re.sub(r'\s+', ' ', s).lower()
	hay = loose(haystack.replace('\\"', '"'))
	missing = [s for s in spans if loose(s) not in hay]
	return check('M5', not missing, f'Values in code spans are in the workflow, the prompt or a tool result ({len(spans) - len(missing)} of {len(spans)})',
	             [f'`{s}` is not in the workflow, the prompt or any tool call' for s in missing])


def works_check(message, wire):
	pos, _ = claim(message, re.compile(TESTED.pattern + '|' + VALIDATED.pattern, re.I), None)
	if not pos or not wire or wire.get('skipped'):
		return None
	failed = [s for s in wire.get('scenarios', []) if s.get('kind') == 'contract'
	          and (s.get('status') != 'success' or any(c.get('ok') is False for c in s.get('checks') or []))]
	details = quote(pos) + [f'"{s["name"]}" fails in the service-call run: {s.get("error") or "a check fails"}.' for s in failed]
	return check('M6', not failed, 'A claim that the workflow was checked agrees with the service-call runs', details)


def claims_for(sub, meta, prompt):
	workflow = json.loads((sub / 'workflow.json').read_text()) if (sub / 'workflow.json').exists() else None
	wire = json.loads((sub / 'wire.json').read_text()) if (sub / 'wire.json').exists() else None
	try:
		message = final_message(sub, meta)
	except Exception as e:
		return {'message': None, 'error': f'The final message is not readable: {e}', 'checks': []}
	data = load_run(sub, meta, {})
	events = data.get('events') or []
	checks = [id_check(message, meta, workflow), state_check(message, workflow), validation_check(message, events),
	          test_check(message, events), span_check(message, events, workflow, prompt), works_check(message, wire)]
	out = {'message': message, 'checks': [c for c in checks if c]}
	if data.get('loadError'):
		out['error'] = f'The trace is not readable: {data["loadError"]}'
	return out


def main():
	run_dir = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
	prompt = (run_dir / 'prompt.txt').read_text() if (run_dir / 'prompt.txt').exists() else ''
	for f in sorted(run_dir.glob('*/run.json')):
		sub = f.parent
		if sub.name == 'report':
			continue
		result = claims_for(sub, json.loads(f.read_text()), prompt)
		(sub / 'claims.json').write_text(json.dumps(result, indent=1, ensure_ascii=False))
		ok = sum(1 for c in result['checks'] if c['ok'])
		print(f'{sub.name}: claims.json written ({ok}/{len(result["checks"])})')


if __name__ == '__main__':
	main()
