#!/usr/bin/env python3
"""Run one prompt through Instance AI on the local n8n instance.

The script sends the prompt to a new thread, answers every confirmation card with
a fixed policy, waits for the thread to go idle, and exports the trace.

  run_instance_ai.py --out <run-dir>/iai --prompt-file <run-dir>/prompt.txt

Approval policy (the same choices for every run, so runs are comparable):
  - approval, plan review, web search, continue: approve
  - text input: approve with "Use sensible defaults and continue."
  - questions: pick the first option, or skip a free-text question
  - domain access: allow once
  - workflow or credential setup cards: defer (the builder must not wait for real credentials)
  - local gateway resources and MCP connect cards: deny
"""

import argparse
import json
import os
import queue
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from live import enabled as live_enabled
from live import open_url, recording
from n8n_api import N8nClient, setting

DEFAULT_TEXT_ANSWER = 'Use sensible defaults and continue.'
HERE = Path(__file__).resolve().parent


class Recorder:
	"""Video of the thread in the n8n UI, made by record_iai.mjs."""

	def __init__(self, out):
		self.proc, self.lines = None, queue.Queue()
		node = shutil.which('node')
		if not recording() or not node:
			return
		live_flag = ['--live'] if live_enabled() else []
		self.proc = subprocess.Popen([node, str(HERE / 'record_iai.mjs'), str(out.resolve()), *live_flag], cwd=HERE,
		                             stdin=subprocess.PIPE, stdout=subprocess.PIPE,
		                             stderr=(out / 'record.log').open('w'), text=True)
		threading.Thread(target=self._read, daemon=True).start()

	def _read(self):
		for line in self.proc.stdout:
			self.lines.put(line.strip())

	def wait_for(self, word, timeout):
		deadline = time.time() + timeout
		while self.proc and time.time() < deadline:
			try:
				if self.lines.get(timeout=min(max(deadline - time.time(), 0.1), 1)) == word:
					return True
			except queue.Empty:
				if self.proc.poll() is not None:
					return False
		return False

	def send(self, line):
		if self.proc and self.proc.poll() is None:
			self.proc.stdin.write(line + '\n')
			self.proc.stdin.flush()

	def stop(self):
		if not self.proc:
			return
		self.send('stop')
		self.proc.stdin.close()
		try:
			self.proc.wait(timeout=120)
		except subprocess.TimeoutExpired:
			self.proc.kill()


ANTHROPIC_EFFORTS = ('low', 'medium', 'high', 'xhigh', 'max')
CUSTOM_EFFORTS = ('none', 'minimal', *ANTHROPIC_EFFORTS)
# Keep in sync with instance-ai.config.ts and CUSTOM_MODEL_DEFAULTS in utils/custom-model-defaults.ts.
DEFAULT_INSTANCE_AI_MODEL = 'anthropic/claude-opus-4-8'
CUSTOM_MODEL_EFFORTS = (('kimi-k3', 'low'), ('glm-5.2', 'medium'))


def configured_effort():
	"""The orchestrator effort that n8n uses for N8N_INSTANCE_AI_MODEL, with the rules of
	packages/@n8n/instance-ai/src/agent/apply-agent-thinking.ts. n8n does not report the effort, so this
	reads the settings that the server reads. None when the provider has no fixed effort."""
	model = (setting('N8N_INSTANCE_AI_MODEL') or DEFAULT_INSTANCE_AI_MODEL).lower()
	provider = model.split('/', 1)[0] if '/' in model else ''
	effort = (setting('N8N_INSTANCE_AI_REASONING_EFFORT') or '').strip().lower()
	if provider in ('anthropic', 'google-vertex-anthropic'):
		return effort if effort in ANTHROPIC_EFFORTS else 'medium'
	if provider in ('custom', 'moonshotai'):
		if effort in CUSTOM_EFFORTS:
			return effort
		return next((e for match, e in CUSTOM_MODEL_EFFORTS if match in model), None)
	if provider == 'openai':
		return 'medium' if 'gpt-5.6' in model else 'high'
	if provider == 'xai' and 'grok-4.5' in model:
		return 'medium'
	return None


def now_iso():
	return datetime.now(timezone.utc).isoformat()


def local_time_zone():
	zone = os.environ.get('TZ')
	if zone:
		return zone
	link = os.path.realpath('/etc/localtime')
	return link.split('zoneinfo/', 1)[1] if 'zoneinfo/' in link else 'UTC'


