#!/usr/bin/env python3
"""Build the report of a feature test run, and the live page while it runs.

  report.py <run-dir>          build <run-dir>/report/index.html (run it again after verdicts.json)
  report.py <run-dir> --summary  print the summary for the judge

Inputs in <run-dir>:
  plan/scenarios.json    the plan (run.py copies it)
  status.json            the status of each run (run.py writes it)
  runs/<name>/           the files of one run (run_scenario.mjs and run.py write them)
  visual.json            the visual check (visual_diff.mjs and run.py write it)
  verdicts.json          optional: {"<name>": {"verdict": "pass|partial|fail", "summary": "...",
                         "checks": [{"ok": true|false|null, "text": "..."}]}}

The page uses the template and the LLM steps view of testmax-n8n-ai.
"""

import fcntl
import json
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

import common  # noqa: F401  (puts the shared scripts on the import path)
import build_report as br
import live_server as ls

STATUS = {'waiting': ('st-waiting', 'Waiting'), 'starting': ('st-waiting', 'Starting'), 'running': ('st-running', 'Running'),
          'passed': ('st-done', 'Passed'), 'failed': ('st-failed', 'Failed'), 'error': ('st-failed', 'Error'),
          'skipped': ('st-skipped', 'Skipped')}
FINISHED = ('passed', 'failed', 'error', 'skipped')
KIND_LABELS = {'feature': 'Feature', 'regression': 'Regression', 'visual': 'Visual'}
VISUAL = {'changed': ('vis-changed', 'Changed'), 'unchanged': ('vis-same', 'Unchanged'),
          'branch-only': ('vis-only', 'Only on branch'), 'master-only': ('vis-only', 'Only on master')}
THEAD = ('<tr><th>Scenario</th><th>Kind</th><th>Result</th><th>Steps</th><th>Time</th><th>LLM calls</th>'
         '<th>Tool calls</th><th>Input tokens</th><th>Output tokens</th><th>Cost</th><th>Browser errors</th></tr>')

CSS = """<style>
.run-video video{display:block;width:100%;max-height:70vh;aspect-ratio:16/10;object-fit:contain;background:var(--black);border-radius:var(--r8)}
.badge.vis-changed{background:var(--pink-70);color:var(--bg)}
.badge.vis-same{background:var(--bg-3);color:var(--black)}
.badge.vis-only{box-shadow:inset 0 0 0 1px var(--line-strong);color:var(--dim)}
.facts{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:var(--s4) var(--s16);margin:0}
.facts dt{font:10px/18px var(--mono);text-transform:uppercase;letter-spacing:.02em;color:var(--dim)}
.facts dd{margin:0;word-break:break-word}
.run-error{margin:var(--s12) 0 0;background:var(--pink-10);color:var(--pink-70);border-radius:var(--r8);padding:var(--s12);white-space:pre-wrap;word-break:break-word;font:12px/16px var(--mono);max-height:240px;overflow:auto}
.tsteps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s16)}
@media (max-width:1000px){.tsteps{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.tsteps{grid-template-columns:minmax(0,1fr)}}
.tstep{display:flex;flex-direction:column;min-width:0;background:var(--white);border:1px solid var(--line);border-radius:var(--r8);overflow:hidden}
.tstep.failed{background:var(--pink-10);border-color:var(--pink-70);box-shadow:0 0 0 1px var(--pink-70)}
.tstep-shot{display:block;width:100%;aspect-ratio:16/10;padding:0;border:0;border-bottom:1px solid var(--line);background:var(--bg-3);cursor:zoom-in;overflow:hidden}
.tstep-shot img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center;transition:transform .15s}
.tstep-shot:hover img{transform:scale(1.03)}
.tstep-shot:focus-visible{outline:2px solid var(--pink);outline-offset:-2px}
@media (prefers-reduced-motion:reduce){.tstep-shot img{transition:none}}
.tstep-noshot{display:grid;place-items:center;aspect-ratio:16/10;background:var(--bg-2);border-bottom:1px solid var(--line);color:var(--gray-50);font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em}
.tstep-info{display:flex;gap:var(--s12);align-items:flex-start;padding:var(--s12);min-width:0}
.tstep-info > div{flex:1;min-width:0;display:flex;flex-direction:column;gap:var(--s4)}
.tstep-info.running .num{background:var(--pink-10);color:var(--pink-70)}
.tstep-info.passed .num{background:var(--pink)}
.tstep-info.failed .num{background:var(--pink-70);color:var(--bg)}
.tstep-title{font-weight:500;padding-top:3px;word-break:break-word}
.tstep-title .mono-label{font-weight:400;margin-right:var(--s8)}
.tstep-info pre{margin:var(--s4) 0 0;white-space:pre-wrap;word-break:break-word;font:12px/16px var(--mono);color:var(--pink-70);max-height:200px;overflow:auto}
.shot-viewer .theater-bar{flex-wrap:nowrap;align-items:flex-start}
.shot-viewer-info{flex:1;min-width:0;padding-top:3px}
.shot-viewer-actions{flex:none;display:flex;align-items:center;gap:var(--s16)}
.shot-viewer-info .tstep-info{padding:0}
.shot-viewer-info .tstep-title{font-size:18px;line-height:22px}
.shot-viewer-img{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;cursor:zoom-out}
.shot-viewer-img img{display:block;max-width:100%;max-height:100%;border-radius:var(--r8);box-shadow:0 0 0 1px var(--line);cursor:default}
.err-list{margin:0;padding-left:var(--s16);font:12px/16px var(--mono)}
.err-list li{margin-bottom:var(--s4);word-break:break-word}
.vis{background:var(--white);border-radius:var(--r8);padding:var(--s12);box-shadow:inset 0 0 0 1px var(--line);margin-top:var(--s12)}
.vis.changed{box-shadow:inset 4px 0 0 var(--pink-70),inset 0 0 0 1px var(--line)}
.vis-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s12)}
.vis-grid figure{margin:0}
.vis-grid figcaption{margin-bottom:var(--s4)}
.vis-grid img{display:block;width:100%;height:auto;border-radius:var(--r4);box-shadow:0 0 0 1px var(--line)}
.vis details summary{cursor:pointer;color:var(--dim);margin-top:var(--s8);font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em}
.vis pre{background:var(--bg);border-radius:var(--r4);padding:var(--s12);margin:var(--s8) 0 0;overflow:auto;max-height:320px;font-size:12px;line-height:16px;white-space:pre}
</style>"""


