#!/usr/bin/env python3
"""Run a test plan of Instance AI scenarios and build one report. The judge step is separate.

  run.py --plan <dir>/scenarios.json [--only id1,id2] [--concurrency 4]
  run.py --rerun last|<run-dir>             the plan of an earlier run, again in a new folder
  run.py --plan ... --try                   a quick check of new scripts: no master, no live page, no report
  run.py --plan ... --estimate              print the expected cost and time, then stop
  run.py --check                            check the setup, then stop

Steps:
  1. Check the setup, and build this checkout with turbo (a few seconds when nothing changed).
  2. Start fresh n8n instances from the build. Each feature and regression scenario gets its own
     instance, unless it sets "isolated": false. Instances start ahead of their scenario, so a
     scenario does not wait for one.
  3. Run the scenarios, several at the same time.
  4. At the same time: build the master merge base (baseline.py), start a fresh master instance and
     a fresh branch instance, and run each visual scenario on both. A master run that passed is kept
     and used again while the merge base and the script stay the same.
  5. Compare the visual captures, write summary.txt for the judge, and build the report.
  6. Fetch the token usage from LangSmith and build the report again.
A local page shows the runs live (live_page.py). It opens in the default browser, unless --no-open.
Settings come from .env.local and .env.ai-surfaces.
"""

import argparse
import difflib
import hashlib
import json
import os
import re
import shutil
import signal
import socket
import statistics
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
from common import CACHE, HERE, PLANS_ROOT, REPO_ROOT, RUNS_ROOT, SHARED, Instance, client, git, setting
from langsmith_usage import fetch_calls, totals
from live import enabled as live_enabled
from run_instance_ai import decide

KINDS = ('feature', 'regression', 'visual')
LIB = HERE.parent / 'scenarios'
ID = re.compile(r'^[a-z0-9][a-z0-9-]{0,60}$')
MASTER_CACHE = CACHE / 'master-runs'
MASTER_CACHE_DAYS = 14
PRINT_LOCK = threading.Lock()
RUNNERS = set()
S = '.agents/skills/testmax-assistant-ui/scripts'


def say(line, prefix=None):
	with PRINT_LOCK:
		print(f'[{prefix}] {line}' if prefix else line, flush=True)


def step(title):
	say(f'\n=== {title} ===')


def now_iso():
	return datetime.now(timezone.utc).isoformat()


def slug(text, words=8):
	return '-'.join(re.findall(r'[a-z0-9]+', text.lower())[:words]) or 'run'


def script_path(spec, base):
	return LIB / spec[4:] if spec.startswith('lib:') else (base / spec).resolve()


def load_plan(path):
	"""Read and check scenarios.json. Returns the plan with each script path resolved."""
	path = Path(path).resolve()
	plan = json.loads(path.read_text())
	errors, seen = [], set()
	if not plan.get('scenarios'):
		errors.append('The plan has no scenarios.')
	if not isinstance(plan.get('featureFlags', {}), dict):
		errors.append('featureFlags must be an object of flag names and values.')
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
	plan.setdefault('source', str(path))
	plan['name'] = path.parent.name if path.parent.name != 'plan' else slug(plan.get('title') or 'run')
	return plan


def run_dirs():
	"""Earlier run folders, newest first."""
	if not RUNS_ROOT.exists():
		return []
	found = [d for d in RUNS_ROOT.iterdir() if (d / 'plan' / 'scenarios.json').is_file()]
	return sorted(found, key=lambda d: (d / 'plan' / 'scenarios.json').stat().st_mtime, reverse=True)


def rerun_plan(arg):
	"""The plan to run again. The source plan wins over the copy, so a fixed script is used."""
	if arg == 'last':
		found = run_dirs()
		if not found:
			sys.exit(f'No earlier run in {RUNS_ROOT}.')
		run_dir = found[0]
	else:
		run_dir = Path(arg).expanduser().resolve()
	copy = run_dir / 'plan' / 'scenarios.json'
	if not copy.is_file():
		sys.exit(f'{run_dir} has no plan/scenarios.json.')
	source = json.loads(copy.read_text()).get('source')
	if source and Path(source).is_file():
		say(f'rerun of {run_dir.name}, with the current plan and scripts in {Path(source).parent}')
		return source
	say(f'rerun of {run_dir.name}, with the scripts copied into that run')
	return copy