def answer_questions(questions):
	answers = []
	for q in questions or []:
		options = q.get('options') or []
		if q.get('type') in ('single', 'multi') and options:
			answers.append({'questionId': q['id'], 'selectedOptions': [options[0]]})
		elif q.get('required'):
			answers.append({'questionId': q['id'], 'selectedOptions': [], 'customText': DEFAULT_TEXT_ANSWER})
		else:
			answers.append({'questionId': q['id'], 'selectedOptions': [], 'skipped': True})
	return {'kind': 'questions', 'answers': answers}


def decide(payload):
	"""Return (confirm body, short label) for one confirmation-request payload."""
	input_type = payload.get('inputType') or 'approval'
	if payload.get('credentialDestination'):
		origin = payload['credentialDestination'].get('origin')
		return {'kind': 'credentialDestination', 'origin': origin, 'approved': False}, 'defer credential destination'
	if payload.get('setupRequests') or payload.get('credentialRequests') or payload.get('credentialFlow'):
		return {'kind': 'approval', 'approved': False}, 'defer setup'
	if payload.get('domainAccess'):
		return {'kind': 'domainAccessApprove', 'domainAccessAction': 'allow_once'}, 'allow domain once'
	if payload.get('mcpConnectRequest'):
		return {'kind': 'mcpConnect', 'approved': False}, 'deny MCP connect'
	if input_type == 'resource-decision':
		return {'kind': 'resourceDecision', 'resourceDecision': 'denyOnce'}, 'deny local resource'
	if input_type == 'questions':
		return answer_questions(payload.get('questions')), 'answer questions'
	if input_type == 'text':
		return {'kind': 'approval', 'approved': True, 'userInput': DEFAULT_TEXT_ANSWER}, 'answer text'
	return {'kind': 'approval', 'approved': True}, f'approve {input_type}'


def read_stream(client, thread_id, out_queue, stop):
	try:
		res = client.open_stream(f'/rest/instance-ai/events/{thread_id}')
	except Exception as e:
		out_queue.put(('error', str(e)))
		return
	out_queue.put(('open', None))
	data_lines, event_name = [], None
	while not stop.is_set():
		raw = res.readline()
		if not raw:
			out_queue.put(('closed', None))
			return
		line = raw.decode(errors='replace').rstrip('\r\n')
		if line == '':
			if data_lines:
				try:
					out_queue.put(('event', (event_name, json.loads('\n'.join(data_lines)))))
				except json.JSONDecodeError:
					pass
			data_lines, event_name = [], None
		elif line.startswith('data:'):
			data_lines.append(line[5:].lstrip())
		elif line.startswith('event:'):
			event_name = line[6:].strip()


