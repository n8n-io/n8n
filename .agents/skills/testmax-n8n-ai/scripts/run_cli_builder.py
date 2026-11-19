#!/usr/bin/env python3
"""Run one prompt through Claude Code or Codex with only the n8n MCP server.

  run_cli_builder.py --builder claude --out <run-dir>/claude --prompt-file <run-dir>/prompt.txt
  run_cli_builder.py --builder codex  --out <run-dir>/codex  --prompt-file <run-dir>/prompt.txt

Isolation modes:
  container  (default) Docker container. The only mount is the output directory.
             The builder cannot see host files, skills, memory or settings.
  clean      Claude only. A clean process with an empty config directory, no built-in
             tools and only the n8n MCP server. It needs an API key, not a subscription login.

Screen modes:
  interactive  (default in a container) The normal terminal screen of the CLI runs in tmux.
               screen.cast records the exact screen, and a terminal window can watch it live.
               The trace comes from the session file of the CLI.
  headless     `claude -p` or `codex exec` with a JSON event stream. Clean isolation uses this mode.

Secrets: the model key and the MCP token go through environment variables only.
They are never written to a file or put on a command line.

Codex sends its model requests through a local recorder (request_recorder.py), which writes the
request bodies, but not the headers, to requests.jsonl. Set COMPARE_RECORD_REQUESTS=0 to turn it off.
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from live import enabled as live_enabled
from live import open_log_window, open_terminal
from n8n_api import DEFAULT_BASE_URL, load_token, setting
from request_recorder import RequestRecorder

SKILL_DIR = Path(__file__).resolve().parents[1]
IMAGE = 'n8n-builder-sandbox'
# The builder-specific name comes first, so the CLI can use a different key than
# the ANTHROPIC_API_KEY or OPENAI_API_KEY that the instance reads from .env.local.
KEY_SETTINGS = {'claude': ['CLAUDE_API_KEY', 'ANTHROPIC_API_KEY'], 'codex': ['CODEX_API_KEY', 'OPENAI_API_KEY']}
# Codex features that add tools or downloads beyond the n8n MCP server. shell_snapshot is off
# because it writes the environment, with the API key, to a file.
CODEX_FEATURES_OFF = ['apps', 'browser_use', 'browser_use_external', 'computer_use', 'image_generation',
                      'in_app_browser', 'plugins', 'remote_plugin', 'shell_snapshot']
SCREEN = {'cols': 120, 'rows': 36}
OPENAI_BASE_URL = 'https://api.openai.com/v1'
# Interactive mode: the variable that the CLI reads the model key from.
SANDBOX_KEY = {'claude': 'CLAUDE_SANDBOX_KEY', 'codex': 'CODEX_SANDBOX_KEY'}
IDLE_LIMIT_S = 600


def now_iso():
	return datetime.now(timezone.utc).isoformat()


def ensure_image(rebuild):
	# The label holds a hash of the Dockerfile, so an edit to the Dockerfile rebuilds the image.
	digest = hashlib.sha256((SKILL_DIR / 'sandbox' / 'Dockerfile').read_bytes()).hexdigest()[:16]
	found = subprocess.run(['docker', 'image', 'inspect', '--format',
	                        '{{index .Config.Labels "dockerfile-sha"}}', IMAGE], capture_output=True, text=True)
	if found.returncode == 0 and found.stdout.strip() == digest and not rebuild:
		return
	print(f'building docker image {IMAGE}', flush=True)
	subprocess.run(['docker', 'build', '--label', f'dockerfile-sha={digest}', '-t', IMAGE,
	                str(SKILL_DIR / 'sandbox')], check=True)


def mcp_url(base_url, isolation):
	if isolation != 'container':
		return f'{base_url}/mcp-server/http'
	parsed = urlparse(base_url)
	port = parsed.port or (443 if parsed.scheme == 'https' else 80)
	host = 'host.docker.internal' if parsed.hostname in ('localhost', '127.0.0.1') else parsed.hostname
	return f'{parsed.scheme}://{host}:{port}/mcp-server/http'


def claude_tool_args(tools):
	# 'default' gives the normal Claude Code tools, all allowed without a question, like Codex in the
	# container. Only a container may use it, because Bash and Write can change the files they see.
	if tools == 'default':
		return ['--permission-mode', 'bypassPermissions']
	# dontAsk allows the pre-approved n8n tools and denies the rest without a prompt.
	return ['--tools', '', '--allowedTools', 'mcp__n8n', '--permission-mode', 'dontAsk']


def claude_args(prompt, model, config_path, bare, tools='none'):
	# --bare also replaces the system prompt with a minimal one. A container already isolates the CLI,
	# so only the clean mode, which runs on the host, uses it.
	args = [
		'claude', '-p', prompt, *(['--bare'] if bare else []),
		'--strict-mcp-config', '--mcp-config', config_path, *claude_tool_args(tools),
		'--disable-slash-commands', '--output-format', 'stream-json', '--verbose',
	]
	if model:
		args += ['--model', model]
	return args


def claude_interactive_args(model, tools='none'):
	args = [
		'claude', '--strict-mcp-config', '--mcp-config', '/out/mcp.json', *claude_tool_args(tools),
		'--disable-slash-commands', '--settings', '/out/.screen/claude-settings.json',
	]
	if model:
		args += ['--model', model]
	return args


def codex_args(prompt, model):
	args = ['codex', 'exec', '--json', '--skip-git-repo-check', '--sandbox', 'read-only']
	if model:
		args += ['--model', model]
	return args + [prompt]


def codex_interactive_args(model):
	# The background app server needs `ps`, which the slim image does not have.
	args = ['codex', '--no-daemon']
	if model:
		args += ['--model', model]
	return args


def codex_effort_setting():
	return setting('CODEX_REASONING_EFFORT', default='medium')


def run_effort(builder, session_file, out):
	"""The reasoning effort that the model got: from the session file for Claude Code, and from the
	recorded request for Codex. Without a recorded request, the Codex effort is the configured one."""
	if builder == 'claude':
		if session_file and session_file.exists():
			for line in reversed(session_file.read_text().splitlines()):
				try:
					row = json.loads(line)
				except json.JSONDecodeError:
					continue
				if row.get('type') == 'assistant' and row.get('effort'):
					return row['effort'], 'session file'
		return None, None
	requests = out / 'requests.jsonl'
	if requests.exists():
		for line in requests.read_text().splitlines():
			try:
				body = json.loads(line)
			except json.JSONDecodeError:
				continue
			effort = ((body.get('body', body)).get('reasoning') or {}).get('effort')
			if effort:
				return effort, 'model request'
	return codex_effort_setting(), 'CODEX_REASONING_EFFORT'


def write_codex_config(home, url, key_env=None, api_base=OPENAI_BASE_URL):
	"""Write config.toml. With key_env, a provider reads the key from that variable, so the
	interactive screen does not ask for a sign-in and no key is stored in auth.json."""
	codex_home = home / '.codex'
	codex_home.mkdir(parents=True, exist_ok=True)
	lines = ['approval_policy = "never"', 'sandbox_mode = "read-only"',
	         f'model_reasoning_effort = "{codex_effort_setting()}"']
	if key_env:
		lines.append('model_provider = "sandbox-openai"')
	lines += ['', '[features]'] + [f'{name} = false' for name in CODEX_FEATURES_OFF]
	if key_env:
		lines += ['', '[model_providers.sandbox-openai]', 'name = "OpenAI"',
		          f'base_url = "{api_base}"', f'env_key = "{key_env}"', 'wire_api = "responses"']
	lines += ['', '[projects."/out/work"]', 'trust_level = "trusted"',
	          '', '[mcp_servers.n8n]', f'url = "{url}"', 'bearer_token_env_var = "N8N_MCP_TOKEN"', '']
	(codex_home / 'config.toml').write_text('\n'.join(lines))


def write_claude_interactive_config(out, home, tools):
	# Skip the first-run screens: theme, onboarding and the folder trust question.
	(home / '.claude' / '.claude.json').write_text(json.dumps({
		'hasCompletedOnboarding': True, 'theme': 'dark',
		'projects': {'/out/work': {'hasTrustDialogAccepted': True, 'hasCompletedProjectOnboarding': True}},
	}))
	# With ANTHROPIC_API_KEY the screen asks to confirm the key and shows part of it.
	# apiKeyHelper reads the key from the environment without that question.
	settings = {'apiKeyHelper': f'printenv {SANDBOX_KEY["claude"]}'}
	if tools == 'default':
		# The bypass-mode warning screen also has a ❯ marker, so the prompt would answer "No, exit".
		settings['skipDangerousModePermissionPrompt'] = True
	(out / '.screen' / 'claude-settings.json').write_text(json.dumps(settings))


def live_line(builder, event):
	"""One short terminal line for an interesting stream event, or None."""
	if builder == 'claude':
		if event.get('subtype') == 'permission_denied':
			return f'denied {event.get("tool_name")}'
		if event.get('type') == 'assistant':
			for block in (event.get('message') or {}).get('content') or []:
				if block.get('type') == 'tool_use':
					return f'tool {block.get("name")}'
				if block.get('type') == 'text' and block.get('text', '').strip():
					return 'text ' + block['text'].strip().splitlines()[0][:120]
		if event.get('type') == 'result':
			return f'result {event.get("subtype")} turns={event.get("num_turns")}'
	else:
		item = event.get('item') or {}
		if event.get('type') == 'item.started' and item.get('type') == 'mcp_tool_call':
			return f'tool {item.get("server")}.{item.get("tool")}'
		if event.get('type') == 'item.completed' and item.get('type') == 'agent_message':
			return 'text ' + (item.get('text') or '').strip()[:120]
		if event.get('type') in ('turn.completed', 'turn.failed', 'error'):
			return event['type']
	return None


def session_lines(builder, row):
	"""Short terminal lines for one session-file row, and the end state: None, 'done' or 'error'."""
	lines = []
	if builder == 'claude':
		if row.get('type') != 'assistant':
			return lines, None
		msg = row.get('message') or {}
		for block in msg.get('content') or []:
			if block.get('type') == 'tool_use':
				lines.append(f'tool {block.get("name")}')
			elif block.get('type') == 'text' and block.get('text', '').strip():
				lines.append('text ' + block['text'].strip().splitlines()[0][:120])
		if row.get('isApiErrorMessage'):
			return lines, 'error'
		return lines, 'done' if msg.get('stop_reason') == 'end_turn' else None
	payload = row.get('payload') or {}
	if row.get('type') != 'event_msg':
		return lines, None
	kind, item = payload.get('type'), payload.get('item') or {}
	if kind == 'item_completed' and item.get('type') == 'McpToolCall':
		lines.append(f'tool {item.get("server")}.{item.get("tool")}')
	elif kind == 'item_completed' and item.get('type') == 'AgentMessage':
		text = ' '.join(c.get('text', '') for c in item.get('content') or [] if isinstance(c, dict))
		lines.append('text ' + text.strip()[:120])
	elif kind == 'error':
		lines.append(f'error {str(payload.get("message"))[:200]}')
	return lines, {'task_complete': 'done', 'turn_aborted': 'error'}.get(kind)


BOLD, DIM, CYAN, GREEN, RED, RESET = '\033[1m', '\033[2m', '\033[36m', '\033[32m', '\033[31m', '\033[0m'
LABELS = {'claude': 'Claude Code + n8n MCP', 'codex': 'Codex + n8n MCP'}


def short(value, limit=400):
	"""Readable one-line text for a tool input or result."""
	if isinstance(value, dict) and isinstance(value.get('content'), list):
		value = value['content']
	if isinstance(value, list) and all(isinstance(v, dict) and 'text' in v for v in value):
		value = ' '.join(v['text'] for v in value)
	text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
	text = ' '.join(text.split())
	return text if len(text) <= limit else text[:limit] + ' …'


def log_entries(builder, event):
	"""Detailed, colored lines for live.log, the file that the headless live window follows."""
	lines = []
	if builder == 'claude':
		# A permission_denied event has a string message, not an API message.
		if event.get('subtype') == 'permission_denied':
			lines.append(f'{RED}denied {event.get("tool_name")}{RESET}')
		message = event.get('message')
		content = message.get('content') if isinstance(message, dict) else None
		for block in content if isinstance(content, list) else []:
			kind = block.get('type')
			if kind == 'thinking' and block.get('thinking', '').strip():
				lines.append(f'{DIM}thinking: {short(block["thinking"], 600)}{RESET}')
			elif kind == 'text' and block.get('text', '').strip():
				lines.append(block['text'].strip())
			elif kind == 'tool_use':
				name = block.get('name', '').removeprefix('mcp__n8n__')
				lines.append(f'{BOLD}{CYAN}→ {name}{RESET} {short(block.get("input"))}')
			elif kind == 'tool_result':
				color = RED if block.get('is_error') else DIM
				lines.append(f'{color}← {short(block.get("content"))}{RESET}')
		if event.get('type') == 'result':
			cost = event.get('total_cost_usd')
			lines.append(f'{GREEN}done: {event.get("subtype")}, {event.get("num_turns")} turns'
			             + (f', ${cost:.2f} (Claude Code estimate)' if cost is not None else '') + RESET)
	else:
		item, etype = event.get('item') or {}, event.get('type')
		kind = item.get('type')
		if etype == 'item.started' and kind == 'mcp_tool_call':
			lines.append(f'{BOLD}{CYAN}→ {item.get("tool")}{RESET} {short(item.get("arguments"))}')
		elif etype == 'item.completed' and kind == 'mcp_tool_call':
			if item.get('error'):
				lines.append(f'{RED}← {short(item["error"])}{RESET}')
			else:
				lines.append(f'{DIM}← {short(item.get("result"))}{RESET}')
		elif etype == 'item.completed' and kind == 'reasoning' and item.get('text'):
			lines.append(f'{DIM}thinking: {short(item["text"], 600)}{RESET}')
		elif etype == 'item.completed' and kind == 'agent_message' and item.get('text'):
			lines.append(item['text'].strip())
		elif etype == 'turn.completed':
			lines.append(f'{GREEN}done: turn completed{RESET}')
		elif etype in ('turn.failed', 'error'):
			lines.append(f'{RED}{etype}: {short(event.get("error") or event.get("message"))}{RESET}')
	return lines


WORKFLOW_ID = re.compile(r'(?:workflowId|WORKFLOW_ID)\\*"?\s*[:=]\s*\\*"?([A-Za-z0-9]{10,})')


def session_candidates(builder, home):
	if builder == 'claude':
		# Subagent transcripts are in deeper folders. The main session is at projects/<cwd>/<id>.jsonl.
		root = home / '.claude' / 'projects'
		return list(root.glob('*/*.jsonl')) if root.exists() else []
	root = home / '.codex' / 'sessions'
	return list(root.rglob('rollout-*.jsonl')) if root.exists() else []


def find_session_file(builder, home, session_id=None):
	matches = session_candidates(builder, home)
	if session_id:
		matches = [p for p in matches if session_id in p.name] or matches
	matches.sort(key=lambda p: p.stat().st_mtime)
	return matches[-1] if matches else None


class SessionReader:
	"""Reads the rows that the CLI appends to its session file."""

	def __init__(self, builder, home):
		self.builder, self.home, self.path, self.offset = builder, home, None, 0

	def rows(self):
		self.path = self.path or find_session_file(self.builder, self.home)
		if not self.path:
			return []
		with self.path.open('rb') as f:
			f.seek(self.offset)
			data = f.read()
		end = data.rfind(b'\n') + 1
		self.offset += end
		rows = []
		for line in data[:end].splitlines():
			try:
				rows.append(json.loads(line))
			except json.JSONDecodeError:
				continue
		return rows


def turn_span(builder, session_file):
	"""Start and end of the model turn in the session file, without container start-up, the prompt paste
	wait and shutdown. (None, None) when the file has no turn."""
	if not session_file or not session_file.exists():
		return None, None
	rows = []
	for line in session_file.read_text().splitlines():
		try:
			rows.append(json.loads(line))
		except json.JSONDecodeError:
			continue
	if builder == 'claude':
		users = [r['timestamp'] for r in rows if r.get('type') == 'user' and r.get('timestamp')]
		replies = [r['timestamp'] for r in rows if r.get('type') == 'assistant' and r.get('timestamp')]
		return (users[0], replies[-1]) if users and replies else (None, None)
	starts = [r['timestamp'] for r in rows
	          if r.get('type') == 'event_msg' and (r.get('payload') or {}).get('type') == 'task_started']
	ends = [r['timestamp'] for r in rows
	        if r.get('type') == 'event_msg' and (r.get('payload') or {}).get('type') == 'task_complete']
	return (starts[0], ends[-1]) if starts and ends else (None, None)


def docker_command(container, out, env_names):
	cmd = [
		'docker', 'run', '--rm', '-i', '--name', container,
		'--user', f'{os.getuid()}:{os.getgid()}',
		'--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
		'--read-only', '--tmpfs', '/tmp',
		'--add-host', 'host.docker.internal:host-gateway',
		'-v', f'{out}:/out', '-w', '/out/work',
		'-e', 'HOME=/out/home',
		'-e', 'CLAUDE_CONFIG_DIR=/out/home/.claude',
		'-e', 'CODEX_HOME=/out/home/.codex',
		'-e', 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1',
		'-e', 'COLORTERM=truecolor',
	]
	# `-e NAME` without a value copies the value from this process, so secrets stay off argv.
	for name in env_names:
		cmd += ['-e', name]
	return cmd + [IMAGE]


def check_no_secrets(out, secrets):
	"""Warn if a secret value ended up in a file of the run directory. Never prints the value."""
	needles = [s.encode() for s in secrets if s and len(s) >= 12]
	for path in out.rglob('*'):
		if not path.is_file() or path.stat().st_size > 50_000_000:
			continue
		data = path.read_bytes()
		if any(n in data for n in needles):
			print(f'WARNING: a secret value is in {path}. Delete the file before you share the run.', flush=True)


def run_headless(args, out, prompt, cmd, run_env, cwd, container):
	stream_path = out / 'stream.jsonl'
	session_id, workflow_ids, result, errors_in_row = None, [], None, 0
	live_log = (out / 'live.log').open('w', buffering=1)
	live_log.write(f'{BOLD}{LABELS[args.builder]}{RESET}  model: {args.model or "CLI default"}, '
	               f'isolation: {args.isolation}\n{DIM}prompt: {short(prompt, 600)}{RESET}\n\n')
	open_log_window(LABELS[args.builder], out / 'live.log')
	# The Codex stream has no timestamps, so stream.times keeps the arrival time of each line.
	with stream_path.open('w') as stream, (out / 'stream.times').open('w') as times, \
			(out / 'stderr.log').open('w') as err, live_log:
		proc = subprocess.Popen(cmd, env=run_env, cwd=cwd, stdin=subprocess.DEVNULL,
		                        stdout=subprocess.PIPE, stderr=err, text=True)
		watchdog = threading.Timer(args.timeout_min * 60, proc.kill)
		watchdog.start()
		for line in proc.stdout:
			try:
				event = json.loads(line)
			except json.JSONDecodeError:
				continue
			stream.write(line)
			stream.flush()
			times.write(f'{time.time():.3f}\n')
			if event.get('type') == 'system' and event.get('subtype') == 'init':
				session_id = event.get('session_id')
			if event.get('type') == 'thread.started':
				session_id = event.get('thread_id')
			if event.get('type') == 'result':
				result = event
			for match in WORKFLOW_ID.findall(line):
				if match not in workflow_ids:
					workflow_ids.append(match)
			text = live_line(args.builder, event)
			if text:
				print(f'[{args.builder}] {text}', flush=True)
			for entry in log_entries(args.builder, event):
				live_log.write(entry + '\n\n')
			errors_in_row = errors_in_row + 1 if event.get('type') == 'error' else 0
			if errors_in_row >= 10:
				print(f'[{args.builder}] stopped after 10 errors in a row: {event.get("message", "")[:200]}', flush=True)
				proc.kill()
				break
		proc.wait()
		if not watchdog.is_alive():
			print('timeout: killed the builder', flush=True)
		watchdog.cancel()
		if args.isolation == 'container':
			subprocess.run(['docker', 'kill', container], capture_output=True)
		live_log.write(f'{BOLD}=== finished, exit code {proc.returncode}. You can close this window. ==={RESET}\n')
	return {'exitCode': proc.returncode, 'sessionId': session_id, 'workflowIds': workflow_ids,
	        'reportedCostUsd': (result or {}).get('total_cost_usd')}


# The review screen of a picker with several tabs has no footer, only the submit question.
QUESTION_MARKERS = ('Enter to select', 'Ready to submit your answers?')
ANSWER_SETTLE_S = 2


class QuestionAnswerer:
	"""Answers a question picker on the CLI screen with its first option, like the Instance AI runner.

	The first option is the recommended one. A picker with several tabs gets one Enter per tab, then Submit.
	"""

	def __init__(self, container, log_path):
		self.container, self.log_path, self.answers, self.seen_at, self.last_screen = container, log_path, [], None, None

	def poll(self):
		screen = subprocess.run(['docker', 'exec', self.container, 'tmux', 'capture-pane', '-p', '-t', 'run'],
		                        capture_output=True, text=True).stdout
		if not any(marker in screen for marker in QUESTION_MARKERS):
			self.last_screen, self.seen_at = None, None
			return None
		# Wait until the picker stops changing, so a key press does not land while it draws.
		if screen != self.last_screen:
			self.last_screen, self.seen_at = screen, time.time()
			return None
		if time.time() - self.seen_at < ANSWER_SETTLE_S:
			return None
		subprocess.run(['docker', 'exec', self.container, 'tmux', 'send-keys', '-t', 'run', 'Enter'],
		               capture_output=True)
		question = QUESTION_MARKERS[1] if QUESTION_MARKERS[1] in screen else next(
			(l.strip() for l in screen.splitlines() if l.strip().endswith('?')), '')
		option = next((l.strip().lstrip('❯ ').strip() for l in screen.splitlines() if l.strip().startswith('❯ 1.')), '')
		self.answers.append({'at': time.time(), 'question': question, 'answer': option or 'first option'})
		self.log_path.write_text(json.dumps(self.answers, indent=2, ensure_ascii=False))
		self.last_screen, self.seen_at = None, None
		return f'answered "{question[:80]}" with "{option[:80] or "first option"}"'


def run_interactive(args, out, home, prompt, run_env, container):
	screen_dir = out / '.screen'
	argv = (claude_interactive_args(args.model, args.claude_tools) if args.builder == 'claude'
	        else codex_interactive_args(args.model))
	# Claude Code shows its input box before the MCP servers connect, so it waits a few seconds more.
	ready = {'claude': ('❯', 5000), 'codex': ('›', 2000)}[args.builder]
	(screen_dir / 'command.json').write_text(json.dumps(
		{'argv': argv, **SCREEN, 'input': prompt, 'readyText': ready[0], 'settleMs': ready[1]}))
	cmd = docker_command(container, out, [n for n in run_env if n in (SANDBOX_KEY[args.builder], 'N8N_MCP_TOKEN')])
	cmd += ['node', '/out/.screen/screen.mjs', 'run', '/out/.screen']

	reader, workflow_ids, state, timed_out = SessionReader(args.builder, home), [], None, False
	with (out / 'stderr.log').open('w') as err:
		proc = subprocess.Popen(cmd, env=run_env, stdin=subprocess.DEVNULL, stdout=err, stderr=err)
		for _ in range(120):
			if (screen_dir / 'screen.cast').exists() or proc.poll() is not None:
				break
			time.sleep(0.25)
		watch = f'docker exec -it {container} tmux attach -r -t run'
		if live_enabled() and not open_terminal(LABELS[args.builder], watch, SCREEN['cols'], SCREEN['rows']):
			print(f'watch {LABELS[args.builder]}: {watch}', flush=True)
		deadline, last_growth = time.time() + args.timeout_min * 60, time.time()
		answerer = QuestionAnswerer(container, out / 'answers.json') if args.isolation == 'container' else None
		while proc.poll() is None and not state:
			rows = reader.rows()
			if rows:
				last_growth = time.time()
			answered = answerer.poll() if answerer else None
			if answered:
				print(f'[{args.builder}] {answered}', flush=True)
				last_growth = time.time()
			for row in rows:
				lines, row_state = session_lines(args.builder, row)
				for line in lines:
					print(f'[{args.builder}] {line}', flush=True)
				for match in WORKFLOW_ID.findall(json.dumps(row)):
					if match not in workflow_ids:
						workflow_ids.append(match)
				state = state or row_state
			if time.time() > deadline:
				print('timeout: stopped the builder', flush=True)
				timed_out = True
				break
			if reader.path and time.time() - last_growth > IDLE_LIMIT_S:
				print(f'no progress for {IDLE_LIMIT_S // 60} minutes: stopped the builder', flush=True)
				timed_out = True
				break
			time.sleep(1)
		(screen_dir / 'stop').write_text('')
		try:
			proc.wait(timeout=30)
		except subprocess.TimeoutExpired:
			subprocess.run(['docker', 'kill', container], capture_output=True)
			proc.wait()
	for row in reader.rows():
		for match in WORKFLOW_ID.findall(json.dumps(row)):
			if match not in workflow_ids:
				workflow_ids.append(match)
	if (screen_dir / 'screen.cast').exists():
		shutil.move(screen_dir / 'screen.cast', out / 'screen.cast')
	# After a finished turn the driver stops tmux, so the exit code of the CLI means nothing.
	exited = screen_dir / 'exited'
	if state == 'done' and not timed_out:
		code = 0
	else:
		code = int(exited.read_text() or 1) if exited.exists() else 1
		code = code or 1
	session = reader.path
	return {'exitCode': code, 'sessionId': session.stem.split('rollout-')[-1] if session else None,
	        'workflowIds': workflow_ids, 'reportedCostUsd': None}


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--builder', choices=['claude', 'codex'], required=True)
	ap.add_argument('--out', required=True)
	ap.add_argument('--prompt-file', required=True)
	ap.add_argument('--isolation', choices=['container', 'clean'],
	                default=setting('COMPARE_ISOLATION', default='container'))
	ap.add_argument('--mode', choices=['interactive', 'headless'], default=setting('COMPARE_CLI_MODE'),
	                help='Default: interactive in a container, headless in clean isolation.')
	ap.add_argument('--model', help='Model id. Default: CLAUDE_MODEL or CODEX_MODEL, else the CLI default.')
	ap.add_argument('--key-env', help='Name of the setting with the model API key.')
	ap.add_argument('--claude-tools', choices=['none', 'default'],
	                default=setting('COMPARE_CLAUDE_TOOLS', default='none'),
	                help='none: only the n8n tools. default: also the built-in Claude Code tools, all allowed.')
	ap.add_argument('--rebuild-image', action='store_true')
	ap.add_argument('--timeout-min', type=float, default=30)
	args = ap.parse_args()

	if args.claude_tools not in ('none', 'default'):
		sys.exit(f'COMPARE_CLAUDE_TOOLS must be none or default, not {args.claude_tools!r}.')
	if args.builder == 'codex' and args.isolation != 'container':
		sys.exit('Codex runs only in a container. Its shell tool can read the host disk.')
	if args.isolation != 'container':
		args.mode = 'headless'
		if args.builder == 'claude' and args.claude_tools != 'none':
			print('[claude] clean isolation runs on the host, so COMPARE_CLAUDE_TOOLS=default is ignored.', flush=True)
			args.claude_tools = 'none'
	args.mode = args.mode or 'interactive'

	prefix = args.builder.upper()
	args.model = args.model or setting(f'{prefix}_MODEL')
	# Gateway-style ids such as anthropic/claude-opus-5-5 are not valid for the CLIs.
	provider = {'claude': 'anthropic/', 'codex': 'openai/'}[args.builder]
	if args.model and args.model.startswith(provider):
		args.model = args.model.removeprefix(provider)
	key_names = [args.key_env] if args.key_env else KEY_SETTINGS[args.builder]
	api_key = setting(*key_names)
	if not api_key:
		sys.exit(f'Set {" or ".join(key_names)} in .env.ai-surfaces, .env.local or the environment.')
	token = load_token()
	if not token:
		sys.exit('No MCP token. Run prepare.py first.')

	out = Path(args.out).resolve()
	if out.exists():
		shutil.rmtree(out)
	work, home = out / 'work', out / 'home'
	work.mkdir(parents=True)
	(home / '.claude').mkdir(parents=True)
	prompt = Path(args.prompt_file).read_text().strip()
	base_url = setting('N8N_BASE_URL', default=DEFAULT_BASE_URL).rstrip('/')
	url = mcp_url(base_url, args.isolation)
	container = f'cwb-{args.builder}-{int(time.time())}'
	interactive = args.mode == 'interactive'

	# Codex does not save the tools it sends to the model, so a local proxy records the request bodies.
	recorder = None
	if args.builder == 'codex' and setting('COMPARE_RECORD_REQUESTS', default='1') != '0':
		recorder = RequestRecorder(OPENAI_BASE_URL, out / 'requests.jsonl',
		                           setting('COMPARE_RECORDER_BIND', default='127.0.0.1')).start()
	api_base = recorder.base_url('host.docker.internal') if recorder else OPENAI_BASE_URL

	child_env = {'N8N_MCP_TOKEN': token}
	if args.builder == 'claude':
		(out / 'mcp.json').write_text(json.dumps({'mcpServers': {'n8n': {
			'type': 'http', 'url': url, 'headers': {'Authorization': 'Bearer ${N8N_MCP_TOKEN}'},
		}}}))
	if interactive:
		(out / '.screen').mkdir()
		shutil.copy(SKILL_DIR / 'sandbox' / 'screen.mjs', out / '.screen' / 'screen.mjs')
		child_env[SANDBOX_KEY[args.builder]] = api_key
		if args.builder == 'claude':
			write_claude_interactive_config(out, home, args.claude_tools)
		else:
			write_codex_config(home, url, SANDBOX_KEY['codex'], api_base)
	elif args.builder == 'claude':
		child_env['ANTHROPIC_API_KEY'] = api_key
	else:
		child_env['OPENAI_API_KEY'] = api_key
		child_env['CODEX_API_KEY'] = api_key
		write_codex_config(home, url, 'CODEX_API_KEY' if recorder else None, api_base)

	started_at = now_iso()
	if args.isolation == 'container':
		ensure_image(args.rebuild_image)
		run_env = {**os.environ, **child_env}
		try:
			if interactive:
				result = run_interactive(args, out, home, prompt, run_env, container)
			else:
				cmd = docker_command(container, out, child_env)
				cmd += (claude_args(prompt, args.model, '/out/mcp.json', False, args.claude_tools)
				        if args.builder == 'claude' else codex_args(prompt, args.model))
				result = run_headless(args, out, prompt, cmd, run_env, None, container)
		finally:
			if recorder:
				recorder.stop()
		if recorder and not recorder.count:
			print(f'[{args.builder}] the request recorder saw no requests, so the report has no Codex tools.', flush=True)
	else:
		if not shutil.which('claude'):
			sys.exit('claude is not on PATH.')
		run_env = {
			'PATH': os.environ.get('PATH', '/usr/bin:/bin'),
			'HOME': str(home),
			'CLAUDE_CONFIG_DIR': str(home / '.claude'),
			'DISABLE_AUTOUPDATER': '1',
			'DISABLE_TELEMETRY': '1',
			**child_env,
		}
		cmd = claude_args(prompt, args.model, str(out / 'mcp.json'), True)
		result = run_headless(args, out, prompt, cmd, run_env, str(work), container)

	session_file = find_session_file(args.builder, home, result['sessionId'])
	turn_started_at, turn_finished_at = turn_span(args.builder, session_file)
	effort, effort_source = run_effort(args.builder, session_file, out)
	meta = {
		'kind': args.builder,
		'isolation': args.isolation,
		'mode': args.mode,
		'model': args.model,
		**({'claudeTools': args.claude_tools} if args.builder == 'claude' else {}),
		'startedAt': started_at,
		'finishedAt': now_iso(),
		'turnStartedAt': turn_started_at,
		'turnFinishedAt': turn_finished_at,
		'effort': effort,
		'effortSource': effort_source,
		'exitCode': result['exitCode'],
		'sessionId': result['sessionId'],
		'sessionFile': str(session_file.relative_to(out)) if session_file else None,
		'workflowIds': result['workflowIds'],
		'workflowId': result['workflowIds'][-1] if result['workflowIds'] else None,
		'reportedCostUsd': result['reportedCostUsd'],
		'screen': 'screen.cast' if (out / 'screen.cast').exists() else None,
		'requests': 'requests.jsonl' if recorder and recorder.count else None,
	}
	(out / 'run.json').write_text(json.dumps(meta, indent=2))
	shutil.rmtree(home / '.codex' / 'shell_snapshots', ignore_errors=True)
	check_no_secrets(out, [api_key, token])
	print(json.dumps({k: meta[k] for k in ('exitCode', 'sessionId', 'workflowId', 'sessionFile', 'screen')}, indent=2))
	if meta['exitCode']:
		print(f'see {out / "stderr.log"}', flush=True)


if __name__ == '__main__':
	main()