def new_run_dir(root, name):
	base = root / f'{datetime.now():%Y%m%d-%H%M%S}-{name}'
	run_dir, n = base, 2
	while run_dir.exists():
		run_dir, n = base.with_name(f'{base.name}-{n}'), n + 1
	run_dir.mkdir(parents=True)
	return run_dir


def copy_plan(plan, run_dir):
	"""Keep the plan and its scripts in the run folder, so --rerun can repeat the run."""
	plan_dir = run_dir / 'plan'
	(plan_dir / 'scripts').mkdir(parents=True, exist_ok=True)
	saved = json.loads(json.dumps(plan))
	saved.pop('name', None)
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
				if entry['status'] in ('waiting', 'starting'):
					entry.update(status='skipped', reason=entry.get('reason') or 'The run did not start.')
				elif entry['status'] == 'running':
					entry['status'] = 'error'
			if self.data.get('phase') != 'done':
				self.data.update(phase='done', step='Done', finishedAt=time.time())
			self.save()


def close_stream(res):
	"""Close an event stream that another thread reads. close() alone waits for the next server
	keep-alive (about 13 seconds), because the reader holds the buffer lock. A socket shutdown ends the
	read at once."""
	try:
		with socket.socket(fileno=os.dup(res.fileno())) as sock:
			sock.shutdown(socket.SHUT_RDWR)
	except (OSError, ValueError):
		pass
	try:
		res.close()
	except Exception:
		pass


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
			close_stream(res)


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
	# The last events of a run can arrive just after the scenario ends.
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


def build_branch(log_path):
	"""Build n8n and its packages with turbo. Unchanged packages come from the turbo cache in seconds."""
	started = time.time()
	with log_path.open('w') as log:
		code = subprocess.run(['pnpm', 'turbo', 'run', 'build', '--filter=n8n...', '--output-logs=errors-only'],
		                      cwd=REPO_ROOT, stdout=log, stderr=subprocess.STDOUT).returncode
	text = log_path.read_text()
	if code != 0:
		sys.exit(f'The build failed. The end of {log_path}:\n' + '\n'.join(text.splitlines()[-30:]))
	cached = re.search(r'Cached:\s+(\d+) cached, (\d+) total', text)
	if cached and cached[1] == cached[2]:
		say(f'build: up to date ({time.time() - started:.0f}s)')
	else:
		say(f'build: done in {time.time() - started:.0f}s')


def preflight(build, need_master, local_instances=True):
	"""Problems that stop a run (errors) or make the report less useful (warnings).
	local_instances is False with --branch-url: the branch runs then need no local build."""
	errors, warnings = [], []
	for tool in ('node', 'git') + (('pnpm',) if build or need_master else ()):
		if not shutil.which(tool):
			errors.append(f'{tool} is not on the PATH.')
	if shutil.which('node'):
		probe = ("import(process.argv[1]).then(async (m) => { const b = await m.launchBrowser(); await b.close(); })"
		         ".catch((e) => { console.error(e.message.split('\\n')[0]); process.exit(1); })")
		res = subprocess.run(['node', '-e', probe, str(SHARED / 'n8n_browser.mjs')], capture_output=True, text=True,
		                     timeout=60)
		if res.returncode != 0:
			errors.append('Playwright cannot start a browser: '
			              f'{(res.stderr or res.stdout).strip()[:300]}. Run pnpm install, and install Google Chrome.')
	if not build and local_instances:
		for path in ('packages/cli/dist', 'packages/frontend/editor-ui/dist/index.html'):
			if not (REPO_ROOT / path).exists():
				errors.append(f'{path} does not exist. Build first, or run without --no-build.')
	if not setting('N8N_INSTANCE_AI_MODEL'):
		warnings.append('N8N_INSTANCE_AI_MODEL is not set in .env.local, .env.ai-surfaces or the environment. '
		                'Scenarios that send a prompt can fail.')
	if not setting('LANGSMITH_API_KEY'):
		warnings.append('LANGSMITH_API_KEY is not set. The report has no tokens or cost.')
	elif (setting('LANGSMITH_TRACING') or '').lower() != 'true':
		warnings.append('LANGSMITH_TRACING is not true. The instances send no traces, so the report has no tokens or cost.')
	if (setting('N8N_DIAGNOSTICS_ENABLED') or '').lower() == 'false':
		warnings.append('N8N_DIAGNOSTICS_ENABLED is false. Instance AI sends no traces, so the report has no tokens or cost.')
	RUNS_ROOT.mkdir(parents=True, exist_ok=True)
	free = shutil.disk_usage(RUNS_ROOT).free / 1e9
	if free < 2:
		warnings.append(f'Only {free:.1f} GB free in {RUNS_ROOT}. A run needs about 0.5 GB.')
	if need_master and not baseline.built():
		CACHE.mkdir(parents=True, exist_ok=True)
		free = shutil.disk_usage(CACHE).free / 1e9
		warnings.append('The master build does not exist yet. The first build takes 15 to 20 minutes'
		                + (f', and needs about 3 GB (free: {free:.1f} GB).' if free < 5 else '.'))
	return errors, warnings