def read_json(path, default):
	try:
		return json.loads(path.read_text())
	except (OSError, ValueError):
		return default


def seconds(value):
	return f'{value:.0f}s'


def load_trace(sub, result):
	"""LLM steps from the thread events, and per-call tokens from usage.json when LangSmith had them."""
	data = ls.load_instance_ai_live(sub)
	events_file = sub / 'events.jsonl'
	rows = br.read_jsonl(events_file) if events_file.exists() else []
	starts = [r['ts'] / 1000 for r in rows if r.get('type') == 'run-start' and r.get('ts')]
	usage = read_json(sub / 'usage.json', None)
	if usage and starts:
		start = starts[0]
		data['calls'] = sorted((
			{'t': br.ts(u['start']) - start, 'start': br.ts(u['start']) - start,
			 'end': br.ts(u['end']) - start if u.get('end') else None,
			 'name': (u.get('name') or '').removeprefix('llm: ') or None,
			 'prompt': u['in'], 'cache_read': u['cache_read'], 'cache_write': u['cache_write'],
			 'out': u['out'], 'cost': u['cost']} for u in usage), key=lambda c: c['t'])
		data['model'] = ', '.join(sorted({u['model'] for u in usage if u.get('model')})) or None
		data['cost'] = f'${sum(c["cost"] for c in data["calls"]):.2f}'
		data['costSource'] = 'langsmith'
	if result.get('startedAt') and result.get('finishedAt'):
		data['duration'] = seconds(br.ts(result['finishedAt']) - br.ts(result['startedAt']))
	return data


def load(run_dir):
	"""The plan, the status, and one dict for each run in plan order."""
	plan = read_json(run_dir / 'plan' / 'scenarios.json', {'scenarios': []})
	status = ls.read_status(run_dir)
	entries = status.get('runs') or {}
	runs = []
	for s in plan['scenarios']:
		for name in (s['id'], f'{s["id"]}--master'):
			if name not in entries:
				continue
			entry = entries[name]
			sub = run_dir / 'runs' / name
			result = read_json(sub / 'result.json', {})
			data = load_trace(sub, result)
			if entry.get('status') in ('waiting', 'running'):
				data['cost'] = '-'
				if entry.get('startedAt'):
					data['duration'] = seconds((entry.get('finishedAt') or time.time()) - entry['startedAt'])
			runs.append({
				'name': name, 'scenario': s, 'entry': entry, 'master': name.endswith('--master'),
				'steps': read_json(sub / 'steps.json', []), 'result': result,
				'console': read_json(sub / 'console.json', {}), 'meta': read_json(sub / 'run.json', {}),
				'data': data,
			})
	return plan, status, runs


