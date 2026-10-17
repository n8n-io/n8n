#!/usr/bin/env python3
"""Run a test plan of Instance AI scenarios and build one report. The judge step is separate.

  run.py --plan <dir>/scenarios.json [--only id1,id2] [--concurrency 4]
  run.py --rerun <old-run-dir>              the same plan and scripts, new run
  run.py --plan ... --branch-url http://localhost:5678   use a running instance for this branch

Steps:
  1. Start a fresh n8n instance from the build in this checkout. It gets its own port and data
     folder, so the scenarios start from an empty instance.
  2. Run the feature and regression scenarios on it, several at the same time.
  3. At the same time: build origin/master (baseline.py) and start a fresh master instance, plus a
     second fresh branch instance. Run each visual scenario on both.
  4. Fetch the token usage of each scenario from LangSmith.
  5. Compare the captures of the visual scenarios (visual_diff.mjs and the accessibility trees).
  6. Write summary.txt for the judge and build the report.
A local page shows the runs live (live_page.py). It opens in the default browser, unless --no-open.
Settings come from .env.ai-surfaces.
"""

import argparse
import difflib
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
import webbrowser
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import baseline
import report
from common import HERE, REPO_ROOT, RUNS_ROOT, SHARED, Instance, client, setting
from live import enabled as live_enabled
from run_instance_ai import decide

KINDS = ('feature', 'regression', 'visual')
LIB = HERE.parent / 'scenarios'
ID = re.compile(r'^[a-z0-9][a-z0-9-]{0,60}$')
PRINT_LOCK = threading.Lock()
RUNNERS = set()


def say(line, prefix=None):
	with PRINT_LOCK:
		print(f'[{prefix}] {line}' if prefix else line, flush=True)


def step(title):
	say(f'\n=== {title} ===')


def now_iso():
	return datetime.now(timezone.utc).isoformat()


def slug(text):
	return '-'.join(re.findall(r'[a-z0-9]+', text.lower())[:5]) or 'run'


def script_path(spec, base):
	return LIB / spec[4:] if spec.startswith('lib:') else (base / spec).resolve()


def load_plan(path):
	"""Read and check scenarios.json. Returns the plan with each script path resolved."""
	path = Path(path).resolve()
	plan = json.loads(path.read_text())
	errors, seen = [], set()
	if not plan.get('scenarios'):
		errors.append('The plan has no scenarios.')
	for s in plan.get('scenarios', []):
		sid = s.get('id', '')
		if not ID.match(sid) or '--' in sid:
			errors.append(f'Scenario id "{sid}": use a-z, 0-9 and single "-" characters.')
		if sid in seen:
			errors.append(f'Scenario id "{sid}" is used two times.')
		seen.add(sid)
		if s.get('kind') not in KINDS:
			errors.append(f'Scenario "{sid}": kind must be one of {", ".join(KINDS)}.')
		if not s.get('script') or not script_path(s['script'], path.parent).is_file():
			errors.append(f'Scenario "{sid}": script {s.get("script")} not found.')
		if not s.get('title') or not s.get('expected'):
			errors.append(f'Scenario "{sid}": give a title and an expected outcome.')
	if errors:
		sys.exit('The plan is not valid:\n  ' + '\n  '.join(errors))
	for s in plan['scenarios']:
		s['scriptPath'] = str(script_path(s['script'], path.parent))
	return plan


def copy_plan(plan, run_dir):
	"""Keep the plan and its scripts in the run folder, so --rerun can repeat the run."""
	plan_dir = run_dir / 'plan'
	(plan_dir / 'scripts').mkdir(parents=True, exist_ok=True)
	saved = json.loads(json.dumps(plan))
	for s in saved['scenarios']:
		target = plan_dir / 'scripts' / f'{s["id"]}.mjs'
		shutil.copy(s.pop('scriptPath'), target)
		s['script'] = f'scripts/{target.name}'
	(plan_dir / 'scenarios.json').write_text(json.dumps(saved, indent=2))


