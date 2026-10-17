#!/usr/bin/env python3
"""Run one prompt through Claude Code or Codex with only the n8n MCP server.

  run_cli_builder.py --builder claude --out <run-dir>/claude --prompt-file <run-dir>/prompt.txt
  run_cli_builder.py --builder codex  --out <run-dir>/codex  --prompt-file <run-dir>/prompt.txt

Isolation modes:
  container  (default) Docker container. The only mount is the output directory.
             The builder cannot see host files, skills, memory or settings.
  clean      Claude only. A clean process with an empty config directory, no built-in
             tools and only the n8n MCP server. It needs an API key, not a subscription login.

Secrets: the model key and the MCP token go through environment variables only.
They are never written to a file or put on a command line.
"""

import argparse
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

from live import open_log_window
from n8n_api import DEFAULT_BASE_URL, load_token, setting

SKILL_DIR = Path(__file__).resolve().parents[1]
IMAGE = 'n8n-builder-sandbox'
# The builder-specific name comes first, so the CLI can use a different key than
# the ANTHROPIC_API_KEY or OPENAI_API_KEY that the instance reads from .env.local.
KEY_SETTINGS = {'claude': ['CLAUDE_API_KEY', 'ANTHROPIC_API_KEY'], 'codex': ['CODEX_API_KEY', 'OPENAI_API_KEY']}


def now_iso():
	return datetime.now(timezone.utc).isoformat()


def ensure_image(rebuild):
	exists = subprocess.run(['docker', 'image', 'inspect', IMAGE], capture_output=True).returncode == 0
	if exists and not rebuild:
		return
	print(f'building docker image {IMAGE}', flush=True)
	subprocess.run(['docker', 'build', '-t', IMAGE, str(SKILL_DIR / 'sandbox')], check=True)


def mcp_url(base_url, isolation):
	if isolation != 'container':
		return f'{base_url}/mcp-server/http'
	parsed = urlparse(base_url)
	port = parsed.port or (443 if parsed.scheme == 'https' else 80)
	host = 'host.docker.internal' if parsed.hostname in ('localhost', '127.0.0.1') else parsed.hostname
	return f'{parsed.scheme}://{host}:{port}/mcp-server/http'


def claude_args(prompt, model, config_path):
	args = [
		'claude', '-p', prompt,
		'--bare', '--strict-mcp-config', '--mcp-config', config_path,
		'--tools', '', '--allowedTools', 'mcp__n8n',
		'--disable-slash-commands', '--output-format', 'stream-json', '--verbose',
	]
	if model:
		args += ['--model', model]
	return args


def codex_args(prompt, model):
	args = ['codex', 'exec', '--json', '--skip-git-repo-check', '--sandbox', 'read-only']
	if model:
		args += ['--model', model]
	return args + [prompt]


def write_codex_config(home, url):
	codex_home = home / '.codex'
	codex_home.mkdir(parents=True, exist_ok=True)
	(codex_home / 'config.toml').write_text(
		'approval_policy = "never"\n'
		'\n[mcp_servers.n8n]\n'
		f'url = "{url}"\n'
		'bearer_token_env_var = "N8N_MCP_TOKEN"\n'
	)


def live_line(builder, event):
	"""One short terminal line for an interesting stream event, or None."""
	if builder == 'claude':
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
	"""Detailed, colored lines for live.log, the file that the live terminal window follows."""
	lines = []
	if builder == 'claude':
		content = (event.get('message') or {}).get('content')
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