def status_badge(state):
	cls, label = STATUS.get(state, ('st-waiting', state))
	return f'<span class="badge {cls}">{br.esc(label)}</span>'


def run_title(run):
	return run['scenario']['title'] + (' (master)' if run['master'] else '')


def check_count(steps):
	checked = [s for s in steps if s['kind'] in ('step', 'check', 'capture')]
	return f'{sum(s["status"] == "passed" for s in checked)}/{len(checked)}' if checked else '-'


def row_cells(run, result_html):
	data, result = run['data'], run['result']
	calls, tools = data['calls'], [e for e in data['events'] if e['kind'] == 'tool']
	errors = sum(e['error'] for e in tools)
	browser = (result.get('consoleErrors') or 0) + (result.get('requestErrors') or 0)
	cells = [
		f'<span class="run-name">{br.esc(run_title(run))}</span>',
		KIND_LABELS.get(run['scenario']['kind'], run['scenario']['kind']),
		result_html, check_count(run['steps']), data['duration'], str(len(calls)) if calls else '-',
		f'{len(tools)}' + (f' <span class="err">({errors} err)</span>' if errors else ''),
		br.kilo(sum(c['prompt'] for c in calls)) if calls else '-',
		br.kilo(sum(c['out'] for c in calls)) if calls else '-',
		f'<strong>{br.esc(data["cost"])}</strong>',
		f'<span class="err">{browser}</span>' if browser else '0',
	]
	return ''.join(f'<td>{c}</td>' for c in cells)


def result_html(run, verdict):
	"""The judge's verdict. The script status shows only while it runs or when it fails, because the Steps
	column already counts the steps that passed."""
	if verdict and verdict.get('verdict'):
		return br.badge(verdict['verdict'])
	state = run['entry'].get('status', 'waiting')
	if state != 'passed':
		return status_badge(state)
	if run['master']:
		return '<span class="badge st-done">Baseline</span>'
	return br.badge(None)


def render_video(screen):
	"""The video of the run, above the expected outcome. Only the built report has it."""
	if not screen:
		return ''
	poster = f' poster="{br.esc(screen["poster"])}"' if screen.get('poster') else ''
	return br.fold('Video', f'<span class="mono-label">n8n UI · {br.esc(screen["duration"])}</span>',
	               f'<div class="run-video"><video controls muted playsinline preload="metadata" '
	               f'src="{br.esc(screen["src"])}"{poster}></video></div>', cls='brief-card prompt')


def render_expected(run, verdict):
	head = br.verdict_head(verdict) if verdict else ''
	body = f'<div class="msg">{br.esc(run["scenario"]["expected"])}</div>'
	if verdict:
		body += f'<div class="verdict-body">{br.render_checks(verdict)}</div>'
	elif run['entry'].get('status') in FINISHED:
		body += '<p class="dim">Not judged yet.</p>'
	return br.fold('Expected outcome', head, body)


def render_run_box(run):
	entry, result, meta = run['entry'], run['result'], run['meta']
	facts = [('Instance', f'{"master" if run["master"] else "branch"} · {entry.get("baseUrl") or "-"}')]
	if entry.get('startedAt'):
		facts.append(('Started', datetime.fromtimestamp(entry['startedAt']).strftime('%H:%M:%S')))
	if result.get('threads'):
		facts.append(('Threads', ', '.join(result['threads'])))
	if meta.get('cached'):
		facts.append(('Reused', 'This master run is from an earlier run of the same master commit and script.'))
	if meta.get('decisions'):
		facts.append(('Confirmations', f'{len(meta["decisions"])} answered by the auto-approve policy'))
	if result:
		facts.append(('Browser errors', f'{result.get("consoleErrors", 0)} console, {result.get("requestErrors", 0)} requests'))
	dl = ''.join(f'<dt>{br.esc(k)}</dt><dd>{br.esc(v)}</dd>' for k, v in facts)
	error = result.get('error') or (entry.get('reason') if entry.get('status') in ('error', 'skipped') else None)
	error_html = f'<pre class="run-error">{br.esc(error)}</pre>' if error else ''
	return br.fold('Run', status_badge(entry.get('status', 'waiting')), f'<dl class="facts">{dl}</dl>{error_html}')


