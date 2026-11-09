#!/usr/bin/env python3
"""Print the evidence of each run for the judge step.

  summarize_runs.py <run-dir>            print the summary with the builder names
  summarize_runs.py <run-dir> --blind    write judge/summary-blind.txt and judge/blind-map.json

The summary has the expected outcome criteria with their ids, and for each builder: the final
agent message, every node with all its parameters and settings, the connections, and the facts
from auto-checks.json. Nothing is truncated, so the judge can cite exact values.

In blind mode the builders are called A, B and C in a random order, and builder and model names
are removed from the final messages. blind-map.json maps each letter back to its builder.
"""

import argparse
import json
import random
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_report import load_case, parse_criteria  # noqa: E402

NODE_SETTINGS = ('disabled', 'onError', 'retryOnFail', 'maxTries', 'waitBetweenTries', 'executeOnce',
                 'alwaysOutputData', 'notesInFlow', 'notes')
BUILDER_NAMES = re.compile(
	r'\b(Instance AI|n8n Assistant|Claude Code|Claude|Anthropic|Codex|OpenAI|ChatGPT|GPT-[\w.-]+|Sonnet|Opus|Haiku)\b',
	re.IGNORECASE)
MARK = {True: '✓', False: '✗', None: '?'}
REPO = Path(__file__).resolve().parents[4]
LLM_CHECKS_DIR = REPO / 'packages/@n8n/instance-ai/evaluations/binaryChecks/checks'
# The LLM binary checks of the eval suite that the judges answer as quality checks.
QUALITY_CHECKS = ('valid-data-flow', 'correct-node-operations', 'handles-multiple-items', 'descriptive-node-names',
                  'response-describes-changes-accurately')


def quality_checks():
	"""[(name, description, rules)] read from the check sources, so the rules stay those of the eval suite."""
	out = []
	for file in QUALITY_CHECKS:
		path = LLM_CHECKS_DIR / f'{file}.ts'
		if not path.exists():
			continue
		text = path.read_text()
		name = re.search(r"name:\s*'([^']+)'", text)
		desc = re.search(r"description:\s*(['\"])(.*?)\1,", text, re.S)
		rules = re.search(r'systemPrompt:\s*`((?:\\`|[^`])*)`', text)
		if name and rules:
			out.append((name.group(1), desc.group(2) if desc else '', rules.group(1).replace('\\`', '`').strip()))
	return out


def quality_text():
	checks = quality_checks()
	if not checks:
		return ''
	lines = ['QUALITY CHECKS (from the Instance AI eval suite). For each builder, answer each check once in "quality",',
	         'with the check name as the id. The final message is the narration of the agent. Each build starts',
	         'from an empty workflow, so the START workflow is empty.']
	for name, desc, rules in checks:
		lines += [f'--- [{name}] {desc}', rules]
	return '\n'.join(lines) + '\n'


def session_final_message(sub, meta):
	"""Final agent message from the session file of an interactive CLI run."""
	if not meta.get('sessionFile'):
		return None
	text = None
	for line in (sub / meta['sessionFile']).read_text().splitlines():
		row = json.loads(line)
		payload = row.get('payload') or {}
		if row.get('type') == 'event_msg' and payload.get('type') == 'task_complete':
			text = payload.get('last_agent_message') or text
		if row.get('type') == 'assistant':
			blocks = (row.get('message') or {}).get('content') or []
			texts = [b['text'] for b in blocks if isinstance(b, dict) and b.get('type') == 'text' and b.get('text', '').strip()]
			text = '\n'.join(texts) or text
	return text


def final_message(sub, meta):
	kind = meta.get('kind')
	if kind == 'instance-ai':
		trace = json.loads((sub / 'trace.json').read_text())
		rich = trace['rich'].get('data', trace['rich'])
		assistant = [m for m in rich['messages'] if m.get('role') == 'assistant']
		return (assistant[-1].get('agentTree') or {}).get('textContent') or assistant[-1].get('content') if assistant else None
	if not (sub / 'stream.jsonl').exists():
		return session_final_message(sub, meta)
	text = None
	for line in (sub / 'stream.jsonl').read_text().splitlines():
		event = json.loads(line)
		if event.get('type') == 'result':
			text = event.get('result')
		item = event.get('item') or {}
		if event.get('type') == 'item.completed' and item.get('type') == 'agent_message':
			text = item.get('text')
	return text


def connections(workflow):
	lines = []
	for source, outputs in (workflow.get('connections') or {}).items():
		for kind, branches in outputs.items():
			for index, targets in enumerate(branches or []):
				for target in targets or []:
					branch = f'[{index}]' if len(branches) > 1 else ''
					# Merge and other multi-input nodes need the input index to show which side an edge feeds.
					target_index = target.get('index') or 0
					inlet = f'[in {target_index}]' if target_index else ''
					via = '' if kind == 'main' else f' ({kind})'
					lines.append(f'  {source}{branch} -> {target["node"]}{inlet}{via}')
	return lines


