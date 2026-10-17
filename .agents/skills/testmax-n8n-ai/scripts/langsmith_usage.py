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
"""

import argparse
import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

from n8n_api import setting


def fetch_calls(started_at, finished_at, traces=None):
	"""LLM calls in the LangSmith project between two ISO times. traces keeps only the calls of these traces."""
	key = setting('LANGSMITH_API_KEY')
	if not key:
		raise SystemExit('LANGSMITH_API_KEY is not set. Instance AI cost and tokens are not available.')
	base = setting('LANGSMITH_ENDPOINT', default='https://api.smith.langchain.com').rstrip('/')
	project = setting('LANGSMITH_PROJECT', default='default')

	def call(method, path, body=None):
		req = urllib.request.Request(
			base + path, method=method,
			data=json.dumps(body).encode() if body is not None else None,
			headers={'x-api-key': key, 'content-type': 'application/json'},
		)
		with urllib.request.urlopen(req, timeout=60) as res:
			return json.load(res)

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
			'select': ['name', 'start_time', 'end_time', 'prompt_tokens', 'completion_tokens',
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
				'trace': run.get('trace_id'), 'name': run.get('name'),
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
	print(json.dumps(totals(calls), indent=2))


if __name__ == '__main__':
	main()