def history():
	"""Cost and time of earlier runs, by scenario id. Master runs and runs without a result are left out."""
	by_id, every = {}, []
	for run_dir in run_dirs():
		try:
			runs = json.loads((run_dir / 'status.json').read_text()).get('runs', {})
		except (OSError, ValueError):
			continue
		for name, entry in runs.items():
			if name.endswith('--master') or entry.get('status') not in ('passed', 'failed'):
				continue
			if not (entry.get('startedAt') and entry.get('finishedAt')):
				continue
			usage = run_dir / 'runs' / name / 'usage.json'
			try:
				if usage.exists():
					cost = sum(c['cost'] for c in json.loads(usage.read_text()))
				else:
					meta = json.loads((run_dir / 'runs' / name / 'run.json').read_text())
					cost = None if meta.get('langsmithRunIds') else 0.0
			except (OSError, ValueError):
				cost = None
			sample = (cost, entry['finishedAt'] - entry['startedAt'])
			by_id.setdefault(entry.get('scenario', name), []).append(sample)
			every.append(sample)
	return by_id, every


def estimate(jobs, concurrency, compare_master, flags):
	"""Expected cost and time of the jobs, from the earlier runs of the same scenario ids. A master run that
	can be reused costs nothing."""
	by_id, every = history()
	try:
		base = baseline.target() if compare_master else None
	except subprocess.CalledProcessError:
		base = None

	def median(samples, index, default):
		values = [x[index] for x in samples if x[index] is not None]
		return statistics.median(values) if values else default

	any_cost, any_time = median(every, 0, None), median(every, 1, 60)
	rows, cost_total, known = [], 0.0, True
	for name, s, role in jobs:
		if role == 'master' and base and (MASTER_CACHE / master_key(s, base, flags) / 'result.json').is_file():
			rows.append((name + ' (kept)', 0.0, 0, True))
			continue
		samples = by_id.get(s['id'], [])
		cost = median(samples, 0, any_cost)
		seconds = median(samples, 1, any_time)
		if cost is None:
			known = False
		else:
			cost_total += cost
		rows.append((name, cost, seconds, bool(samples)))
	times = sorted((r[2] for r in rows), reverse=True)
	wall = max(times[0] if times else 0, sum(times) / max(1, concurrency)) + 15
	return {'rows': rows, 'cost': cost_total if known else None, 'seconds': wall,
	        'masterBuild': compare_master and not baseline.built()}


def print_estimate(est):
	say('Estimate (median of earlier runs; * means no earlier run of this scenario):')
	for name, cost, seconds, seen in est['rows']:
		price = f'${cost:.2f}' if cost is not None else '  ?  '
		say(f'  {name:44} {price:>7} {seconds:5.0f}s{"" if seen else " *"}')
	total = f'about ${est["cost"]:.2f}' if est['cost'] is not None else 'unknown cost'
	extra = ', plus 15 to 20 minutes for the first master build' if est['masterBuild'] else ''
	say(f'  {len(est["rows"])} runs, {total}, about {est["seconds"] / 60:.1f} minutes{extra}')