class Progress:
	"""Writes status.json, which the live page reads."""

	def __init__(self, run_dir, data):
		self.path, self.lock, self.data = run_dir / 'status.json', threading.Lock(), data
		self.save()

	def save(self):
		tmp = self.path.with_suffix('.tmp')
		tmp.write_text(json.dumps(self.data, indent=2))
		os.replace(tmp, self.path)

	def update(self, **fields):
		with self.lock:
			self.data.update(fields)
			self.save()

	def run(self, name, **fields):
		with self.lock:
			self.data['runs'][name].update(fields)
			self.save()

	def finish(self):
		with self.lock:
			for entry in self.data['runs'].values():
				if entry['status'] == 'waiting':
					entry.update(status='skipped', reason=entry.get('reason') or 'The run did not start.')
				elif entry['status'] == 'running':
					entry['status'] = 'error'
			self.data.update(phase='done', step='Done', finishedAt=time.time())
			self.save()


class ThreadEvents:
	"""Reads the event stream of each thread that a scenario opens. The stream starts at the first event."""

	def __init__(self, base_url, out, auto_confirm, prefix):
		self.client = client(base_url).login()
		self.out, self.auto_confirm, self.prefix = out, auto_confirm, prefix
		self.file, self.lock = (out / 'events.jsonl').open('a'), threading.Lock()
		self.run_ids, self.decisions, self.streams, self.closed = [], [], [], False

	def follow(self, thread_id):
		threading.Thread(target=self._read, args=(thread_id,), daemon=True).start()

	def _read(self, thread_id):
		try:
			res = self.client.open_stream(f'/rest/instance-ai/events/{thread_id}')
		except Exception as e:
			say(f'event stream of {thread_id} did not open: {e}', self.prefix)
			return
		self.streams.append(res)
		data, name = [], None
		try:
			for raw in res:
				line = raw.decode(errors='replace').rstrip('\r\n')
				if line.startswith('data:'):
					data.append(line[5:].lstrip())
				elif line.startswith('event:'):
					name = line[6:].strip()
				elif line == '' and data:
					try:
						self._event(json.loads('\n'.join(data)))
					except json.JSONDecodeError:
						pass
					data, name = [], None
		except Exception:
			# close() ends the stream when the scenario stops.
			pass

	def _event(self, event):
		with self.lock:
			if self.closed:
				return
			self.file.write(json.dumps(event) + '\n')
			self.file.flush()
		payload = event.get('payload') or {}
		if event.get('type') == 'run-start' and payload.get('langsmithRunId'):
			self.run_ids.append(payload['langsmithRunId'])
		if event.get('type') == 'confirmation-request' and self.auto_confirm:
			body, label = decide(payload)
			try:
				self.client.request('POST', f'/rest/instance-ai/confirm/{payload["requestId"]}', body)
				ok = True
			except RuntimeError as e:
				ok, label = False, f'{label} (failed: {str(e)[:200]})'
			self.decisions.append({'at': now_iso(), 'toolName': payload.get('toolName'), 'decision': label, 'ok': ok})
			say(f'confirm: {label} [{payload.get("toolName")}]', self.prefix)

	def close(self):
		with self.lock:
			self.closed = True
			self.file.close()
		for res in self.streams:
			try:
				res.close()
			except Exception:
				pass


