#!/usr/bin/env python3
"""Run the full comparison in one command, except the judge step.

  compare.py --prompt "..." --expected "..." [--title "..."] [--builders iai,claude,codex]
  compare.py --prompt-file p.txt --expected-file e.txt
  compare.py --rerun /tmp/builder-compare/<old-run>     same prompt and expected outcome, new run

Steps: check the setup, run each builder one at a time, fetch Instance AI usage,
capture the canvases, write summary.txt for the judge, and build the report.
Settings come from .env.ai-surfaces (template: .env.ai-surfaces.example in the repository root).
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

from n8n_api import setting

HERE = Path(__file__).resolve().parent
RUNNERS = {'iai', 'claude', 'codex'}


def slug(text):
	words = re.findall(r'[a-z0-9]+', text.lower())[:5]
	return '-'.join(words) or 'run'


def step(title):
	print(f'\n=== {title} ===', flush=True)


def run(cmd, log=None):
	"""Run a script, show its output, and keep a copy in log. Returns the exit code."""
	with subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, cwd=HERE) as proc:
		lines = []
		for line in proc.stdout:
			print(line, end='', flush=True)
			lines.append(line)
	if log:
		Path(log).write_text(''.join(lines))
	return proc.returncode


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--prompt')
	ap.add_argument('--prompt-file')
	ap.add_argument('--expected')
	ap.add_argument('--expected-file')
	ap.add_argument('--title')
	ap.add_argument('--builders', default=setting('COMPARE_BUILDERS', default='iai,claude,codex'))
	ap.add_argument('--run-dir')
	ap.add_argument('--rerun', help='Copy prompt.txt and case.json from an earlier run directory.')
	ap.add_argument('--no-live', action='store_true',
	                help='Do not open the browser tab and terminal windows that show each run live.')
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
	run_dir = Path(args.run_dir) if args.run_dir else root / f'{datetime.now():%Y%m%d-%H%M}-{slug(case["title"])}'
	run_dir.mkdir(parents=True, exist_ok=True)
	(run_dir / 'prompt.txt').write_text(prompt + '\n')
	(run_dir / 'case.json').write_text(json.dumps(case, indent=2))
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
	skipped = {name: reason for name, reason in skipped.items() if name in builders}
	for name, reason in skipped.items():
		print(f'skip {name}: {reason}', flush=True)
	builders = [b for b in builders if b not in skipped]

	results = {}
	for builder in builders:
		step(f'Run {builder}')
		started = time.time()
		if builder == 'iai':
			code = run([sys.executable, 'run_instance_ai.py', '--out', str(run_dir / 'iai'),
			            '--prompt-file', str(run_dir / 'prompt.txt')], run_dir / 'iai.log')
		else:
			code = run([sys.executable, 'run_cli_builder.py', '--builder', builder, '--out', str(run_dir / builder),
			            '--prompt-file', str(run_dir / 'prompt.txt'), '--isolation', isolation],
			           run_dir / f'{builder}.log')
		results[builder] = {'exitCode': code, 'seconds': round(time.time() - started)}

	if 'iai' in builders and (run_dir / 'iai' / 'run.json').exists():
		step('Fetch Instance AI usage from LangSmith')
		if status['keys'].get('langsmith'):
			# LangSmith receives traces with a delay.
			time.sleep(30)
			run([sys.executable, 'langsmith_usage.py', '--run-dir', str(run_dir / 'iai')])
		else:
			print('LANGSMITH_API_KEY is not set. The report has no Instance AI cost or tokens.', flush=True)

	step('Capture the canvases')
	node = shutil.which('node')
	if node:
		run([node, 'capture_canvas.mjs', str(run_dir)])
	else:
		print('node is not on PATH. No canvases.', flush=True)

	step('Summarize the runs for the judge')
	summary = subprocess.run([sys.executable, 'summarize_runs.py', str(run_dir)], cwd=HERE,
	                         capture_output=True, text=True)
	(run_dir / 'summary.txt').write_text(summary.stdout)

	step('Build the report')
	run([sys.executable, 'build_report.py', str(run_dir)])

	models_file = run_dir / 'models.json'
	print(json.dumps({
		'runDir': str(run_dir),
		'report': str(run_dir / 'report' / 'index.html'),
		'summary': str(run_dir / 'summary.txt'),
		'models': json.loads(models_file.read_text()) if models_file.exists() else [],
		'results': results,
		'skipped': skipped,
		'next': 'Add published prices for the CLI models to case.json, judge each run from summary.txt, '
		        'write verdicts.json, then run build_report.py again.',
	}, indent=2))


if __name__ == '__main__':
	main()