def fetch_usage(run_dir, names, timeout=90):
	"""Token usage and cost of each run from LangSmith, in one query for all runs. LangSmith receives traces
	with a delay, so the query repeats until each run has calls and the count stops changing."""
	if not setting('LANGSMITH_API_KEY'):
		return
	metas = {}
	for name in names:
		file = run_dir / 'runs' / name / 'run.json'
		meta = json.loads(file.read_text()) if file.exists() else {}
		if meta.get('langsmithRunIds') and not meta.get('cached'):
			metas[name] = meta
	if not metas:
		return
	start = min(m['startedAt'] for m in metas.values())
	end = max(m['finishedAt'] for m in metas.values())
	traces = {t for m in metas.values() for t in m['langsmithRunIds']}
	deadline, previous, calls = time.time() + timeout, None, []
	while True:
		try:
			calls = fetch_calls(start, end, traces)
		except (SystemExit, OSError, ValueError) as e:
			say(f'usage failed: {str(e)[:200]}')
			return
		seen = {c['trace'] for c in calls}
		complete = all(set(m['langsmithRunIds']) & seen for m in metas.values())
		if (complete and len(calls) == previous) or time.time() > deadline:
			break
		previous = len(calls)
		time.sleep(10)
	for name, meta in metas.items():
		own = [c for c in calls if c['trace'] in set(meta['langsmithRunIds'])]
		(run_dir / 'runs' / name / 'usage.json').write_text(json.dumps(own, indent=1))
		usage = totals(own)
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


def master_key(scenario, commit, flags):
	"""A master run gives the same screens while the commit, the flags, the script and the runner stay the same."""
	h = hashlib.sha256()
	overrides = setting('N8N_FEATURE_FLAG_OVERRIDES') or ''
	for part in (commit, json.dumps(flags or {}, sort_keys=True), overrides, scenario.get('viewport', '1600x1000'),
	             str(scenario.get('autoConfirm', True))):
		h.update(part.encode() + b'\0')
	for file in (Path(scenario['scriptPath']), HERE / 'kit.mjs', HERE / 'run_scenario.mjs'):
		h.update(file.read_bytes())
	return h.hexdigest()[:20]


def save_master_run(sub, key):
	if json.loads((sub / 'result.json').read_text()).get('status') != 'passed':
		return
	target = MASTER_CACHE / key
	shutil.rmtree(target, ignore_errors=True)
	shutil.copytree(sub, target, ignore=shutil.ignore_patterns('live.png', 'usage.json'))
	cutoff = time.time() - MASTER_CACHE_DAYS * 86400
	for old in MASTER_CACHE.iterdir():
		if old.is_dir() and old.stat().st_mtime < cutoff:
			shutil.rmtree(old, ignore_errors=True)


def reuse_master_run(sub, key):
	"""Copy a kept master run into this run. Returns False when there is none."""
	source = MASTER_CACHE / key
	if not (source / 'result.json').is_file():
		return False
	shutil.copytree(source, sub, dirs_exist_ok=True)
	meta = json.loads((sub / 'run.json').read_text())
	meta['cached'] = True
	(sub / 'run.json').write_text(json.dumps(meta, indent=2))
	return True


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


