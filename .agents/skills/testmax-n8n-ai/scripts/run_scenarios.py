#!/usr/bin/env python3
"""Run each workflow of a run directory once for each scenario, with pinned data.

  run_scenarios.py <run-dir>

Reads <run-dir>/scenarios.json (optional, see SKILL.md) and <builder>/workflow.json.
sdk.mjs makes the pin data: triggers, service nodes and AI root nodes are pinned, and logic
nodes (Set, IF, Code, Aggregate, ...) run for real. The n8n MCP tool test_workflow runs the
workflow, and get_workflow_execution reads the result of each node.
Writes <builder>/exec.json. MCP runs a workflow only when its MCP access is on, so the script
turns it on through the REST API when necessary, records that in exec.json, and turns it off
again after the scenarios. With several triggers, each scenario starts from the trigger that
sdk.mjs picks (scenarios.json "triggerNode", or the trigger that reaches the "reach" types).
"""

import json
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

from n8n_api import N8nClient, load_token

HERE = Path(__file__).resolve().parent
TIMEOUT_SECONDS = 90
ITEMS_PER_NODE = 3


class Mcp:
	def __init__(self, base_url, token):
		self.url, self.token = base_url + '/mcp-server/http', token

	def call(self, tool, arguments):
		body = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
		                   'params': {'name': tool, 'arguments': arguments}}).encode()
		req = urllib.request.Request(self.url, data=body, method='POST', headers={
			'content-type': 'application/json',
			'accept': 'application/json, text/event-stream',
			'authorization': f'Bearer {self.token}',
		})
		with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS + 60) as res:
			raw = res.read().decode()
		lines = [line[5:].strip() for line in raw.splitlines() if line.startswith('data:')]
		reply = json.loads(lines[-1] if lines else raw)
		if 'error' in reply:
			raise RuntimeError(f'{tool}: {reply["error"].get("message")}')
		result = reply['result']
		return result.get('structuredContent') or json.loads(result['content'][0]['text'])


def matches(node_type, pattern):
	short = node_type.rsplit('.', 1)[-1]
	return node_type == pattern or short.lower() == pattern.lower()


def read_run(run_data, types):
	"""Per node: did it run, its error, and its first output items (all outputs)."""
	nodes = {}
	for name, runs in (run_data or {}).items():
		run = runs[-1] if runs else {}
		items = []
		for output in ((run.get('data') or {}).get('main') or []):
			items.extend(item.get('json') for item in (output or [])[:ITEMS_PER_NODE])
		error = run.get('error')
		nodes[name] = {
			'type': types.get(name),
			'status': run.get('executionStatus'),
			'error': (error.get('message') or error.get('description')) if isinstance(error, dict) else error,
			'items': items[:ITEMS_PER_NODE * 2],
		}
	return nodes


def expectations(expect, nodes):
	"""Check reach and skip: node types that must run, and node types that must not run."""
	results = []
	ran = [n for n in nodes.values() if n['status'] == 'success' and not n['error']]
	for pattern in expect.get('reach') or []:
		results.append({'kind': 'reach', 'type': pattern, 'ok': any(matches(n['type'] or '', pattern) for n in ran)})
	for pattern in expect.get('skip') or []:
		results.append({'kind': 'skip', 'type': pattern,
		                'ok': not any(matches(n['type'] or '', pattern) for n in nodes.values())})
	return results


def set_mcp_access(client, workflow_id, on):
	"""Set MCP access for the workflow. Returns True when the script changed the setting."""
	wf = client.workflow(workflow_id)
	settings = wf.get('settings') or {}
	if bool(settings.get('availableInMCP')) == on:
		return False
	client.request('PATCH', f'/rest/workflows/{workflow_id}',
	               {'versionId': wf['versionId'], 'settings': {**settings, 'availableInMCP': on}})
	return True


def run_builder(sub, scenarios_file, client, mcp, node):
	meta = json.loads((sub / 'run.json').read_text())
	workflow_id = meta.get('workflowId')
	wf_file = sub / 'workflow.json'
	out = {'workflowId': workflow_id, 'scenarios': []}
	if not workflow_id or not wf_file.exists():
		out['skipped'] = 'No workflow.'
		return out
	workflow = json.loads(wf_file.read_text())
	types = {n['name']: n['type'] for n in workflow.get('nodes', [])}
	cmd = [node, str(HERE / 'sdk.mjs'), 'pin-plan', str(wf_file)] + ([str(scenarios_file)] if scenarios_file else [])
	plan = json.loads(subprocess.run(cmd, cwd=HERE, capture_output=True, text=True, check=True).stdout)
	out.update(pinned=plan['pinned'], executed=plan['executed'])
	try:
		out['mcpAccessTurnedOn'] = set_mcp_access(client, workflow_id, True)
	except Exception as e:
		out['skipped'] = f'Could not turn on MCP access: {e}'
		return out
	try:
		run_plan(plan, workflow_id, types, mcp, sub, out)
	finally:
		if out['mcpAccessTurnedOn']:
			try:
				set_mcp_access(client, workflow_id, False)
			except Exception as e:
				out['mcpAccessRestoreError'] = str(e)
				print(f'[scenarios] {sub.name}: could not turn MCP access off again: {e}', flush=True)
	return out


def run_plan(plan, workflow_id, types, mcp, sub, out):
	for scenario in plan['scenarios']:
		entry = {'name': scenario['name'], 'expect': scenario['expect'], 'provenance': scenario['provenance']}
		args = {'workflowId': workflow_id, 'pinData': scenario['pinData'], 'timeout': TIMEOUT_SECONDS}
		if scenario.get('triggerNode'):
			args['triggerNodeName'] = entry['triggerNode'] = scenario['triggerNode']
		try:
			result = mcp.call('test_workflow', args)
			entry.update(status=result.get('status'), error=result.get('error'), executionId=result.get('executionId'))
			if result.get('executionId'):
				execution = mcp.call('get_workflow_execution', {'workflowId': workflow_id,
				                                                'executionId': result['executionId'], 'includeData': True})
				run_data = ((execution.get('data') or {}).get('resultData') or {}).get('runData')
				entry['nodes'] = read_run(run_data, types)
				entry['checks'] = expectations(scenario['expect'], entry['nodes'])
		except Exception as e:
			entry.update(status='error', error=f'{type(e).__name__}: {e}')
		print(f'[scenarios] {sub.name}: {scenario["name"]} -> {entry.get("status")}'
		      + (f' ({entry["error"]})' if entry.get('error') else ''), flush=True)
		out['scenarios'].append(entry)


def main():
	run_dir = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
	node = shutil.which('node')
	token = load_token()
	if not node or not token:
		sys.exit('Scenarios need node on PATH and a working MCP token.')
	client = N8nClient().login()
	mcp = Mcp(client.base_url, token)
	scenarios_file = run_dir / 'scenarios.json'
	scenarios_file = scenarios_file if scenarios_file.exists() else None
	for meta_file in sorted(run_dir.glob('*/run.json')):
		sub = meta_file.parent
		try:
			out = run_builder(sub, scenarios_file, client, mcp, node)
		except Exception as e:
			out = {'skipped': f'{type(e).__name__}: {e}', 'scenarios': []}
		(sub / 'exec.json').write_text(json.dumps(out, indent=1))
		if out.get('skipped'):
			print(f'[scenarios] {sub.name}: skipped, {out["skipped"]}', flush=True)


if __name__ == '__main__':
	main()