def render_scenario_steps(steps, files):
	if not steps:
		return br.fold('Scenario steps', '', '<p class="dim">No steps yet.</p>')
	items = []
	for s in steps:
		status, title = br.esc(s['status']), br.esc(s['title'])
		duration = f' · took {s["duration"]:.1f}s' if s.get('duration') is not None else ''
		if s.get('shot'):
			src = f'{files}{br.esc(s["shot"])}'
			thumb = (f'<button type="button" class="tstep-shot" data-src="{src}" aria-label="Show step {s["i"]} '
			         f'full screen"><img src="{src}" loading="lazy" alt="Screen after: {title}"></button>')
		else:
			thumb = '<div class="tstep-noshot">No screenshot</div>'
		error = f'<pre>{br.esc(s["error"])}</pre>' if s.get('error') else ''
		items.append(
			f'<li class="tstep {status}">{thumb}<div class="tstep-info {status}"><span class="num">{s["i"]}</span><div>'
			f'<div class="tstep-title"><span class="mono-label">{br.esc(s["kind"])}</span><span>{title}</span></div>'
			f'<div class="mono-label">at {s["t"]:.1f}s{duration}</div>{error}</div></div></li>')
	passed = sum(s['status'] == 'passed' for s in steps)
	return br.fold('Scenario steps', f'<span class="mono-label">{passed} of {len(steps)} passed</span>',
	               f'<ol class="tsteps">{"".join(items)}</ol>')


def render_errors(console):
	console_errors, request_errors = console.get('consoleErrors') or [], console.get('requestErrors') or []
	if not console_errors and not request_errors:
		return ''
	items = [f'<li>{br.esc(e.get("text", ""))}</li>' for e in console_errors[:50]]
	items += [f'<li>{e.get("status") or "failed"} {br.esc(e.get("method", ""))} {br.esc(e.get("url", ""))}'
	          f'{" · " + br.esc(e["error"]) if e.get("error") else ""}</li>' for e in request_errors[:50]]
	return br.fold('Browser errors', f'<span class="mono-label">{len(console_errors)} console · '
	               f'{len(request_errors)} requests</span>', f'<ul class="err-list">{"".join(items)}</ul>')


def render_panel(run, verdict, files, scale, screen=None):
	data = run['data']
	prompt = (run['result'].get('prompts') or [{}])[0].get('text', '')
	load_error = f'<div class="box err">Could not read the trace: {br.esc(data["loadError"])}</div>' if data.get('loadError') else ''
	return (f'{load_error}{render_video(screen)}'
	        f'{render_expected(run, verdict)}{render_run_box(run)}'
	        f'{render_scenario_steps(run["steps"], files)}'
	        f'{br.render_steps(data["calls"], data["events"], *scale, prompt)}'
	        f'{render_errors(run["console"])}')


def render_case(plan, status):
	branch, master = status.get('branch') or {}, status.get('master')
	kinds = [s['kind'] for s in plan['scenarios']]
	lines = [f'Branch {branch.get("commit") or "?"}' + (' with local changes' if branch.get('dirty') else '')
	         + (f' on {branch["url"]}' if branch.get('url') else ' on a fresh instance')]
	if master is not None:
		lines.append(f'Master {(master.get("commit") or "(building)")[:11]} (the merge base) on a fresh instance')
	lines.append(f'{len(kinds)} scenarios: ' + ', '.join(f'{kinds.count(k)} {k}' for k in KIND_LABELS if kinds.count(k)))
	lines.append(f'{status.get("concurrency", 1)} at a time')
	return (f'<div class="case"><div class="box"><div class="mono-label">Feature</div><div class="msg">'
	        f'{br.esc(plan.get("feature") or "-")}</div></div><div class="box"><div class="mono-label">Run</div>'
	        f'<div class="msg">{br.esc(chr(10).join(lines))}</div></div></div>')


def notes(status, runs, verdicts):
	parts = []
	if not verdicts and status.get('phase') == 'done':
		parts.append('The runs are not judged yet. This page reloads when the verdicts and the token usage are ready.')
	parts.append('Times are seconds from the start of each scenario. Several scenarios ran at the same time on one '
	             'machine, so their times include the shared load. Tokens and cost come from LangSmith, matched by the '
	             'traces of the threads of each scenario. An asterisk on a time marks text placed at the previous tool call.')
	if any(r['master'] for r in runs):
		parts.append('Visual scenarios ran on a fresh branch instance and on a fresh master instance, so both start '
		             'from the same empty state. Master is the merge base of the branch.')
	if status.get('stale'):
		parts.append('Warning: these packages had source changes newer than their build, so the branch instance ran '
		             f'an old build: {", ".join(status["stale"])}.')
	return br.esc(' '.join(parts))


