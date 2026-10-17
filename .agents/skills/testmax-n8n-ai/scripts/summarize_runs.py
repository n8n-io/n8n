#!/usr/bin/env python3
"""Print a short summary of each run for the judge step.

  summarize_runs.py <run-dir>

For each builder it prints the final agent message, the nodes and connections of
the created workflow, and the main node parameters (each value truncated).
"""

import json
import sys
from pathlib import Path

PARAM_CHARS = 400


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
					via = '' if kind == 'main' else f' ({kind})'
					lines.append(f'  {source}{branch} -> {target["node"]}{via}')
	return lines


def main():
	run_dir = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
	for meta_file in sorted(run_dir.glob('*/run.json')):
		sub = meta_file.parent
		meta = json.loads(meta_file.read_text())
		print(f'===== {sub.name} ({meta.get("kind")}) workflow={meta.get("workflowId")} =====')
		try:
			print('FINAL MESSAGE:\n' + (final_message(sub, meta) or '(none)').strip()[:3000])
		except Exception as e:
			print(f'FINAL MESSAGE: unreadable ({e})')
		wf_file = sub / 'workflow.json'
		if not wf_file.exists():
			print('WORKFLOW: none\n')
			continue
		workflow = json.loads(wf_file.read_text())
		print(f'WORKFLOW: {workflow.get("name")}  nodes={len(workflow.get("nodes", []))}')
		for node in workflow.get('nodes', []):
			creds = ', '.join((node.get('credentials') or {}).keys())
			print(f'- {node["name"]} | {node["type"]} v{node.get("typeVersion")}' + (f' | creds: {creds}' if creds else ''))
			for key, value in (node.get('parameters') or {}).items():
				text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
				print(f'    {key}: {text[:PARAM_CHARS]}{"…" if len(text) > PARAM_CHARS else ""}')
		print('CONNECTIONS:')
		print('\n'.join(connections(workflow)) or '  (none)')
		print()


if __name__ == '__main__':
	main()