def collect_workflow_ids(value, found):
	text = json.dumps(value)
	for match in re.finditer(r'"workflowId"\s*:\s*"([A-Za-z0-9]{10,})"', text):
		if match.group(1) not in found:
			found.append(match.group(1))


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--out', required=True)
	ap.add_argument('--prompt-file', required=True)
	ap.add_argument('--timeout-min', type=float, default=30)
	args = ap.parse_args()

	out = Path(args.out)
	out.mkdir(parents=True, exist_ok=True)
	prompt = Path(args.prompt_file).read_text().strip()

	# The recorder signs in while the event stream opens, so the video starts soon after the prompt.
	recorder = Recorder(out)
	client = N8nClient().login()
	thread_id = str(uuid.uuid4())
	events_file = (out / 'events.jsonl').open('w')
	q, stop = queue.Queue(), threading.Event()
	threading.Thread(target=read_stream, args=(client, thread_id, q, stop), daemon=True).start()

	kind, detail = q.get(timeout=30)
	if kind != 'open':
		sys.exit(f'Event stream did not open: {detail}')

	project = client.request('GET', '/rest/projects/personal')
	client.request('POST', '/rest/instance-ai/threads',
	               {'threadId': thread_id, 'projectId': project['id'], 'source': 'assistant_page'})

	if recorder.proc and not recorder.wait_for('ready', 60):
		print(f'recording failed to start, see {out / "record.log"}', flush=True)
		recorder.proc.kill()
		recorder.proc = None

	started_at = now_iso()
	chat = client.request('POST', f'/rest/instance-ai/chat/{thread_id}',
	                      {'message': prompt, 'timeZone': local_time_zone()})
	print(f'thread {thread_id} run {chat.get("runId") if isinstance(chat, dict) else chat}', flush=True)
	thread_url = f'{client.base_url}/instance-ai/{thread_id}'
	# The UI shows the user message only after the chat request, so the recorder opens the thread now.
	recorder.send(f'open {thread_url}')
	print(f'watch: {thread_url}', flush=True)
	open_url(thread_url)

	workflow_ids, decisions, langsmith_run_ids = [], [], []
	# The idle wait after run-finish is the runner's, so the run ends at the last run-finish.
	saw_finish, idle_since, finish_ts = False, None, None
	deadline = time.time() + args.timeout_min * 60
	while time.time() < deadline:
		try:
			kind, detail = q.get(timeout=5)
		except queue.Empty:
			kind, detail = 'tick', None

		if kind == 'event':
			_, event = detail
			events_file.write(json.dumps(event) + '\n')
			events_file.flush()
			etype, payload = event.get('type'), event.get('payload') or {}
			if etype == 'run-start':
				if payload.get('langsmithRunId'):
					langsmith_run_ids.append(payload['langsmithRunId'])
				idle_since, finish_ts = None, None
			elif etype == 'run-finish':
				saw_finish = True
				finish_ts = event.get('ts') or time.time() * 1000
				print(f'run-finish {payload.get("status", "")}', flush=True)
			elif etype == 'tool-call':
				print(f'tool {payload.get("toolName")}', flush=True)
			elif etype in ('tool-result', 'confirmation-request'):
				collect_workflow_ids(payload, workflow_ids)
			if etype == 'confirmation-request':
				body, label = decide(payload)
				try:
					client.request('POST', f'/rest/instance-ai/confirm/{payload["requestId"]}', body)
					ok = True
				except RuntimeError as e:
					ok = False
					label += f' (failed: {e})'
				decisions.append({'at': now_iso(), 'toolName': payload.get('toolName'),
				                  'message': payload.get('message'), 'decision': label, 'ok': ok})
				print(f'confirm: {label} [{payload.get("toolName")}]', flush=True)
		elif kind in ('closed', 'error'):
			print(f'event stream {kind}: {detail or ""}', flush=True)

		if saw_finish:
			status = client.request('GET', f'/rest/instance-ai/threads/{thread_id}/status')
			running = [t for t in status.get('backgroundTasks', []) if t.get('status') == 'running']
			if status.get('hasActiveRun') or status.get('isSuspended') or running:
				idle_since = None
			elif idle_since is None:
				idle_since = time.time()
			elif time.time() - idle_since > 10:
				break
	else:
		print('timeout: the thread did not go idle', flush=True)

	finished_at = (datetime.fromtimestamp(finish_ts / 1000, timezone.utc).isoformat() if finish_ts
	               else now_iso())
	# Background tasks can still call the LLM after run-finish, so the usage window ends at idle.
	usage_finished_at = now_iso()
	stop.set()
	events_file.close()
	recorder.stop()

	trace = {}
	for key, path in (
		('rich', f'/threads/{thread_id}/messages?limit=200'),
		('raw', f'/threads/{thread_id}/messages?limit=200&raw=true'),
		('thread', f'/threads/{thread_id}'),
		('debug', f'/debug/threads/{thread_id}/runs'),
	):
		try:
			trace[key] = client.request('GET', '/rest/instance-ai' + path)
		except RuntimeError as e:
			trace[key] = None
			print(f'export {key} failed: {str(e)[:200]}', flush=True)
	(out / 'trace.json').write_text(json.dumps(trace, indent=1))

	meta = {
		'kind': 'instance-ai',
		'threadId': thread_id,
		'startedAt': started_at,
		'finishedAt': finished_at,
		'usageFinishedAt': usage_finished_at,
		'workflowIds': workflow_ids,
		'workflowId': workflow_ids[-1] if workflow_ids else None,
		'langsmithRunIds': langsmith_run_ids,
		'decisions': decisions,
		'effort': configured_effort(),
		'effortSource': 'n8n settings (N8N_INSTANCE_AI_MODEL, N8N_INSTANCE_AI_REASONING_EFFORT)',
		'threadUrl': thread_url,
		'screen': 'screen.webm' if (out / 'screen.webm').exists() else None,
	}
	(out / 'run.json').write_text(json.dumps(meta, indent=2))
	print(json.dumps({k: meta[k] for k in ('threadId', 'workflowId', 'startedAt', 'finishedAt')}, indent=2))


if __name__ == '__main__':
	main()