def render_visual(results, runs, files):
	if not results:
		return ''
	titles = {r['scenario']['id']: r['scenario']['title'] for r in runs}
	cards = []
	for r in results:
		cls, label = VISUAL.get(r['status'], ('vis-only', r['status']))
		ratio = f'{100 * r["ratio"]:.2f}% of pixels' if r.get('ratio') is not None else ''
		sizes = (f' · size {r["masterSize"][0]}×{r["masterSize"][1]} → {r["branchSize"][0]}×{r["branchSize"][1]}'
		         if r.get('branchSize') and r['branchSize'] != r.get('masterSize') else '')
		figures = ''
		for caption, key in (('Master', 'master'), ('Branch', 'branch'), ('Difference', 'diff')):
			src = files(r, key)
			figures += (f'<figure><figcaption class="mono-label">{caption}</figcaption>'
			            + (f'<a href="{src}" target="_blank"><img src="{src}" loading="lazy" alt="{caption}: {br.esc(r["name"])}"></a>'
			               if src else '<p class="dim">No screen.</p>') + '</figure>')
		tree = (f'<details><summary>Accessibility tree diff</summary><pre>{br.esc(r["ariaDiff"])}</pre></details>'
		        if r.get('ariaDiff') else '')
		cards.append(
			f'<div class="vis {"changed" if r["status"] != "unchanged" else ""}"><div class="head">'
			f'<h3>{br.esc(titles.get(r["scenario"], r["scenario"]))} › {br.esc(r["name"])}</h3>'
			f'<span class="mono-label">{ratio}{sizes}</span><span class="badge {cls}">{label}</span></div>'
			f'<div class="vis-grid">{figures}</div>{tree}</div>')
	changed = sum(r['status'] != 'unchanged' for r in results)
	return br.fold('Visual check against master',
	               f'<span class="mono-label">{len(results)} captures · {changed} changed</span>',
	               '<p class="fineprint">Pink pixels in the difference changed by more than a small color threshold. '
	               'Magenta boxes are masked parts, such as LLM text. The accessibility tree diff shows changes in '
	               'structure, roles and labels.</p>' + ''.join(cards))


STEP_VIEWER_JS = """
// A step screenshot opens full screen. The listeners are delegated, because the live page replaces the panels.
(()=>{
  const viewer = document.createElement('div');
  viewer.className = 'theater shot-viewer';
  viewer.hidden = true;
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', 'Step screenshot');
  viewer.innerHTML = '<div class="theater-bar"><div class="shot-viewer-info"></div><div class="shot-viewer-actions">'
    + '<span class="mono-label" data-shot-count></span>'
    + '<button type="button" class="btn" data-shot-move="-1">Previous</button>'
    + '<button type="button" class="btn" data-shot-move="1">Next</button>'
    + '<button type="button" class="btn accent" data-shot-close>Close</button></div></div>'
    + '<div class="shot-viewer-img"><img alt=""></div>'
    + '<p class="fineprint">Press the left or right arrow key to change the step. Press Esc to close.</p>';
  document.body.append(viewer);
  let run = null, index = 0, opener = null;
  const shots = () => [...(document.getElementById(run)?.querySelectorAll('.tstep-shot') || [])];
  function render(){
    const items = shots();
    if (!items.length) return close();
    index = Math.min(index, items.length - 1);
    const button = items[index], img = viewer.querySelector('.shot-viewer-img img');
    img.src = button.dataset.src;
    img.alt = button.querySelector('img').alt;
    viewer.querySelector('.shot-viewer-info').replaceChildren(button.closest('.tstep').querySelector('.tstep-info').cloneNode(true));
    viewer.querySelector('[data-shot-count]').textContent = `${index + 1} of ${items.length}`;
  }
  function open(button){
    run = button.closest('.run').id;
    index = Math.max(0, shots().indexOf(button));
    opener = button;
    viewer.hidden = false;
    document.body.classList.add('theater-open');
    render();
    viewer.querySelector('[data-shot-close]').focus();
  }
  function close(){
    viewer.hidden = true;
    run = null;
    document.body.classList.remove('theater-open');
    if (opener?.isConnected) opener.focus();
  }
  function move(step){
    const count = shots().length;
    if (!count) return close();
    index = (index + step + count) % count;
    render();
  }
  document.addEventListener('click', e=>{
    const button = e.target.closest('.tstep-shot');
    if (button) open(button);
  });
  viewer.addEventListener('click', e=>{
    const step = e.target.closest('[data-shot-move]');
    if (step) move(Number(step.dataset.shotMove));
    else if (e.target.closest('[data-shot-close]') || e.target.classList.contains('shot-viewer-img')) close();
  });
  document.addEventListener('keydown', e=>{
    if (viewer.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
  });
})();
"""

VIDEO_JS = """
// The video of a run plays only while its panel shows.
const showPanel = show;
show = (id)=>{
  showPanel(id);
  document.querySelectorAll('.run:not(.active) .run-video video').forEach(v=>v.pause());
};
"""

