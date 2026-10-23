#!/usr/bin/env python3
"""Fetch per-call token usage and cost of an Instance AI run from LangSmith.

n8n does not store token usage. LangSmith has it when the instance runs with
LANGSMITH_TRACING=true. The script reads LANGSMITH_API_KEY, LANGSMITH_ENDPOINT and
LANGSMITH_PROJECT from the config (see n8n_api.config).

  langsmith_usage.py --run-dir <run-dir>/iai

It takes all LLM runs in the project between startedAt and finishedAt from run.json.
Do not start other Instance AI work on the same instance during the run, or use --by-trace.

  langsmith_usage.py --run-dir <dir> --by-trace

--by-trace keeps only the calls of the traces in run.json "langsmithRunIds" (the root run id of
each run-start event is also its LangSmith trace id). Use it when other Instance AI work runs
at the same time.

The script also writes context.json: for each agent, the system prompt, the messages before
the first model response, and the tools, from the first LLM call of that agent. Tools that the
agent loads later with load_tool come from its last call.
"""

import argparse
import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

from n8n_api import setting


def langsmith_client():
	key = setting('LANGSMITH_API_KEY')
	if not key:
		raise SystemExit('LANGSMITH_API_KEY is not set. Instance AI cost and tokens are not available.')
	base = setting('LANGSMITH_ENDPOINT', default='https://api.smith.langchain.com').rstrip('/')

	def call(method, path, body=None):
		req = urllib.request.Request(
			base + path, method=method,
			data=json.dumps(body).encode() if body is not None else None,
			headers={'x-api-key': key, 'content-type': 'application/json'},
		)
		with urllib.request.urlopen(req, timeout=60) as res:
			return json.load(res)

	return call


def fetch_calls(started_at, finished_at, traces=None):
	"""LLM calls in the LangSmith project between two ISO times. traces keeps only the calls of these traces."""
	call = langsmith_client()
	project = setting('LANGSMITH_PROJECT', 'LANGCHAIN_PROJECT', default='instance-ai')

	sessions = call('GET', '/api/v1/sessions?' + urllib.parse.urlencode({'name': project}))
	if not sessions:
		raise SystemExit(f'LangSmith project "{project}" not found.')
	session_id = sessions[0]['id']

	start = datetime.fromisoformat(started_at) - timedelta(seconds=5)
	end = datetime.fromisoformat(finished_at) + timedelta(seconds=5)
	calls, cursor = [], None
	while True:
		body = {
			'session': [session_id], 'run_type': 'llm', 'limit': 100,
			'start_time': start.isoformat(),
			'select': ['id', 'name', 'start_time', 'end_time', 'prompt_tokens', 'completion_tokens',
			           'total_cost', 'prompt_token_details', 'extra', 'trace_id'],
		}
		if cursor:
			body['cursor'] = cursor
		res = call('POST', '/api/v1/runs/query', body)
		for run in res.get('runs', []):
			started = datetime.fromisoformat(run['start_time'].replace('Z', '+00:00'))
			if started.tzinfo is None:
				started = started.replace(tzinfo=start.tzinfo)
			if started > end or (traces is not None and run.get('trace_id') not in traces):
				continue
			details = run.get('prompt_token_details') or {}
			metadata = (run.get('extra') or {}).get('metadata') or {}
			calls.append({
				'id': run.get('id'), 'trace': run.get('trace_id'), 'name': run.get('name'),
				'start': started.isoformat(), 'end': run.get('end_time'),
				'in': run.get('prompt_tokens') or 0,
				'cache_read': details.get('cache_read') or 0,
				'cache_write': details.get('cache_creation') or 0,
				'out': run.get('completion_tokens') or 0,
				'cost': float(run.get('total_cost') or 0),
				'model': metadata.get('ls_model_name'),
			})
		cursor = (res.get('cursors') or {}).get('next')
		if not cursor:
			break
	return sorted(calls, key=lambda c: c['start'])


def message_text(content):
	if isinstance(content, str):
		return content
	return '\n'.join(p.get('text', '') for p in content or [] if isinstance(p, dict) and p.get('type') == 'text')


def tool_spec(t):
	return {'name': t.get('name') or t.get('id'), 'description': t.get('description') or '',
	        'schema': t.get('inputSchema') or t.get('parameters'), 'type': t.get('type')}


def fetch_contexts(calls):
	"""What each agent got before its first model response, in the order that the agents started."""
	call = langsmith_client()
	by_agent = {}
	for c in calls:
		if c.get('id'):
			by_agent.setdefault(c['name'], []).append(c)
	contexts = []
	for name, agent_calls in by_agent.items():
		first = call('GET', f'/api/v1/runs/{agent_calls[0]["id"]}').get('inputs') or {}
		messages = []
		for m in first.get('input') or []:
			if m.get('role') not in ('system', 'user'):
				break
			messages.append({'role': m['role'], 'text': message_text(m.get('content'))})
		tools = [tool_spec(t) for t in first.get('tools') or []]
		loaded = []
		if len(agent_calls) > 1:
			last = call('GET', f'/api/v1/runs/{agent_calls[-1]["id"]}').get('inputs') or {}
			known = {t['name'] for t in tools}
			loaded = [tool_spec(t) for t in last.get('tools') or [] if (t.get('name') or t.get('id')) not in known]
		contexts.append({'agent': name, 'messages': messages, 'tools': tools, 'loadedTools': loaded})
	return contexts


def totals(calls):
	return {
		'calls': len(calls), 'models': sorted({c['model'] for c in calls if c['model']}),
		'input': sum(c['in'] for c in calls), 'output': sum(c['out'] for c in calls),
		'cost': round(sum(c['cost'] for c in calls), 4),
	}


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--run-dir', required=True)
	ap.add_argument('--by-trace', action='store_true')
	args = ap.parse_args()
	run_dir = Path(args.run_dir)
	meta = json.loads((run_dir / 'run.json').read_text())
	traces = set(meta.get('langsmithRunIds') or [])
	if args.by_trace and not traces:
		raise SystemExit('run.json has no langsmithRunIds. Is LANGSMITH_TRACING=true on the instance?')
	calls = fetch_calls(meta['startedAt'], meta['finishedAt'], traces if args.by_trace else None)
	(run_dir / 'usage.json').write_text(json.dumps(calls, indent=1))
	(run_dir / 'context.json').write_text(json.dumps(fetch_contexts(calls), indent=1))
	print(json.dumps(totals(calls), indent=2))


if __name__ == '__main__':
	main()