def find_session_file(builder, home, session_id):
	if builder == 'claude':
		root = home / '.claude' / 'projects'
		matches = list(root.rglob(f'{session_id}.jsonl')) if session_id else list(root.rglob('*.jsonl'))
	else:
		matches = list((home / '.codex' / 'sessions').rglob('rollout-*.jsonl'))
	matches.sort(key=lambda p: p.stat().st_mtime)
	return matches[-1] if matches else None


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--builder', choices=['claude', 'codex'], required=True)
	ap.add_argument('--out', required=True)
	ap.add_argument('--prompt-file', required=True)
	ap.add_argument('--isolation', choices=['container', 'clean'],
	                default=setting('COMPARE_ISOLATION', default='container'))
	ap.add_argument('--model', help='Model id. Default: CLAUDE_MODEL or CODEX_MODEL, else the CLI default.')
	ap.add_argument('--key-env', help='Name of the setting with the model API key.')
	ap.add_argument('--rebuild-image', action='store_true')
	ap.add_argument('--timeout-min', type=float, default=30)
	args = ap.parse_args()

	if args.builder == 'codex' and args.isolation != 'container':
		sys.exit('Codex runs only in a container. Its shell tool can read the host disk.')

	prefix = args.builder.upper()
	args.model = args.model or setting(f'{prefix}_MODEL')
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

	child_env = {'N8N_MCP_TOKEN': token}
	if args.builder == 'claude':
		child_env['ANTHROPIC_API_KEY'] = api_key
		(out / 'mcp.json').write_text(json.dumps({'mcpServers': {'n8n': {
			'type': 'http', 'url': url, 'headers': {'Authorization': 'Bearer ${N8N_MCP_TOKEN}'},
		}}}))
	else:
		child_env['OPENAI_API_KEY'] = api_key
		child_env['CODEX_API_KEY'] = api_key
		write_codex_config(home, url)

	if args.isolation == 'container':
		ensure_image(args.rebuild_image)
		inner_home = '/out/home'
		cmd = [
			'docker', 'run', '--rm', '-i', '--name', container,
			'--user', f'{os.getuid()}:{os.getgid()}',
			'--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
			'--read-only', '--tmpfs', '/tmp',
			'--add-host', 'host.docker.internal:host-gateway',
			'-v', f'{out}:/out', '-w', '/out/work',
			'-e', f'HOME={inner_home}',
			'-e', f'CLAUDE_CONFIG_DIR={inner_home}/.claude',
			'-e', f'CODEX_HOME={inner_home}/.codex',
		]
		# `-e NAME` without a value copies the value from this process, so secrets stay off argv.
		for name in child_env:
			cmd += ['-e', name]
		cmd.append(IMAGE)
		cmd += claude_args(prompt, args.model, '/out/mcp.json') if args.builder == 'claude' else codex_args(prompt, args.model)
		run_env = {**os.environ, **child_env}
		cwd = None
	else:
		if not shutil.which('claude'):
			sys.exit('claude is not on PATH.')
		cmd = claude_args(prompt, args.model, str(out / 'mcp.json'))
		run_env = {
			'PATH': os.environ.get('PATH', '/usr/bin:/bin'),
			'HOME': str(home),
			'CLAUDE_CONFIG_DIR': str(home / '.claude'),
			'DISABLE_AUTOUPDATER': '1',
			'DISABLE_TELEMETRY': '1',
			**child_env,
		}
		cwd = str(work)

	started_at = now_iso()
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

	session_file = find_session_file(args.builder, home, session_id)
	meta = {
		'kind': args.builder,
		'isolation': args.isolation,
		'model': args.model,
		'startedAt': started_at,
		'finishedAt': now_iso(),
		'exitCode': proc.returncode,
		'sessionId': session_id,
		'sessionFile': str(session_file.relative_to(out)) if session_file else None,
		'workflowIds': workflow_ids,
		'workflowId': workflow_ids[-1] if workflow_ids else None,
		'reportedCostUsd': (result or {}).get('total_cost_usd'),
	}
	(out / 'run.json').write_text(json.dumps(meta, indent=2))
	print(json.dumps({k: meta[k] for k in ('exitCode', 'sessionId', 'workflowId', 'sessionFile')}, indent=2))
	if proc.returncode:
		print(f'see {out / "stderr.log"}', flush=True)


if __name__ == '__main__':
	main()