RELOAD_JS = """
// Served by the live page: reload when the report is built again, for example after the verdicts.
(()=>{
  if (!location.protocol.startsWith('http')) return;
  const saved = JSON.parse(sessionStorage.getItem('report-view') || 'null');
  if (saved) {
    sessionStorage.removeItem('report-view');
    if (document.getElementById(saved.run)) show(saved.run);
    window.scrollTo(0, saved.y);
  }
  setInterval(async ()=>{
    try {
      const version = (await (await fetch('version.txt', {cache: 'no-store'})).text()).trim();
      if (version && version !== REPORT_VERSION) {
        const run = document.querySelector('.run.active')?.id;
        sessionStorage.setItem('report-view', JSON.stringify({run, y: window.scrollY}));
        location.reload();
      }
    } catch {}
  }, 3000);
})();
"""


def build(run_dir):
	"""Write report/index.html with its images and videos. Returns its path. Two builds of one run can
	happen at the same time (run.py, report.py, the live page), so they take turns."""
	run_dir.mkdir(parents=True, exist_ok=True)
	with (run_dir / 'report.lock').open('w') as lock:
		fcntl.flock(lock, fcntl.LOCK_EX)
		return _build(run_dir)


def _build(run_dir):
	plan, status, runs = load(run_dir)
	verdicts = br.load_verdicts(run_dir)
	report = run_dir / 'report'
	for sub in ('runs', 'screens', 'visual'):
		shutil.rmtree(report / sub, ignore_errors=True)
	report.mkdir(parents=True, exist_ok=True)
	for sub in ('fonts', 'brand'):
		if (br.ASSET_CACHE / sub).exists():
			shutil.copytree(br.ASSET_CACHE / sub, report / sub, dirs_exist_ok=True)

	scale = br.token_scale([(r['name'], {}, r['data']) for r in runs])
	rows, panels, screens = [], [], []
	for i, run in enumerate(runs):
		name, sub = run['name'], run_dir / 'runs' / run['name']
		shots = report / 'runs' / name
		for png in sub.glob('*.png'):
			if png.name not in ('live.png', 'screen-poster.png'):
				shots.mkdir(parents=True, exist_ok=True)
				shutil.copy(png, shots / png.name)
		verdict = verdicts.get(name)
		screen = None
		if (sub / 'screen.webm').exists():
			(report / 'screens').mkdir(exist_ok=True)
			shutil.copy(sub / 'screen.webm', report / 'screens' / f'{name}.webm')
			screen = {'name': name, 'title': run_title(run), 'duration': run['data']['duration'], 'type': 'video',
			          'src': f'screens/{name}.webm', 'verdict': (verdict or {}).get('verdict'),
			          'label': KIND_LABELS.get(run['scenario']['kind'], '')}
			if (sub / 'screen-poster.png').exists():
				shutil.copy(sub / 'screen-poster.png', report / 'screens' / f'{name}-poster.png')
				screen['poster'] = f'screens/{name}-poster.png'
			screens.append(screen)
		active = ' active' if i == 0 else ''
		rows.append(f'<tr class="row{active}" data-run="{name}" onclick="show(\'{name}\')">'
		            + row_cells(run, result_html(run, verdict)) + '</tr>')
		panels.append(f'<section class="run{active}" id="{name}">'
		              + render_panel(run, verdict, f'runs/{name}/', scale, screen) + '</section>')

	results = read_json(run_dir / 'visual.json', [])
	for r in results:
		target = report / 'visual' / r['scenario']
		target.mkdir(parents=True, exist_ok=True)
		for key, source in (('branch', run_dir / 'runs' / r['scenario'] / 'captures' / f'{r["name"]}.png'),
		                    ('master', run_dir / 'runs' / f'{r["scenario"]}--master' / 'captures' / f'{r["name"]}.png'),
		                    ('diff', run_dir / (r.get('diff') or 'missing'))):
			if source.is_file():
				shutil.copy(source, target / f'{r["name"]}.{key}.png')

	def visual_file(r, key):
		return (f'visual/{r["scenario"]}/{r["name"]}.{key}.png'
		        if (report / 'visual' / r['scenario'] / f'{r["name"]}.{key}.png').exists() else None)

	replay = br.render_replay(screens, 'Each video shows one scenario in the n8n UI. Press Esc to close.')
	version = str(time.time_ns())
	page = br.fill_template(
		br.esc(plan.get('title') or 'Instance AI feature test'), ''.join(rows), notes(status, runs, verdicts),
		''.join(panels), replay=replay, after_table=render_visual(results, runs, visual_file), head=CSS,
		scripts=(f'<script>const SCREENS = {json.dumps(screens)}; const REPORT_VERSION = "{version}";</script>'
		         f'<script>window.addEventListener("DOMContentLoaded", ()=>{{{VIDEO_JS}{RELOAD_JS}}});</script>'
		         f'<script>{STEP_VIEWER_JS}</script>'),
		case=render_case(plan, status), thead=THEAD, kicker='Assistant UI test')
	(report / 'index.html').write_text(page)
	(report / 'version.txt').write_text(version)
	return report / 'index.html'