def run_job(name, scenario, url, instance, run_dir, progress, live):
	sub = run_dir / 'runs' / name
	sub.mkdir(parents=True, exist_ok=True)
	progress.run(name, status='running', startedAt=time.time(), baseUrl=url)
	auto_confirm = scenario.get('autoConfirm', True)
	timeout_min = float(scenario.get('timeoutMin', 10))
	started = now_iso()
	try:
		events = ThreadEvents(url, sub, auto_confirm, name)
	except Exception as e:
		progress.run(name, status='error', finishedAt=time.time(), reason=f'Cannot sign in to {url}: {e}')
		return
	cmd = ['node', str(HERE / 'run_scenario.mjs'), '--out', str(sub), '--script', scenario['scriptPath'],
	       '--timeout-min', str(timeout_min), '--viewport', scenario.get('viewport', '1600x1000')]
	cmd += ['--live'] if live else []
	cmd += ['--auto-confirm'] if auto_confirm else []
	proc = subprocess.Popen(cmd, cwd=HERE, env={**os.environ, 'N8N_BASE_URL': url},
	                        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
	RUNNERS.add(proc)
	# The scenario has its own time limit. This one covers a runner that hangs outside the scenario.
	watchdog = threading.Timer(timeout_min * 60 + 180, proc.kill)
	watchdog.start()
	with (sub / 'runner.log').open('w') as log:
		for line in proc.stdout:
			log.write(line)
			say(line.rstrip(), name)
			match = re.match(r'thread (\S+)', line)
			if match:
				events.follow(match[1])
	proc.wait()
	RUNNERS.discard(proc)
	watchdog.cancel()
	time.sleep(1)
	events.close()
	try:
		result = json.loads((sub / 'result.json').read_text())
	except (OSError, ValueError):
		result = {'status': 'error', 'error': f'The runner stopped without a result (exit {proc.returncode}). See runner.log.'}
		(sub / 'result.json').write_text(json.dumps(result, indent=2))
	meta = {
		'kind': 'scenario', 'scenario': scenario['id'], 'instance': instance, 'baseUrl': url,
		'threadIds': result.get('threads', []), 'langsmithRunIds': events.run_ids, 'decisions': events.decisions,
		'startedAt': started, 'finishedAt': now_iso(),
		'screen': 'screen.webm' if (sub / 'screen.webm').exists() else None,
	}
	(sub / 'run.json').write_text(json.dumps(meta, indent=2))
	progress.run(name, status=result['status'], finishedAt=time.time(), reason=result.get('error'))


def stale_packages():
	"""Packages with a source change in this branch that is newer than their build output."""
	try:
		base = subprocess.run(['git', 'merge-base', 'HEAD', 'origin/master'], cwd=REPO_ROOT, capture_output=True,
		                      text=True, check=True).stdout.strip()
		changed = subprocess.run(['git', 'diff', '--name-only', base], cwd=REPO_ROOT, capture_output=True,
		                         text=True, check=True).stdout.split()
		changed += [line[3:] for line in subprocess.run(['git', 'status', '--porcelain'], cwd=REPO_ROOT,
		            capture_output=True, text=True, check=True).stdout.splitlines()]
	except subprocess.CalledProcessError:
		return []
	newest_dist, stale = {}, set()
	for rel in changed:
		path = REPO_ROOT / rel
		if not rel.startswith('packages/') or '/src/' not in rel or re.search(r'(\.test\.|__tests__|\.md$)', rel):
			continue
		if not path.is_file():
			continue
		pkg = REPO_ROOT / rel.split('/src/', 1)[0]
		dist = pkg / 'dist'
		if not dist.exists():
			continue
		if pkg not in newest_dist:
			newest_dist[pkg] = max((f.stat().st_mtime for f in dist.rglob('*') if f.is_file()), default=0)
		if path.stat().st_mtime > newest_dist[pkg]:
			stale.add(str(pkg.relative_to(REPO_ROOT)))
	return sorted(stale)


def fetch_usage(run_dir, names, progress):
	"""Token usage and cost of each run from LangSmith, matched by the traces of its threads."""
	if not setting('LANGSMITH_API_KEY'):
		say('LANGSMITH_API_KEY is not set. The report has no tokens or cost.')
		return
	finished = max((progress.data['runs'][n].get('finishedAt') or 0 for n in names), default=0)
	# LangSmith receives traces with a delay.
	time.sleep(max(0.0, 30 - (time.time() - finished)))
	for name in names:
		sub = run_dir / 'runs' / name
		meta_file = sub / 'run.json'
		if not meta_file.exists() or not json.loads(meta_file.read_text()).get('langsmithRunIds'):
			continue
		res = subprocess.run([sys.executable, 'langsmith_usage.py', '--run-dir', str(sub), '--by-trace'],
		                     cwd=SHARED, capture_output=True, text=True)
		if res.returncode != 0:
			say(f'usage failed: {(res.stderr or res.stdout).strip()[:200]}', name)
		else:
			usage = json.loads(res.stdout)
			say(f'{usage["calls"]} LLM calls, ${usage["cost"]:.2f}', name)


def compare_trees(run_dir):
	"""Add the accessibility tree diff of each capture to visual.json."""
	path = run_dir / 'visual.json'
	if not path.exists():
		return []
	results = json.loads(path.read_text())
	for r in results:
		trees = []
		for name in (f'{r["scenario"]}--master', r['scenario']):
			file = run_dir / 'runs' / name / 'captures' / f'{r["name"]}.aria.yml'
			trees.append(file.read_text().splitlines() if file.exists() else [])
		diff = '\n'.join(difflib.unified_diff(*trees, 'master', 'branch', lineterm='', n=2))
		r['ariaDiff'] = diff
		r['pixelStatus'] = r['status']
		if diff and r['status'] == 'unchanged':
			r['status'] = 'changed'
	path.write_text(json.dumps(results, indent=2))
	return results


def start_live_server(run_dir):
	url_file = run_dir / 'live-url.txt'
	url_file.unlink(missing_ok=True)
	log = (run_dir / 'live-server.log').open('w')
	# A new session, so the page still serves the report after this script ends.
	subprocess.Popen([sys.executable, str(HERE / 'live_page.py'), '--run-dir', str(run_dir),
	                  '--parent-pid', str(os.getpid())],
	                 cwd=HERE, stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
	for _ in range(50):
		if url_file.exists() and url_file.read_text().strip():
			return url_file.read_text().strip()
		time.sleep(0.1)
	return None


def open_in_default_browser(url):
	"""Opens url in the default browser. Returns False if no browser opened.

	$BROWSER is not used: agents often set it to a command that does nothing.
	"""
	command = {'darwin': ['open'], 'linux': ['xdg-open']}.get(sys.platform)
	if command and shutil.which(command[0]):
		try:
			return subprocess.run(command + [url], capture_output=True, timeout=15).returncode == 0
		except (OSError, subprocess.TimeoutExpired):
			return False
	try:
		return webbrowser.open(url)
	except webbrowser.Error:
		return False


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--plan', help='scenarios.json')
	ap.add_argument('--rerun', help='Run the plan of an earlier run folder again.')
	ap.add_argument('--only', help='Comma-separated scenario ids.')
	ap.add_argument('--run-dir')
	ap.add_argument('--concurrency', type=int, default=int(setting('FEATURE_TEST_CONCURRENCY', default='4')))
	ap.add_argument('--branch-url', help='Use this running instance for the branch runs instead of a fresh one.')
	ap.add_argument('--no-baseline', action='store_true', help='Skip master. Visual scenarios run on the branch only.')
	ap.add_argument('--no-fetch', action='store_true', help='Use origin/master as it is, without git fetch.')
	ap.add_argument('--no-live', action='store_true', help='Do not start the live page.')
	ap.add_argument('--no-open', action='store_true',
	                help='Do not open the live page in the default browser. Use this when you open it in the editor browser.')
	ap.add_argument('--keep-instances', action='store_true', help='Keep the fresh instances running after the run.')
	args = ap.parse_args()
	if not (args.plan or args.rerun):
		sys.exit('Give --plan <scenarios.json> or --rerun <run-dir>.')
	# The fresh instances run in their own sessions. Exit through the cleanup, so they stop too.
	for sig in (signal.SIGTERM, signal.SIGHUP):
		signal.signal(sig, lambda signum, _frame: sys.exit(128 + signum))

	plan = load_plan(Path(args.rerun) / 'plan' / 'scenarios.json' if args.rerun else args.plan)
	if args.only:
		wanted = {x.strip() for x in args.only.split(',')}
		plan['scenarios'] = [s for s in plan['scenarios'] if s['id'] in wanted]
		if not plan['scenarios']:
			sys.exit(f'No scenario matches --only {args.only}.')
	title = plan.get('title') or 'Instance AI feature test'
	run_dir = Path(args.run_dir) if args.run_dir else RUNS_ROOT / f'{datetime.now():%Y%m%d-%H%M}-{slug(title)}'
	run_dir.mkdir(parents=True, exist_ok=True)
	copy_plan(plan, run_dir)
	say(f'run directory: {run_dir}')

	visual = [s for s in plan['scenarios'] if s['kind'] == 'visual']
	compare_master = bool(visual) and not args.no_baseline
	jobs = []  # (name, scenario, instance role)
	for s in plan['scenarios']:
		if s['kind'] == 'visual' and compare_master:
			role = 'branch-visual'
		elif s.get('isolated') and not args.branch_url:
			role = 'isolated'
		else:
			role = 'branch'
		jobs.append((s['id'], s, role))
		if s['kind'] == 'visual' and compare_master:
			jobs.append((f'{s["id"]}--master', s, 'master'))

	branch_commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=REPO_ROOT, capture_output=True,
	                               text=True).stdout.strip()
	dirty = bool(subprocess.run(['git', 'status', '--porcelain', '--', 'packages'], cwd=REPO_ROOT,
	                            capture_output=True, text=True).stdout.strip())
	live = live_enabled() and not args.no_live
	progress = Progress(run_dir, {
		'phase': 'running', 'step': 'Starting the instances', 'startedAt': time.time(), 'concurrency': args.concurrency,
		'branch': {'commit': branch_commit, 'dirty': dirty, 'url': args.branch_url},
		'master': {'commit': None} if compare_master else None,
		'runs': {name: {'status': 'waiting', 'scenario': s['id'], 'instance': role.split('-')[0]}
		         for name, s, role in jobs},
	})
	if not args.branch_url:
		stale = stale_packages()
		if stale:
			say('warning: these packages have source changes that are newer than their build: '
			    f'{", ".join(stale)}. The fresh branch instance runs the old build. Build them first.')
			progress.update(stale=stale)

	live_url = None
	if live:
		live_url = start_live_server(run_dir)
		if live_url:
			say(f'live page: {live_url}/report/live')
			if not args.no_open and not open_in_default_browser(f'{live_url}/report/live'):
				say(f'no browser opened. Open {live_url}/report/live to watch the runs.')
		else:
			say(f'the live page did not start, see {run_dir / "live-server.log"}')

	instances, urls, lock = [], {}, threading.Lock()

	def start_instance(role, root):
		inst = Instance(role, root, run_dir / 'instances' / role, run_dir / 'instances' / f'{role}.log')
		with lock:
			instances.append(inst)
		inst.start()
		say(f'{role} instance ready: {inst.url}')
		return inst.url

	pool = ThreadPoolExecutor(max_workers=max(1, args.concurrency))
	futures = []

	def submit(role, url):
		for name, s, r in jobs:
			if r == role:
				futures.append(pool.submit(run_job, name, s, url, r.split('-')[0], run_dir, progress, live))

	def skip(role, reason):
		for name, _, r in jobs:
			if r == role:
				progress.run(name, status='skipped', reason=reason)

	def master_side():
		try:
			built = baseline.prepare(fetch=not args.no_fetch, say=lambda m: say(m, 'master'))
			progress.update(master={'commit': built['commit'][:11]})
			submit('master', start_instance('master', built['root']))
		except Exception as e:
			say(f'master is not available: {e}', 'master')
			skip('master', f'Master is not available: {e}')

	def run_isolated(name, scenario):
		"""Run one scenario on its own fresh instance, so the data of other scenarios cannot change its result."""
		progress.run(name, status='running', startedAt=time.time())
		inst = Instance(name, REPO_ROOT, run_dir / 'instances' / name, run_dir / 'instances' / f'{name}.log')
		with lock:
			instances.append(inst)
		try:
			inst.start()
		except RuntimeError as e:
			progress.run(name, status='error', finishedAt=time.time(), reason=f'The instance did not start: {e}')
			return
		try:
			run_job(name, scenario, inst.url, 'isolated', run_dir, progress, live)
		finally:
			if not args.keep_instances:
				inst.stop()

	try:
		step('Start the instances')
		if any(r == 'branch' for _, _, r in jobs):
			try:
				urls['branch'] = args.branch_url or start_instance('branch', REPO_ROOT)
			except RuntimeError as e:
				sys.exit(str(e))
		master_thread = threading.Thread(target=master_side, daemon=True) if compare_master else None
		if master_thread:
			master_thread.start()
		progress.update(step='Running the scenarios')
		step(f'Run {len(jobs)} scenario runs, {args.concurrency} at a time')
		for name, s, r in jobs:
			if r == 'isolated':
				futures.append(pool.submit(run_isolated, name, s))
		if 'branch' in urls:
			submit('branch', urls['branch'])
		if compare_master:
			try:
				submit('branch-visual', args.branch_url or start_instance('branch-visual', REPO_ROOT))
			except RuntimeError as e:
				skip('branch-visual', str(e))
		if master_thread:
			master_thread.join()
		# Jobs can be added while the pool runs, so wait until the list stops growing.
		while any(not f.done() for f in list(futures)):
			time.sleep(1)
		for f in futures:
			if f.exception():
				say(f'a run failed: {f.exception()}')
		pool.shutdown()
		if not args.keep_instances:
			for inst in instances:
				inst.stop()

		names = [name for name, _, _ in jobs]
		step('Fetch the token usage from LangSmith')
		progress.update(step='Fetching the token usage')
		fetch_usage(run_dir, names, progress)

		if compare_master:
			step('Compare the visual captures with master')
			progress.update(step='Comparing the captures with master')
			subprocess.run(['node', 'visual_diff.mjs', str(run_dir)], cwd=HERE)
			trees = [r for r in compare_trees(run_dir) if r.get('ariaDiff')]
			if trees:
				say(f'{len(trees)} captures with a difference in the accessibility tree: '
				    + ', '.join(f'{r["scenario"]}/{r["name"]}' for r in trees))

		step('Summarize the runs for the judge')
		(run_dir / 'summary.txt').write_text(report.summarize(run_dir))
		step('Build the report')
		progress.update(step='Building the report')
		print(report.build(run_dir), flush=True)
	finally:
		pool.shutdown(wait=False, cancel_futures=True)
		for proc in list(RUNNERS):
			proc.kill()
		if not args.keep_instances:
			for inst in instances:
				inst.stop()
		progress.finish()

	runs = progress.data['runs']
	visual_results = json.loads((run_dir / 'visual.json').read_text()) if (run_dir / 'visual.json').exists() else []
	print(json.dumps({
		'runDir': str(run_dir),
		'report': str(run_dir / 'report' / 'index.html'),
		'live': f'{live_url}/report/index.html' if live_url else None,
		'summary': str(run_dir / 'summary.txt'),
		'results': {name: runs[name]['status'] for name in runs},
		'visual': {'captures': len(visual_results),
		           'changed': [f'{r["scenario"]}/{r["name"]}' for r in visual_results if r['status'] != 'unchanged']},
		'instances': {i.name: i.url for i in instances} if args.keep_instances else None,
		'next': 'Judge each run from summary.txt, write verdicts.json, then run report.py again.',
	}, indent=2))


if __name__ == '__main__':
	main()