def criteria_text(expected):
	"""The expected outcome with the id of each criterion, as the judge must cite it."""
	groups = parse_criteria(expected or '')
	if not groups:
		return (expected or '(none)').strip()
	lines = []
	for heading, items in groups:
		if heading:
			lines.append(f'{heading}:')
		lines.extend(f'  [{num}] {text}' for num, text in items)
	return '\n'.join(lines)


def auto_check_lines(sub):
	path = sub / 'auto-checks.json'
	if not path.exists():
		return ['  (none: derive_checks.mjs did not run)']
	lines = []
	for group in json.loads(path.read_text()).get('groups', []):
		score = group.get('score')
		suffix = f' · score {score["passed"]}/{score["total"]}' if score else ''
		lines.append(f'  {group["title"]}{suffix} — {group.get("note", "")}')
		for c in group.get('checks', []):
			mark = 'i' if c.get('level') == 'info' else MARK.get(c.get('ok'), '?')
			lines.append(f'    [{mark}] {c["id"]} {c["text"]}')
			lines.extend(f'        · {d}' for d in c.get('details') or [])
	return lines


def run_section(sub, meta, label, blind=False):
	out = [f'===== {label} workflow={meta.get("workflowId")} =====']
	try:
		message = (final_message(sub, meta) or '(none)').strip()
		out.append('FINAL MESSAGE:\n' + (scrub(message, meta) if blind else message))
	except Exception as e:
		out.append(f'FINAL MESSAGE: unreadable ({e})')
	wf_file = sub / 'workflow.json'
	if not wf_file.exists():
		out.append('WORKFLOW: none\n')
		return '\n'.join(out)
	workflow = json.loads(wf_file.read_text())
	out.append(f'WORKFLOW: {workflow.get("name")}  nodes={len(workflow.get("nodes", []))}')
	out.append(f'SETTINGS: {json.dumps(workflow.get("settings") or {}, ensure_ascii=False)}')
	for node in workflow.get('nodes', []):
		creds = ', '.join((node.get('credentials') or {}).keys())
		out.append(f'- {node["name"]} | {node["type"]} v{node.get("typeVersion")}' + (f' | creds: {creds}' if creds else ''))
		settings = {k: node[k] for k in NODE_SETTINGS if k in node}
		if settings:
			out.append(f'    (settings) {json.dumps(settings, ensure_ascii=False)}')
		for key, value in (node.get('parameters') or {}).items():
			text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
			out.append(f'    {key}: {text}')
	out.append('CONNECTIONS:')
	out.append('\n'.join(connections(workflow)) or '  (none)')
	out.append('AUTO-CHECK FACTS (deterministic, from the node definitions, the n8n editor, pinned-data runs, '
	           'in-process runs with recorded API requests, the eval binary checks and the final-message claims):')
	out.extend(auto_check_lines(sub))
	return '\n'.join(out) + '\n'


def scrub(text, meta):
	"""Remove builder and model names from a final message. The workflow itself stays as built."""
	for name in filter(None, [meta.get('model'), meta.get('kind')]):
		text = re.sub(re.escape(name), 'the builder', text, flags=re.IGNORECASE)
	return BUILDER_NAMES.sub('the builder', text)


def main():
	ap = argparse.ArgumentParser(description='Print the evidence of each run for the judge step.')
	ap.add_argument('run_dir', nargs='?', default='.')
	ap.add_argument('--blind', action='store_true', help='Write a summary with the builders called A, B and C.')
	ap.add_argument('--seed', type=int, help='Seed of the blind order, for a reproducible test.')
	args = ap.parse_args()
	run_dir = Path(args.run_dir)
	case = load_case(run_dir)
	runs = [(f.parent, json.loads(f.read_text())) for f in sorted(run_dir.glob('*/run.json')) if f.parent.name != 'report']
	header = ('EXPECTED OUTCOME CRITERIA (cite each criterion by its id in brackets):\n'
	          f'{criteria_text(case.get("expected"))}\n\n{quality_text()}')

	if not args.blind:
		print(header)
		for sub, meta in runs:
			print(run_section(sub, meta, f'{sub.name} ({meta.get("kind")})'))
		return

	order = runs[:]
	random.Random(args.seed).shuffle(order)
	letters = [chr(ord('A') + i) for i in range(len(order))]
	sections = [run_section(sub, meta, f'Builder {letter}', blind=True) for letter, (sub, meta) in zip(letters, order)]
	judge_dir = run_dir / 'judge'
	judge_dir.mkdir(exist_ok=True)
	(judge_dir / 'summary-blind.txt').write_text(header + '\n' + '\n'.join(sections))
	(judge_dir / 'blind-map.json').write_text(json.dumps({letter: sub.name for letter, (sub, _) in zip(letters, order)}, indent=2))
	print(judge_dir / 'summary-blind.txt')


if __name__ == '__main__':
	main()