def clock(status):
	started = status.get('startedAt')
	elapsed = seconds((status.get('finishedAt') or time.time()) - started) if started else ''
	return ' · '.join(x for x in (f'{status.get("concurrency", 1)} at a time', elapsed, status.get('step')) if x)


def live_box(status, runs):
	cards = []
	for run in runs:
		name, title = run['name'], br.esc(run_title(run))
		cards.append(
			f'<div class="live-card"><div class="live-screen"><button type="button" class="live-zoom" '
			f'data-zoom="{name}" aria-label="Show {title} full screen"><img data-shot="{name}" '
			f'alt="{title} in the n8n UI" hidden></button>'
			f'<div class="live-empty" data-shot-empty="{name}">Waiting for the first screenshot</div></div>'
			f'<div class="reel-meta"><span class="run-name">{title}</span>'
			f'<span data-live-badge="{name}">{status_badge(run["entry"].get("status", "waiting"))}</span></div></div>')
	return (f'<div class="box"><div class="head"><h2>Live</h2><span class="mono-label" id="live-clock">'
	        f'{br.esc(clock(status))}</span></div><div class="live-grid">{"".join(cards)}</div></div>')


def render_live(run_dir):
	plan, status, runs = load(run_dir)
	verdicts = br.load_verdicts(run_dir)
	scale = br.token_scale([(r['name'], {}, r['data']) for r in runs])
	rows, panels = [], []
	for i, run in enumerate(runs):
		name, active = run['name'], ' active' if i == 0 else ''
		rows.append(f'<tr class="row{active}" data-run="{name}" onclick="show(\'{name}\')">'
		            + row_cells(run, result_html(run, verdicts.get(name))) + '</tr>')
		panels.append(f'<section class="run{active}" id="{name}">'
		              + render_panel(run, verdicts.get(name), f'/files/runs/{name}/', scale) + '</section>')
	text = ('This page updates while the scenarios run, and changes to the full report when the run is done. '
	        'Tokens, cost, the visual check and verdicts come after the run.')
	return br.fill_template(
		br.esc(plan.get('title') or 'Instance AI feature test'), ''.join(rows), br.esc(text), ''.join(panels),
		replay=live_box(status, runs), head=CSS,
		scripts=f'<script>const SCREENS = [];</script><script>{ls.LIVE_JS}</script><script>{STEP_VIEWER_JS}</script>',
		case=render_case(plan, status), thead=THEAD, kicker='Assistant UI test')


class ScenarioApp:
	"""The live page for live_server.serve(): one card, table row and panel for each scenario run."""

	def __init__(self, run_dir):
		self.run_dir = run_dir

	def entry(self, name):
		return ls.read_status(self.run_dir).get('runs', {}).get(name)

	def finished(self, name):
		return (self.entry(name) or {}).get('status') in FINISHED

	def done(self):
		return ls.read_status(self.run_dir).get('phase') == 'done' and (self.run_dir / 'report' / 'index.html').exists()

	def page(self):
		return render_live(self.run_dir)

	def state(self):
		plan, status, runs = load(self.run_dir)
		verdicts = br.load_verdicts(self.run_dir)
		scale = br.token_scale([(r['name'], {}, r['data']) for r in runs])
		state = {'phase': status.get('phase', 'running'), 'clock': clock(status), 'runs': {}}
		if self.done():
			state['report'] = '/report/index.html'
		for run in runs:
			name = run['name']
			shot = self.shot(name)
			state['runs'][name] = {
				'row': row_cells(run, result_html(run, verdicts.get(name))),
				'panel': render_panel(run, verdicts.get(name), f'/files/runs/{name}/', scale),
				'badge': status_badge(run['entry'].get('status', 'waiting')),
				'shot': shot.stat().st_mtime if shot.exists() else None,
			}
		return state

	def shot(self, name):
		return self.run_dir / 'runs' / name / 'live.png'

	def casts(self, name):
		return ()

	def file(self, path):
		"""The step screenshots of a run while it runs: /files/runs/<name>/<file>.png."""
		if not path.startswith('/files/runs/') or not path.endswith('.png'):
			return None
		base = (self.run_dir / 'runs').resolve()
		candidate = (self.run_dir / path.removeprefix('/files/')).resolve()
		return candidate if candidate.is_relative_to(base) and candidate.is_file() else None


