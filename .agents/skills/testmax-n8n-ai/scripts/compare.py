#!/usr/bin/env python3
"""Run the full comparison in one command, except the judge step.

  compare.py --prompt "..." --expected "..." [--title "..."] [--builders iai,claude,codex]
  compare.py --prompt-file p.txt --expected-file e.txt [--scenarios-file s.json]
  compare.py --rerun /tmp/builder-compare/<old-run>     same prompt, expected outcome and scenarios, new run

Steps: check the setup, run the builders at the same time (--sequential: one at a time),
fetch Instance AI usage, capture the canvases and their node issues, run each workflow with
pinned data (run_scenarios.py), run each workflow in process with recorded API requests
(run_wire.mjs), run the eval binary checks (binary_checks.mts), check the final-message claims
(claims.py), derive the deterministic checks (derive_checks.mjs), write
summary.txt and judge/summary-blind.txt for the judges, and build the report. A local page
shows the runs live (see live_server.py).
Settings come from .env.ai-surfaces (template: .env.ai-surfaces.example in the repository root).
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
import webbrowser
from datetime import datetime
from pathlib import Path

from live import enabled as live_enabled
from live import is_on, recording
from n8n_api import setting

HERE = Path(__file__).resolve().parent
RUNNERS = {'iai', 'claude', 'codex'}
PRINT_LOCK = threading.Lock()


def slug(text):
	words = re.findall(r'[a-z0-9]+', text.lower())[:5]
	return '-'.join(words) or 'run'


def step(title):
	with PRINT_LOCK:
		print(f'\n=== {title} ===', flush=True)


def run(cmd, log=None, prefix=None):
	"""Run a script, show its output, and keep a copy in log. Returns the exit code."""
	with subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, cwd=HERE) as proc:
		lines = []
		for line in proc.stdout:
			shown = line if not prefix or line.startswith(f'[{prefix}]') else f'[{prefix}] {line}'
			with PRINT_LOCK:
				print(shown, end='', flush=True)
			lines.append(line)
	if log:
		Path(log).write_text(''.join(lines))
	return proc.returncode


class Progress:
	"""Writes status.json, which the live page reads."""

	def __init__(self, run_dir, mode, builders, skipped, screens):
		self.path, self.lock = run_dir / 'status.json', threading.Lock()
		self.data = {
			'mode': mode, 'phase': 'running', 'step': 'Running the builders', 'startedAt': time.time(),
			'screens': screens,
			'builders': {**{b: {'status': 'waiting'} for b in builders},
			             **{b: {'status': 'skipped', 'reason': r} for b, r in skipped.items()}},
		}
		self.save()

	def save(self):
		tmp = self.path.with_suffix('.tmp')
		tmp.write_text(json.dumps(self.data, indent=2))
		os.replace(tmp, self.path)

	def update(self, **fields):
		with self.lock:
			self.data.update(fields)
			self.save()

	def builder(self, name, **fields):
		with self.lock:
			self.data['builders'][name].update(fields)
			self.save()

	def finish(self):
		with self.lock:
			for entry in self.data['builders'].values():
				if entry['status'] in ('waiting', 'running'):
					entry['status'] = 'failed'
			self.data.update(phase='done', step='Done', finishedAt=time.time())
			self.save()


def start_live_server(run_dir):
	"""Start live_server.py in the background. Returns its URL, or None."""
	url_file = run_dir / 'live-url.txt'
	url_file.unlink(missing_ok=True)
	log = (run_dir / 'live-server.log').open('w')
	# A new session, so the page still serves the final report after this script ends.
	subprocess.Popen([sys.executable, str(HERE / 'live_server.py'), '--run-dir', str(run_dir),
	                  '--parent-pid', str(os.getpid())],
	                 cwd=HERE, stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
	for _ in range(50):
		if url_file.exists() and url_file.read_text().strip():
			return url_file.read_text().strip()
		time.sleep(0.1)
	return None


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--prompt')
	ap.add_argument('--prompt-file')
	ap.add_argument('--expected')
	ap.add_argument('--expected-file')
	ap.add_argument('--title')
	ap.add_argument('--builders', default=setting('COMPARE_BUILDERS', default='iai,claude,codex'))
	ap.add_argument('--run-dir')
	ap.add_argument('--scenarios-file', help='Pinned-data scenarios for run_scenarios.py (see SKILL.md).')
	ap.add_argument('--rerun', help='Copy prompt.txt, case.json and scenarios.json from an earlier run directory.')
	ap.add_argument('--no-live', action='store_true', help='Do not start the live page.')
	ap.add_argument('--sequential', action='store_true', default=not is_on('COMPARE_PARALLEL'),
	                help='Run the builders one at a time. Default: COMPARE_PARALLEL=1 runs them at the same time.')
	args = ap.parse_args()
	if args.no_live:
		os.environ['COMPARE_LIVE'] = '0'

	if args.rerun:
		old = Path(args.rerun)
		prompt = (old / 'prompt.txt').read_text().strip()
		case = json.loads((old / 'case.json').read_text())
	else:
		prompt = args.prompt or (Path(args.prompt_file).read_text().strip() if args.prompt_file else None)
		expected = args.expected or (Path(args.expected_file).read_text().strip() if args.expected_file else None)
		if not prompt or not expected:
			sys.exit('Give a prompt and an expected outcome (--prompt/--prompt-file and --expected/--expected-file).')
		case = {'title': args.title or prompt[:60], 'expected': expected}
	builders = [b.strip() for b in args.builders.split(',') if b.strip()]
	unknown = set(builders) - RUNNERS
	if unknown:
		sys.exit(f'Unknown builders: {", ".join(sorted(unknown))}. Use iai, claude, codex.')

	root = Path(setting('COMPARE_RUNS_DIR', default='/tmp/builder-compare'))
	# The child scripts run from HERE, so a relative path must not reach them.
	run_dir = (Path(args.run_dir) if args.run_dir else root / f'{datetime.now():%Y%m%d-%H%M}-{slug(case["title"])}').resolve()
	run_dir.mkdir(parents=True, exist_ok=True)
	(run_dir / 'prompt.txt').write_text(prompt + '\n')
	(run_dir / 'case.json').write_text(json.dumps(case, indent=2))
	scenarios = Path(args.scenarios_file) if args.scenarios_file else (Path(args.rerun) / 'scenarios.json' if args.rerun else None)
	if scenarios and scenarios.exists():
		json.loads(scenarios.read_text())
		shutil.copy(scenarios, run_dir / 'scenarios.json')
	elif args.scenarios_file:
		sys.exit(f'No scenarios file at {scenarios}.')
	print(f'run directory: {run_dir}', flush=True)

	step('Check the setup')
	check = subprocess.run([sys.executable, 'prepare.py'], cwd=HERE, capture_output=True, text=True)
	print(check.stdout, end='')
	try:
		status = json.loads(check.stdout)
	except json.JSONDecodeError:
		sys.exit(check.stderr or 'prepare.py failed')
	if not status.get('login'):
		sys.exit('Cannot log in to n8n. Is it running? Check N8N_BASE_URL, N8N_EVAL_EMAIL and N8N_EVAL_PASSWORD.')
	isolation = setting('COMPARE_ISOLATION', default='container')
	skipped = {}
	if 'iai' in builders and not status.get('instanceAiEnabled'):
		skipped['iai'] = 'Instance AI is not enabled on this instance.'
	for cli in ('claude', 'codex'):
		if cli in builders and not status.get('mcpTokenWorks'):
			skipped[cli] = status.get('mcpTokenHelp', 'The MCP token does not work.')
		elif cli in builders and not status['keys'].get(cli):
			skipped[cli] = f'No API key. Set {cli.upper()}_API_KEY in .env.ai-surfaces.'
	if isolation == 'container' and not status.get('docker'):
		skipped.setdefault('codex', 'Docker is not running. Codex runs only in a container.')
		if 'claude' in builders and 'claude' not in skipped:
			print('Docker is not running. Claude falls back to clean-process isolation.', flush=True)
			isolation = 'clean'
	if isolation == 'clean':
		skipped.setdefault('codex', 'Codex runs only in a container. Clean isolation is for Claude only.')
		if not status.get('claudeOnHost'):
			skipped.setdefault('claude', 'Clean isolation runs claude on the host, and claude is not on PATH.')
	skipped = {name: reason for name, reason in skipped.items() if name in builders}
	for name, reason in skipped.items():
		print(f'skip {name}: {reason}', flush=True)
	builders = [b for b in builders if b not in skipped]
	parallel = not args.sequential and len(builders) > 1

	cli_mode = setting('COMPARE_CLI_MODE', default='interactive')
	screens = {b: ('shot' if recording() else None) if b == 'iai'
	           else ('cast' if isolation == 'container' and cli_mode == 'interactive' else None) for b in builders}
	progress = Progress(run_dir, 'parallel' if parallel else 'sequential', builders, skipped, screens)
	live_url = None
	if live_enabled() and not args.no_live:
		live_url = start_live_server(run_dir)
		if live_url:
			print(f'live page: {live_url}/report/live', flush=True)
			webbrowser.open(f'{live_url}/report/live')
		else:
			print(f'the live page did not start, see {run_dir / "live-server.log"}', flush=True)

	results = {}
	try:
		if parallel and isolation == 'container' and {'claude', 'codex'} & set(builders):
			# Both CLI runners need the image. Build it once before they start.
			from run_cli_builder import ensure_image
			ensure_image(False)

		def run_builder(builder):
			progress.builder(builder, status='running', startedAt=time.time())
			started = time.time()
			if builder == 'iai':
				cmd = [sys.executable, 'run_instance_ai.py', '--out', str(run_dir / 'iai'),
				       '--prompt-file', str(run_dir / 'prompt.txt')]
			else:
				cmd = [sys.executable, 'run_cli_builder.py', '--builder', builder, '--out', str(run_dir / builder),
				       '--prompt-file', str(run_dir / 'prompt.txt'), '--isolation', isolation]
			code = run(cmd, run_dir / f'{builder}.log', prefix=builder if parallel else None)
			# run_cli_builder.py exits 0 when the CLI fails. run.json has the exit code of the CLI.
			meta_file = run_dir / builder / 'run.json'
			if code == 0 and meta_file.exists():
				code = json.loads(meta_file.read_text()).get('exitCode') or 0
			results[builder] = {'exitCode': code, 'seconds': round(time.time() - started)}
			progress.builder(builder, status='done' if code == 0 else 'failed', finishedAt=time.time(), exitCode=code)

		if parallel:
			step(f'Run {", ".join(builders)} at the same time')
			threads = [threading.Thread(target=run_builder, args=(b,)) for b in builders]
			for t in threads:
				t.start()
			for t in threads:
				t.join()
		else:
			for builder in builders:
				step(f'Run {builder}')
				run_builder(builder)

		if 'iai' in builders and (run_dir / 'iai' / 'run.json').exists():
			step('Fetch Instance AI usage from LangSmith')
			progress.update(step='Fetching Instance AI usage')
			if status['keys'].get('langsmith'):
				# LangSmith receives traces with a delay.
				finished = progress.data['builders']['iai'].get('finishedAt') or time.time()
				time.sleep(max(0.0, 30 - (time.time() - finished)))
				run([sys.executable, 'langsmith_usage.py', '--run-dir', str(run_dir / 'iai')])
			else:
				print('LANGSMITH_API_KEY is not set. The report has no Instance AI cost or tokens.', flush=True)

		step('Capture the canvases')
		progress.update(step='Capturing the canvases')
		node = shutil.which('node')
		if node:
			run([node, 'capture_canvas.mjs', str(run_dir)])
		else:
			print('node is not on PATH. No canvases.', flush=True)

		if not is_on('COMPARE_SCENARIOS'):
			print('COMPARE_SCENARIOS=0. The workflows do not run with pinned data.', flush=True)
		elif not node or not status.get('mcpTokenWorks'):
			print('Pinned-data runs need node and a working MCP token. Skipped.', flush=True)
		else:
			step('Run each workflow with pinned data')
			progress.update(step='Running the workflows with pinned data')
			run([sys.executable, 'run_scenarios.py', str(run_dir)], run_dir / 'scenarios.log')

		if node and is_on('COMPARE_WIRE'):
			step('Run each workflow in process with recorded API requests')
			progress.update(step='Running the workflows with recorded API requests')
			run([node, 'run_wire.mjs', str(run_dir)], run_dir / 'wire.log')
		elif node:
			print('COMPARE_WIRE=0. No in-process runs with recorded API requests.', flush=True)

		pnpm = shutil.which('pnpm')
		if pnpm and is_on('COMPARE_BINARY_CHECKS'):
			step('Run the eval binary checks')
			progress.update(step='Running the eval binary checks')
			run([pnpm, '--filter', '@n8n/instance-ai', 'exec', 'tsx', str(HERE / 'binary_checks.mts'), str(run_dir)],
			    run_dir / 'binary-checks.log')

		step('Check the final-message claims')
		run([sys.executable, 'claims.py', str(run_dir)])

		if node:
			step('Derive the deterministic checks')
			progress.update(step='Deriving the deterministic checks')
			run([node, 'derive_checks.mjs', str(run_dir)])

		step('Summarize the runs for the judges')
		summary = subprocess.run([sys.executable, 'summarize_runs.py', str(run_dir)], cwd=HERE,
		                         capture_output=True, text=True)
		(run_dir / 'summary.txt').write_text(summary.stdout)
		run([sys.executable, 'summarize_runs.py', str(run_dir), '--blind'])

		step('Build the report')
		# The agent does the price and judge steps after this script. The page shows them as queued until then.
		progress.update(step='Building the report', postRun={'prices': 'queued', 'judge': 'queued'})
		run([sys.executable, 'build_report.py', str(run_dir)])
	finally:
		progress.finish()

	models_file = run_dir / 'models.json'
	print(json.dumps({
		'runDir': str(run_dir),
		'report': str(run_dir / 'report' / 'index.html'),
		'live': f'{live_url}/report/index.html' if live_url else None,
		'parallel': parallel,
		'summary': str(run_dir / 'summary.txt'),
		'blindSummary': str(run_dir / 'judge' / 'summary-blind.txt'),
		'models': json.loads(models_file.read_text()) if models_file.exists() else [],
		'results': results,
		'skipped': skipped,
		'next': 'Run build_report.py --step prices=running, add published prices for the CLI models to case.json, '
		        'run build_report.py --step prices=done --step judge=running, give judge/summary-blind.txt to '
		        '3 judges with a fresh context, write judge/verdicts-1.json to verdicts-3.json, run '
		        'merge_verdicts.py, then run build_report.py --step judge=done.',
	}, indent=2))


if __name__ == '__main__':
	main()