def result_table(run_dir, runs):
	"""A plain text table of the results, with the first problem of each run that did not pass."""
	lines = [f'  {"run":44} {"status":15} {"steps":>7} {"time":>6} {"errors":>6}']
	for name, entry in runs.items():
		sub = run_dir / 'runs' / name
		steps = report.read_json(sub / 'steps.json', [])
		result = report.read_json(sub / 'result.json', {})
		checked = [s for s in steps if s['kind'] in ('step', 'check', 'capture')]
		passed = f'{sum(s["status"] == "passed" for s in checked)}/{len(checked)}' if checked else '-'
		took = (entry.get('finishedAt') or 0) - (entry.get('startedAt') or 0)
		errors = (result.get('consoleErrors') or 0) + (result.get('requestErrors') or 0)
		status = entry['status'] + (' (kept)' if report.read_json(sub / 'run.json', {}).get('cached') else '')
		lines.append(f'  {name:44} {status:15} {passed:>7} {took:5.0f}s {errors:>6}')
		failed = next((s for s in steps if s['status'] == 'failed'), None)
		if failed:
			problem = f'{failed["kind"]} "{failed["title"]}": {failed.get("error") or ""}'
		else:
			problem = entry.get('reason') if entry['status'] != 'passed' else ''
		if (problem or '').strip():
			lines.append(f'      {problem.strip().splitlines()[0][:160]}')
	return '\n'.join(lines)


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--plan', help='scenarios.json')
	ap.add_argument('--rerun', help='"last", or an earlier run folder. Uses the current plan and scripts when they exist.')
	ap.add_argument('--only', help='Comma-separated scenario ids.')
	ap.add_argument('--run-dir')
	ap.add_argument('--concurrency', type=int, default=int(setting('FEATURE_TEST_CONCURRENCY', default='4')))
	ap.add_argument('--branch-url', help='Use this running instance for the branch runs instead of fresh ones.')
	ap.add_argument('--try', dest='try_mode', action='store_true',
	                help='A quick check of new scripts: no master, no live page, no usage, no report.')
	ap.add_argument('--estimate', action='store_true', help='Print the expected cost and time, then stop.')
	ap.add_argument('--check', action='store_true', help='Check the setup, then stop.')
	ap.add_argument('--no-build', action='store_true', help='Do not build this checkout first.')
	ap.add_argument('--no-baseline', action='store_true', help='Skip master. Visual scenarios run on the branch only.')
	ap.add_argument('--no-cache', action='store_true', help='Run master again, also when a kept master run exists.')
	ap.add_argument('--no-fetch', action='store_true', help='Use origin/master as it is, without git fetch.')
	ap.add_argument('--no-live', action='store_true', help='Do not start the live page.')
	ap.add_argument('--no-open', action='store_true',
	                help='Do not open the live page in the default browser. Use this when you open it in the editor browser.')
	ap.add_argument('--keep-instances', action='store_true', help='Keep the fresh instances running after the run.')
	args = ap.parse_args()
	if args.try_mode:
		args.no_baseline = args.no_live = True
	build = not args.no_build and not args.branch_url

	if args.check and not (args.plan or args.rerun):
		errors, warnings = preflight(build, need_master=True)
		for w in warnings:
			say(f'warning: {w}')
		for e in errors:
			say(f'error: {e}')
		branch = git('rev-parse', '--abbrev-ref', 'HEAD').replace('/', '-')
		say(f'plan folder for this branch: {PLANS_ROOT / branch}/<feature>/')
		say('The setup is ready.' if not errors else 'Fix the errors, then run again.')
		sys.exit(1 if errors else 0)
	if not (args.plan or args.rerun):
		sys.exit('Give --plan <scenarios.json>, --rerun last|<run-dir>, or --check.')
	# The fresh instances run in their own sessions. Exit through the cleanup, so they stop too.
	for sig in (signal.SIGTERM, signal.SIGHUP):
		signal.signal(sig, lambda signum, _frame: sys.exit(128 + signum))

	plan = load_plan(rerun_plan(args.rerun) if args.rerun else args.plan)
	if args.only:
		wanted = {x.strip() for x in args.only.split(',')}
		plan['scenarios'] = [s for s in plan['scenarios'] if s['id'] in wanted]
		if not plan['scenarios']:
			sys.exit(f'No scenario matches --only {args.only}.')

	visual = [s for s in plan['scenarios'] if s['kind'] == 'visual']
	compare_master = bool(visual) and not args.no_baseline
	jobs = []  # (name, scenario, instance role)
	for s in plan['scenarios']:
		if args.branch_url:
			role = 'branch'
		elif s['kind'] == 'visual':
			role = 'branch-visual'
		else:
			role = 'isolated' if s.get('isolated', True) else 'branch'
		jobs.append((s['id'], s, role))
		if s['kind'] == 'visual' and compare_master:
			jobs.append((f'{s["id"]}--master', s, 'master'))

	est = estimate(jobs, args.concurrency, compare_master, plan.get('featureFlags'))
	print_estimate(est)
	if args.estimate:
		return
	errors, warnings = preflight(build, compare_master, local_instances=not args.branch_url)
	for w in warnings:
		say(f'warning: {w}')
	if errors:
		sys.exit('The setup is not ready:\n  ' + '\n  '.join(errors))

	if args.run_dir:
		run_dir = Path(args.run_dir).expanduser().resolve()
		run_dir.mkdir(parents=True, exist_ok=True)
	else:
		run_dir = new_run_dir(RUNS_ROOT / 'try' if args.try_mode else RUNS_ROOT, plan['name'])
	copy_plan(plan, run_dir)
	say(f'run directory: {run_dir}')

	branch_commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=REPO_ROOT, capture_output=True,
	                               text=True).stdout.strip()
	dirty = bool(subprocess.run(['git', 'status', '--porcelain', '--', 'packages'], cwd=REPO_ROOT,
	                            capture_output=True, text=True).stdout.strip())
	live = live_enabled() and not args.no_live
	progress = Progress(run_dir, {
		'phase': 'running', 'step': 'Building the branch' if build else 'Starting the instances',
		'startedAt': time.time(), 'concurrency': args.concurrency,
		'branch': {'commit': branch_commit, 'dirty': dirty, 'url': args.branch_url},
		'master': {'commit': None} if compare_master else None,
		'runs': {name: {'status': 'waiting', 'scenario': s['id'], 'instance': role.split('-')[0]}
		         for name, s, role in jobs},
	})

	live_url = None
	if live:
		live_url = start_live_server(run_dir)
		if live_url:
			say(f'live page: {live_url}/report/live')
			if not args.no_open and not open_in_default_browser(f'{live_url}/report/live'):
				say(f'no browser opened. Open {live_url}/report/live to watch the runs.')
		else:
			say(f'the live page did not start, see {run_dir / "live-server.log"}')

	instances, lock = [], threading.Lock()
	keep = args.keep_instances
	pool = ThreadPoolExecutor(max_workers=max(1, args.concurrency))
	# Shared instances start at once. Isolated instances start ahead of their scenario, with at most one
	# more alive than the number of scenarios that run at the same time.
	shared_pool = ThreadPoolExecutor(max_workers=3)
	boot_pool = ThreadPoolExecutor(max_workers=args.concurrency + 1)
	alive = threading.BoundedSemaphore(args.concurrency + 1)
	futures, shared = [], {}

	def start_instance(name, root):
		inst = Instance(name, root, run_dir / 'instances' / name, run_dir / 'instances' / f'{name}.log',
		                plan.get('featureFlags'))
		with lock:
			instances.append(inst)
		started = time.time()
		inst.start()
		# The port only: Cursor opens an editor tab for each new localhost URL that a command prints.
		say(f'{name} instance ready in {time.time() - started:.0f}s on port {inst.port}')
		return inst

	def boot_isolated(name):
		alive.acquire()
		try:
			return start_instance(name, REPO_ROOT)
		except Exception:
			alive.release()
			raise

	def run_on(name, scenario, role, instance):
		"""Run one job when its instance is ready. instance is a future of an Instance, or a URL."""
		progress.run(name, status='starting')
		try:
			inst = instance.result() if hasattr(instance, 'result') else None
		except Exception as e:
			progress.run(name, status='error', finishedAt=time.time(), reason=f'The instance did not start: {e}')
			return
		url = inst.url if inst else instance
		try:
			run_job(name, scenario, url, role.split('-')[0], run_dir, progress, live)
			if role == 'master' and not args.no_cache:
				save_master_run(run_dir / 'runs' / name,
				                master_key(scenario, progress.data['master']['commit'], plan.get('featureFlags')))
		finally:
			if role == 'isolated':
				if not keep:
					inst.stop(clean=True)
				alive.release()

	def submit(name, scenario, role, instance):
		futures.append(pool.submit(run_on, name, scenario, role, instance))

	def skip(role, reason):
		for name, _, r in jobs:
			if r == role and progress.data['runs'][name]['status'] == 'waiting':
				progress.run(name, status='skipped', reason=reason)

	master_jobs = [(name, s) for name, s, r in jobs if r == 'master']
	base_commit = None
	if compare_master:
		try:
			base_commit = baseline.target(fetch=not args.no_fetch)
		except subprocess.CalledProcessError as e:
			say(f'cannot find the master merge base: {e}', 'master')
		if base_commit:
			progress.update(master={'commit': base_commit})
			if not args.no_cache:
				left = []
				for name, s in master_jobs:
					if reuse_master_run(run_dir / 'runs' / name, master_key(s, base_commit, plan.get('featureFlags'))):
						now = time.time()
						progress.run(name, status='passed', startedAt=now, finishedAt=now)
						say(f'master run kept from an earlier run of {base_commit[:11]}', name)
					else:
						left.append((name, s))
				master_jobs = left

	def master_side():
		try:
			built = baseline.prepare(fetch=False, say=lambda m: say(m, 'master'))
			progress.update(master={'commit': built['commit']})
			inst = start_instance('master', built['root'])
			for name, s in master_jobs:
				submit(name, s, 'master', inst.url)
		except Exception as e:
			say(f'master is not available: {e}', 'master')
			skip('master', f'Master is not available: {e}')

	visual_error = None
	try:
		if build:
			step('Build this checkout')
			build_branch(run_dir / 'build.log')
		elif not args.branch_url:
			stale = stale_packages()
			if stale:
				say('warning: these packages have source changes that are newer than their build: '
				    f'{", ".join(stale)}. The fresh instances run the old build.')
				progress.update(stale=stale)

		step(f'Run {len(jobs)} scenario runs, {args.concurrency} at a time')
		progress.update(step='Running the scenarios')
		for role in ('branch', 'branch-visual'):
			if any(r == role for _, _, r in jobs):
				shared[role] = args.branch_url or shared_pool.submit(start_instance, role, REPO_ROOT)
		boots = {name: boot_pool.submit(boot_isolated, name) for name, _, r in jobs if r == 'isolated'}
		master_thread = None
		if compare_master and master_jobs and base_commit:
			master_thread = threading.Thread(target=master_side, daemon=True)
			master_thread.start()
		elif compare_master and not base_commit:
			skip('master', 'The master merge base is not known.')
		for name, s, role in jobs:
			if role == 'isolated':
				submit(name, s, role, boots[name])
			elif role in shared:
				submit(name, s, role, shared[role])
		if master_thread:
			master_thread.join()
		# Jobs can be added while the pool runs, so wait until the list stops growing.
		while any(not f.done() for f in list(futures)):
			time.sleep(1)
		for f in futures:
			if f.exception():
				say(f'a run failed: {f.exception()}')
		pool.shutdown()
		if not keep:
			for inst in instances:
				inst.stop(clean=True)

		names = [name for name, _, _ in jobs]
		if compare_master:
			step('Compare the visual captures with master')
			progress.update(step='Comparing the captures with master')
			diff = subprocess.run(['node', 'visual_diff.mjs', str(run_dir)], cwd=HERE)
			if diff.returncode != 0:
				visual_error = f'visual_diff.mjs failed with exit code {diff.returncode}. The visual check is not complete.'
				say(f'error: {visual_error}')
				progress.update(visualError=visual_error)
			trees = [r for r in compare_trees(run_dir) if r.get('ariaDiff')]
			if trees:
				say(f'{len(trees)} captures with a difference in the accessibility tree: '
				    + ', '.join(f'{r["scenario"]}/{r["name"]}' for r in trees))

		step('Summarize the runs for the judge')
		summary = report.summarize(run_dir)
		if visual_error:
			summary = f'VISUAL CHECK FAILED: {visual_error}\n\n{summary}'
		(run_dir / 'summary.txt').write_text(summary)
		if not args.try_mode:
			step('Build the report')
			progress.update(step='Building the report')
			report.build(run_dir)
		progress.finish()
	finally:
		pool.shutdown(wait=False, cancel_futures=True)
		boot_pool.shutdown(wait=False, cancel_futures=True)
		shared_pool.shutdown(wait=False, cancel_futures=True)
		for proc in list(RUNNERS):
			proc.kill()
		if not keep:
			for inst in instances:
				inst.stop(clean=True)
		progress.finish()

	runs = progress.data['runs']
	visual_results = json.loads((run_dir / 'visual.json').read_text()) if (run_dir / 'visual.json').exists() else []
	not_passed = [n for n, e in runs.items() if e['status'] != 'passed' and not n.endswith('--master')]
	rerun = f'python3 {S}/run.py --rerun {run_dir}' + (f' --only {",".join(not_passed)}' if not_passed else '')
	usage_later = not args.try_mode and bool(setting('LANGSMITH_API_KEY'))
	say('\n=== Result ===')
	say(result_table(run_dir, runs))
	if not_passed:
		say(f'Run the ones that did not pass again: {rerun}')
	print(json.dumps({
		'runDir': str(run_dir),
		'report': None if args.try_mode else str(run_dir / 'report' / 'index.html'),
		'live': f'{live_url}/report/index.html' if live_url else None,
		'summary': str(run_dir / 'summary.txt'),
		'results': {name: runs[name]['status'] for name in runs},
		'visual': {'captures': len(visual_results),
		           'changed': [f'{r["scenario"]}/{r["name"]}' for r in visual_results if r['status'] != 'unchanged'],
		           'error': visual_error},
		'instancePorts': {i.name: i.port for i in instances} if keep else None,
		'rerun': rerun,
		'usage': 'The token usage comes in the next lines. The report updates when it is done.' if usage_later else None,
		'next': ('Fix the scripts that failed, then run --try again, or run the full plan.' if args.try_mode else
		         'Judge each run from summary.txt and write verdicts.json. The live page rebuilds the report.'),
	}, indent=2), flush=True)

	if usage_later:
		step('Fetch the token usage from LangSmith')
		fetch_usage(run_dir, [n for n in runs])
		report.build(run_dir)
		say('usage: done, the report is updated')


if __name__ == '__main__':
	main()