def triage(run, visual):
	"""The reasons to look closer at a run. An empty list means that the run looks clean: every step and check
	passed, with no browser error, no failed tool call, and no visual change."""
	reasons = []
	status = run['entry'].get('status')
	if status != 'passed':
		reasons.append(f'the run {status}')
	failed = [s for s in run['steps'] if s['status'] == 'failed']
	if failed:
		reasons.append(f'{len(failed)} failed step(s) or check(s)')
	console = run['console']
	errors = len(console.get('consoleErrors') or []) + len(console.get('requestErrors') or [])
	if errors:
		reasons.append(f'{errors} browser error(s)')
	tool_errors = sum(e['error'] for e in run['data']['events'] if e['kind'] == 'tool')
	if tool_errors:
		reasons.append(f'{tool_errors} failed tool call(s)')
	changed = [r['name'] for r in visual if r['scenario'] == run['scenario']['id'] and r['status'] != 'unchanged']
	if changed and not run['master']:
		reasons.append(f'visual change in {", ".join(changed)}')
	return reasons


def summarize(run_dir):
	"""Plain text for the judge: a triage list, then each run with its steps, final reply, errors and visual
	results."""
	plan, status, runs = load(run_dir)
	visual = read_json(run_dir / 'visual.json', [])
	out = [f'# {plan.get("title", "")}', '', 'Feature:', plan.get('feature') or '-', '', '## Triage', '',
	       'Clean runs passed every step and check, with no browser error, failed tool call or visual change.',
	       'For these, check that the last reply and the final screenshot match the expected result.',
	       'Look closely at the other runs: their screenshots, errors and diffs.', '']
	judged = [r for r in runs if not r['master']]
	for run in judged:
		reasons = triage(run, visual)
		out.append(f'- {run["name"]}: ' + ('clean' if not reasons else 'look closer: ' + '; '.join(reasons)))
	out.append('')
	for run in runs:
		s, result, data = run['scenario'], run['result'], run['data']
		out += [f'## {run["name"]}: {run_title(run)} ({s["kind"]}, {"master" if run["master"] else "branch"})',
		        f'Expected: {s["expected"]}',
		        f'Status: {run["entry"].get("status")}' + (f' ({result["error"]})' if result.get('error') else ''),
		        'Steps:']
		for st in run['steps']:
			shot = f'  (runs/{run["name"]}/{st["shot"]})' if st.get('shot') else ''
			out.append(f'  {st["i"]}. [{st["status"]}] {st["kind"]}: {st["title"]}{shot}')
			if st.get('error'):
				out.append('     ' + st['error'].replace('\n', '\n     ')[:1500])
		for p in result.get('prompts') or []:
			out.append(f'Prompt (thread {p.get("thread")}): {p["text"]}')
		tools = [e for e in data['events'] if e['kind'] == 'tool']
		if tools:
			out.append('Tool calls: ' + ', '.join(e['name'] + (' (error)' if e['error'] else '') for e in tools))
		texts = [e['text'] for e in data['events'] if e['kind'] == 'text']
		if texts:
			out.append('Last reply: ' + texts[-1].strip()[:2000])
		for d in run['meta'].get('decisions') or []:
			out.append(f'Confirmation: {d["decision"]} [{d.get("toolName")}]')
		console = run['console']
		for e in (console.get('consoleErrors') or [])[:8]:
			out.append(f'Console error: {e.get("text", "")[:300]}')
		for e in (console.get('requestErrors') or [])[:8]:
			out.append(f'Request error: {e.get("status")} {e.get("method")} {e.get("url")}')
		if s['kind'] == 'visual' and not run['master']:
			for r in (v for v in visual if v['scenario'] == s['id']):
				ratio = f', {100 * r["ratio"]:.2f}% of pixels' if r.get('ratio') is not None else ''
				out.append(f'Visual {r["name"]}: {r["status"]}{ratio}')
				if r.get('ariaDiff'):
					out.append('  Accessibility tree diff:\n    ' + '\n    '.join(r['ariaDiff'].splitlines()[:40]))
		out.append('')
	return '\n'.join(out)


def main():
	if len(sys.argv) < 2:
		sys.exit(__doc__)
	run_dir = Path(sys.argv[1]).resolve()
	if '--summary' in sys.argv:
		print(summarize(run_dir))
	else:
		print(build(run_dir))


if __name__ == '__main__':
	main()
