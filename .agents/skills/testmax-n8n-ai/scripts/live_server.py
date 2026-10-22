#!/usr/bin/env python3
"""Serve a page that shows the builder runs while they run.

  live_server.py --run-dir <run-dir> [--parent-pid <pid>]

compare.py starts this server in the background. The server listens on 127.0.0.1 only and
writes its address to <run-dir>/live-url.txt. Routes:

  /report/live       the live page
  /report/<file>     the final report and its files, when they exist
  /api/state         the status, table row and LLM steps of each builder, as JSON
  /api/cast/<name>   the terminal screen of a CLI builder, as Server-Sent Events in the
                     live format of the asciinema player
  /api/shot/<name>   the last screenshot of the Instance AI thread

compare.py writes the status of each builder to <run-dir>/status.json. The server stops
30 minutes after the last request, when the run is done or compare.py has stopped.

Other skills reuse the server: they call serve() with their own app (see BuilderApp).
"""

import argparse
import json
import mimetypes
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

import build_report as br
from run_cli_builder import find_session_file

IDLE_STOP_S = 1800
KINDS = {'iai': 'instance-ai', 'claude': 'claude', 'codex': 'codex'}
STATUS_LABELS = {'waiting': 'Waiting', 'running': 'Running', 'done': 'Done', 'failed': 'Failed', 'skipped': 'Skipped'}
mimetypes.add_type('font/woff2', '.woff2')
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('video/webm', '.webm')


def read_status(run_dir):
	try:
		return json.loads((run_dir / 'status.json').read_text())
	except (OSError, ValueError):
		return {'phase': 'running', 'builders': {}}


def empty_data(model=None):
	return {'events': [], 'calls': [], 'model': model, 'duration': '-', 'cost': '-', 'costSource': None}


def load_instance_ai_live(sub):
	"""Trace events from the event stream that run_instance_ai.py writes while the thread runs."""
	path = sub / 'events.jsonl'
	rows = br.read_jsonl(path) if path.exists() else []
	if not rows:
		return empty_data()
	first = next((r for r in rows if r.get('type') == 'run-start'), rows[0])
	start, root = first['ts'] / 1000, first.get('agentId')
	events, texts, tools = [], {}, {}
	for r in rows:
		kind, p, agent = r.get('type'), r.get('payload') or {}, r.get('agentId')
		t = (r.get('ts') or first['ts']) / 1000 - start
		label = '' if agent in (root, None) else f'{agent.split("-run_")[0]} › '
		if kind in ('text-delta', 'reasoning-delta'):
			event_kind = 'text' if kind == 'text-delta' else 'reasoning'
			key = (agent, r.get('responseId'), event_kind)
			if key not in texts:
				texts[key] = {'kind': event_kind, 't': t, 'text': ''}
				events.append(texts[key])
			texts[key]['text'] += p.get('text') or ''
		elif kind == 'tool-call':
			tools[p.get('toolCallId')] = {'kind': 'tool', 't': t, 'name': label + (p.get('toolName') or ''),
			                              'args': p.get('args'), 'result': 'Waiting for the result…',
			                              'error': False, 'duration': None}
			events.append(tools[p.get('toolCallId')])
		elif kind in ('tool-result', 'tool-error') and p.get('toolCallId') in tools:
			result = p.get('result') if kind == 'tool-result' else p.get('error')
			tools[p['toolCallId']].update(
				result=result, duration=t - tools[p['toolCallId']]['t'],
				error=kind == 'tool-error' or (isinstance(result, dict) and (result.get('success') is False or 'error' in result)))
		elif kind == 'confirmation-request' and p.get('toolCallId') in tools:
			tools[p['toolCallId']]['note'] = 'Confirmation card answered by the auto-approve policy.'
	data = empty_data()
	data['events'] = [e for e in events if e['kind'] == 'tool' or e['text'].strip()]
	return data


def live_run(run_dir, name, case):
	"""Meta and trace data of one builder. A finished builder has run.json. A running one does not."""
	sub = run_dir / name
	meta_file = sub / 'run.json'
	if meta_file.exists():
		meta = json.loads(meta_file.read_text())
		if meta.get('kind') in br.LOADERS:
			return meta, br.load_run(sub, meta, case.get('prices'))
	meta = {'kind': KINDS.get(name, name)}
	if meta['kind'] == 'instance-ai':
		return meta, load_instance_ai_live(sub)
	session = find_session_file(meta['kind'], sub / 'home') if (sub / 'home').exists() else None
	if not session:
		return meta, empty_data()
	meta['sessionFile'] = str(session.relative_to(sub))
	return meta, br.load_run(sub, meta, case.get('prices'))


def seconds(value):
	return f'{value:.0f}s'


def gather(run_dir):
	case, status, verdicts = br.load_case(run_dir), read_status(run_dir), br.load_verdicts(run_dir)
	builders = status.get('builders', {})
	names = sorted((n for n, b in builders.items() if b.get('status') != 'skipped'),
	               key=lambda n: (br.RUN_ORDER.get(KINDS.get(n, n), 9), n))
	now, runs = time.time(), []
	for name in names:
		entry = builders[name]
		state = entry.get('status', 'waiting')
		meta, data = live_run(run_dir, name, case)
		running = state in ('waiting', 'running')
		if running and data.get('loadError'):
			# A running builder can leave a file in a state that the loader cannot read yet.
			data = empty_data(data.get('model'))
		started, finished = entry.get('startedAt'), entry.get('finishedAt')
		if started and (running or data['duration'] == '-'):
			data['duration'] = seconds((finished or now) - started)
		if running:
			data['cost'] = '-'
		runs.append((name, meta, data, entry))
	return case, status, verdicts, runs


def status_badge(state):
	return f'<span class="badge st-{br.esc(state)}">{STATUS_LABELS.get(state, br.esc(state))}</span>'


def clock(status):
	started = status.get('startedAt')
	elapsed = seconds((status.get('finishedAt') or time.time()) - started) if started else ''
	mode = 'Parallel' if status.get('mode') == 'parallel' else 'One at a time'
	return ' · '.join(x for x in (mode, elapsed, status.get('step')) if x)


def render_run(run_dir, case, name, meta, data, entry, verdict, scale):
	row = br.render_row_cells(name, meta, data, status_badge(entry.get('status', 'waiting')))
	canvas = br.render_canvas_box(name, meta, run_dir / 'report', case.get('baseUrl', 'http://localhost:5678'),
	                              empty='The canvas appears when all builders finish.')
	view, auto = br.verdict_view(verdict, run_dir / name, case.get('expected') or '')
	return row, br.render_panel_body(data, view, canvas, *scale, case['prompt'], case.get('expected') or '', auto=auto,
	                                 pending=True)


def render_live_box(status, runs):
	cards = []
	for name, meta, _, entry in runs:
		title = br.esc(br.run_title(name, meta))
		screen = (status.get('screens') or {}).get(name)
		if screen == 'cast':
			inner = (f'<div data-cast="{name}"></div><button type="button" class="live-zoom overlay" '
			         f'data-zoom="{name}" aria-label="Show {title} full screen"></button>')
		elif screen == 'shot':
			inner = (f'<button type="button" class="live-zoom" data-zoom="{name}" aria-label="Show {title} full screen">'
			         f'<img data-shot="{name}" alt="{title} in the n8n UI" hidden></button>'
			         f'<div class="live-empty" data-shot-empty="{name}">Waiting for the first screenshot</div>')
		else:
			inner = '<div class="live-empty">No live screen for this builder. The LLM steps below update live.</div>'
		cards.append(
			f'<div class="live-card"><div class="live-screen">{inner}</div>'
			f'<div class="reel-meta"><span class="run-name">{title}</span>'
			f'<span data-live-badge="{name}">{status_badge(entry.get("status", "waiting"))}</span></div></div>'
		)
	return (f'<div class="box"><div class="head"><h2>Live</h2><span class="mono-label" id="live-clock">'
	        f'{br.esc(clock(status))}</span></div><div class="live-grid">{"".join(cards)}</div></div>')


def render_page(run_dir):
	case, status, verdicts, runs = gather(run_dir)
	scale = br.token_scale([r[:3] for r in runs])
	rows, panels = [], []
	for i, (name, meta, data, entry) in enumerate(runs):
		active = ' active' if i == 0 else ''
		row, panel = render_run(run_dir, case, name, meta, data, entry, verdicts.get(name), scale)
		rows.append(f'<tr class="row{active}" data-run="{name}" onclick="show(\'{name}\')">{row}</tr>')
		panels.append(f'<section class="run{active}" id="{name}">{panel}</section>')
	try:
		br.ensure_player_cache()
		player_js, player_css = (f'vendor/{n}' for n in br.PLAYER_FILES)
	except OSError:
		player_js, player_css = (br.PLAYER_CDN + n for n in br.PLAYER_FILES)
	notes = ('This page updates while the builders run, and changes to the full report when the run is done. '
	         'Costs, canvases, checks and verdicts come after the run. Times are seconds from the start of each builder.')
	return br.fill_template(
		br.esc(case.get('title') or 'Builder comparison'), ''.join(rows), br.esc(notes), ''.join(panels),
		replay=render_live_box(status, runs), head=f'<link rel="stylesheet" href="{player_css}">',
		scripts=f'<script src="{player_js}"></script><script>const SCREENS = [];</script><script>{LIVE_JS}</script>',
		prompt=br.esc(case['prompt']), expected=br.esc(case.get('expected') or '-'))


def render_state(run_dir):
	case, status, verdicts, runs = gather(run_dir)
	scale = br.token_scale([r[:3] for r in runs])
	state = {'phase': status.get('phase', 'running'), 'clock': clock(status), 'runs': {}}
	if state['phase'] == 'done' and (run_dir / 'report' / 'index.html').exists():
		state['report'] = '/report/index.html'
	for name, meta, data, entry in runs:
		row, panel = render_run(run_dir, case, name, meta, data, entry, verdicts.get(name), scale)
		shot = run_dir / name / 'live.png'
		state['runs'][name] = {'row': row, 'panel': panel, 'badge': status_badge(entry.get('status', 'waiting')),
		                       'shot': shot.stat().st_mtime if shot.exists() else None}
	return state


LIVE_JS = """
window.addEventListener('DOMContentLoaded', ()=>{
  const seen = {}, shots = {}, userFolds = {};
  // A box that the user opened or closed stays that way when its panel updates. Other boxes take the new default.
  document.addEventListener('click', e=>{
    const summary = e.target.closest && e.target.closest('details.fold > summary');
    if (!summary || e.target.closest('.run-picker')) return;
    const section = summary.closest('section.run');
    if (section) (userFolds[section.id] ??= {})[summary.querySelector('h2').textContent] = !summary.parentElement.open;
  });
  document.addEventListener('change', e=>{
    if (!e.target.matches || !e.target.matches('.run-picker')) return;
    const steps = document.getElementById(e.target.value)?.querySelector('.steps');
    if (steps) (userFolds[e.target.value] ??= {})['LLM steps'] = steps.open;
  });
  document.querySelectorAll('[data-cast]').forEach(el=>{
    AsciinemaPlayer.create({driver: 'eventsource', url: `/api/cast/${el.dataset.cast}`, bufferTime: 0}, el,
      {fit: 'both', autoPlay: true, controls: false});
  });
  // A live screen opens larger in a full-screen viewer. The viewer follows the newest screenshot, and a
  // terminal gets its own player, because the stream starts with the whole recording so far.
  const zoomNames = [...document.querySelectorAll('[data-zoom]')].map(b=>b.dataset.zoom);
  const viewer = document.createElement('div');
  let zoomed = null, opener = null, castPlayer = null, castName = null;
  viewer.className = 'theater live-theater';
  viewer.hidden = true;
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', 'Live screen');
  viewer.innerHTML = '<div class="theater-bar"><h2>Live</h2><span data-zoom-badge></span>'
    + '<button type="button" class="btn" data-zoom-close>Close</button></div><div class="tabs"></div>'
    + '<div class="live-zoomed"><img alt=""><div class="live-empty">Waiting for the first screenshot</div>'
    + '<div class="live-zoomed-cast" hidden></div></div>'
    + '<p class="fineprint">The screen updates every few seconds. Press the left or right arrow key to change the '
    + 'scenario. Press Esc to close.</p>';
  for (const name of zoomNames) {
    const tab = Object.assign(document.createElement('button'), {type: 'button', className: 'tab'});
    tab.dataset.zoomTab = name;
    tab.textContent = document.querySelector(`[data-zoom="${name}"]`).closest('.live-card').querySelector('.run-name').textContent;
    tab.addEventListener('click', ()=>showZoom(name));
    viewer.querySelector('.tabs').append(tab);
  }
  document.body.append(viewer);
  function stopCast(){
    castPlayer?.dispose();
    castPlayer = castName = null;
    viewer.querySelector('.live-zoomed-cast').replaceChildren();
  }
  function showZoom(name){
    zoomed = name;
    viewer.querySelectorAll('[data-zoom-tab]').forEach(t=>t.classList.toggle('active', t.dataset.zoomTab === name));
    const shot = document.querySelector(`img[data-shot="${name}"]`);
    const isCast = !!document.querySelector(`[data-cast="${name}"]`);
    const img = viewer.querySelector('.live-zoomed img'), castBox = viewer.querySelector('.live-zoomed-cast');
    if (castName !== name) stopCast();
    castBox.hidden = !isCast;
    if (isCast && !castPlayer) {
      castName = name;
      castPlayer = AsciinemaPlayer.create({driver: 'eventsource', url: `/api/cast/${name}`, bufferTime: 0}, castBox,
        {fit: 'both', autoPlay: true, controls: false});
    }
    const shotHidden = !shot || shot.hidden;
    img.hidden = isCast || shotHidden;
    if (shot && !shot.hidden && img.getAttribute('src') !== shot.getAttribute('src')) { img.src = shot.src; img.alt = shot.alt; }
    viewer.querySelector('.live-zoomed .live-empty').hidden = isCast || !shotHidden;
    viewer.querySelector('[data-zoom-badge]').innerHTML = document.querySelector(`[data-live-badge="${name}"]`)?.innerHTML || '';
  }
  function closeZoom(){
    stopCast();
    viewer.hidden = true;
    zoomed = null;
    document.body.classList.remove('theater-open');
    opener?.focus();
  }
  document.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click', ()=>{
    opener = b;
    viewer.hidden = false;
    document.body.classList.add('theater-open');
    showZoom(b.dataset.zoom);
    viewer.querySelector('[data-zoom-close]').focus();
  }));
  viewer.querySelector('[data-zoom-close]').addEventListener('click', closeZoom);
  document.addEventListener('keydown', e=>{
    if (zoomed === null) return;
    if (e.key === 'Escape') closeZoom();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const step = e.key === 'ArrowRight' ? 1 : -1;
      showZoom(zoomNames[(zoomNames.indexOf(zoomed) + step + zoomNames.length) % zoomNames.length]);
    }
  });
  function selectQuietly(root, step){
    root.querySelectorAll('.step').forEach(b=>b.classList.toggle('active', b.dataset.step === step));
    root.querySelectorAll('.step-detail').forEach(d=>{ d.hidden = d.dataset.step !== step; });
  }
  // Keeps the selected step, the scroll positions and the open sections. When the last step is
  // selected, the newest step is selected after the update.
  function swapPanel(section, html, first){
    const old = section.querySelector('.steps');
    const items = old ? [...old.querySelectorAll('.step')] : [];
    const active = items.find(b=>b.classList.contains('active'));
    const follow = first || !active || active === items[items.length - 1];
    // A run with no trace yet has a .steps section without the list and the pane.
    const listTop = old?.querySelector('.step-list')?.scrollTop ?? 0;
    const paneTop = old?.querySelector('.step-pane')?.scrollTop ?? 0;
    const openState = {};
    section.querySelectorAll('.step-detail').forEach(d=>d.querySelectorAll('details').forEach((x, i)=>{ openState[`${d.dataset.step}:${i}`] = x.open; }));
    section.innerHTML = html;
    section.querySelectorAll('details.fold').forEach(d=>{
      const open = (userFolds[section.id] || {})[d.querySelector('summary h2')?.textContent];
      if (open !== undefined) d.open = open;
    });
    addRunPickers();
    section.querySelectorAll('.step-detail').forEach(d=>d.querySelectorAll('details').forEach((x, i)=>{
      const key = `${d.dataset.step}:${i}`;
      if (key in openState) x.open = openState[key];
    }));
    const root = section.querySelector('.steps');
    const next = root ? [...root.querySelectorAll('.step')] : [];
    if (!next.length) return;
    const list = root.querySelector('.step-list'), pane = root.querySelector('.step-pane');
    if (!list || !pane) return;
    if (follow) {
      selectQuietly(root, next[next.length - 1].dataset.step);
      list.scrollTop = list.scrollHeight;
    } else {
      selectQuietly(root, active.dataset.step);
      list.scrollTop = listTop;
      pane.scrollTop = paneTop;
    }
  }
  async function poll(){
    let state;
    try {
      state = await (await fetch('/api/state', {cache: 'no-store'})).json();
    } catch {
      $('live-clock').textContent = 'Lost the connection to the live server. Trying again…';
      setTimeout(poll, 3000);
      return;
    }
    if (state.report) { location.replace(state.report); return; }
    $('live-clock').textContent = state.clock;
    for (const [name, run] of Object.entries(state.runs)) {
      const row = document.querySelector(`.row[data-run="${name}"]`);
      if (row && seen[`row:${name}`] !== run.row) { row.innerHTML = run.row; seen[`row:${name}`] = run.row; }
      const section = document.getElementById(name);
      if (section && seen[`panel:${name}`] !== run.panel) {
        swapPanel(section, run.panel, seen[`panel:${name}`] === undefined);
        seen[`panel:${name}`] = run.panel;
      }
      const badge = document.querySelector(`[data-live-badge="${name}"]`);
      if (badge) badge.innerHTML = run.badge;
      const img = document.querySelector(`img[data-shot="${name}"]`);
      if (img && run.shot && shots[name] !== run.shot) {
        shots[name] = run.shot;
        img.src = `/api/shot/${name}?v=${run.shot}`;
        img.hidden = false;
        document.querySelector(`[data-shot-empty="${name}"]`)?.remove();
      }
    }
    if (zoomed !== null) showZoom(zoomed);
    setTimeout(poll, 2000);
  }
  poll();
});
"""


class BuilderApp:
	"""What the server shows for compare.py: one live card, table row and panel for each builder.

	Another skill can serve its own page with the same server: give LiveServer an object with
	these methods."""

	def __init__(self, run_dir):
		self.run_dir = run_dir

	def entry(self, name):
		"""The status.json entry of a live card, or None for an unknown name."""
		return read_status(self.run_dir).get('builders', {}).get(name)

	def finished(self, name):
		state = (self.entry(name) or {}).get('status')
		return state in ('done', 'failed', 'skipped') or (self.run_dir / name / 'run.json').exists()

	def done(self):
		return read_status(self.run_dir).get('phase') == 'done' and (self.run_dir / 'report' / 'index.html').exists()

	def page(self):
		return render_page(self.run_dir)

	def state(self):
		return render_state(self.run_dir)

	def shot(self, name):
		return self.run_dir / name / 'live.png'

	def casts(self, name):
		"""The live recording, then the place where the runner moves it when the builder stops."""
		sub = self.run_dir / name
		return sub / '.screen' / 'screen.cast', sub / 'screen.cast'

	def file(self, path):
		"""A file for a route that the server does not know, or None."""
		return None


class LiveServer(ThreadingHTTPServer):
	daemon_threads = True

	def __init__(self, address, app):
		super().__init__(address, Handler)
		port = self.server_address[1]
		self.app, self.run_dir = app, app.run_dir
		self.allowed_hosts = {f'127.0.0.1:{port}', f'localhost:{port}'}
		self.last_request = time.time()


class Handler(BaseHTTPRequestHandler):
	server_version = 'cwb-live'

	def log_message(self, *args):
		pass

	def do_GET(self):
		srv = self.server
		srv.last_request = time.time()
		# Only same-origin requests. A page that resolves its own host name to 127.0.0.1 gets a 403.
		if self.headers.get('Host', '') not in srv.allowed_hosts:
			return self.send_error(403)
		path = unquote(urlparse(self.path).path)
		app = srv.app
		try:
			if path in ('/', '/report', '/report/'):
				return self.redirect('/report/index.html' if app.done() else '/report/live')
			if path == '/report/live':
				return self.send_body(app.page().encode(), 'text/html; charset=utf-8')
			if path == '/api/state':
				return self.send_body(json.dumps(app.state()).encode(), 'application/json')
			name = path.rsplit('/', 1)[-1]
			if path.startswith(('/api/cast/', '/api/shot/')) and not app.entry(name):
				return self.send_error(404)
			if path.startswith('/api/cast/'):
				return self.stream_cast(name)
			if path.startswith('/api/shot/'):
				return self.send_file(app.shot(name))
			if path.startswith('/report/'):
				return self.send_file(self.static_file(path.removeprefix('/report/')))
			self.send_file(app.file(path))
		except (BrokenPipeError, ConnectionResetError):
			pass

	def redirect(self, location):
		self.send_response(302)
		self.send_header('Location', location)
		self.send_header('Content-Length', '0')
		self.end_headers()

	def send_body(self, body, content_type):
		self.send_response(200)
		self.send_header('Content-Type', content_type)
		self.send_header('Content-Length', str(len(body)))
		self.send_header('Cache-Control', 'no-store')
		self.end_headers()
		self.wfile.write(body)

	def static_file(self, rel):
		"""A file of the report. Fonts, logos and the player come from the asset cache until the report exists."""
		base = (self.server.run_dir / 'report').resolve()
		candidate = (base / rel).resolve()
		if candidate.is_relative_to(base) and candidate.is_file():
			return candidate
		parts = Path(rel).parts
		if parts[:1] in (('fonts',), ('brand',)):
			cache = br.ASSET_CACHE.resolve()
			candidate = (cache / rel).resolve()
			return candidate if candidate.is_relative_to(cache) and candidate.is_file() else None
		if len(parts) == 2 and parts[0] == 'vendor' and parts[1] in br.PLAYER_FILES:
			return br.PLAYER_CACHE / parts[1]
		return None

	def send_file(self, file):
		if not file or not file.is_file():
			return self.send_error(404)
		size = file.stat().st_size
		start, end = 0, size - 1
		match = re.fullmatch(r'bytes=(\d*)-(\d*)', self.headers.get('Range') or '')
		if match and size and (match[1] or match[2]):
			# Videos need byte ranges to seek.
			if match[1]:
				start, end = int(match[1]), int(match[2]) if match[2] else size - 1
			else:
				start = max(size - int(match[2]), 0)
			end = min(end, size - 1)
			if start > end:
				self.send_response(416)
				self.send_header('Content-Range', f'bytes */{size}')
				self.end_headers()
				return
			self.send_response(206)
			self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
		else:
			self.send_response(200)
		self.send_header('Content-Type', mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
		self.send_header('Content-Length', str(end - start + 1))
		self.send_header('Accept-Ranges', 'bytes')
		self.send_header('Cache-Control', 'no-cache')
		self.end_headers()
		with file.open('rb') as f:
			f.seek(start)
			left = end - start + 1
			while left > 0:
				chunk = f.read(min(left, 1 << 16))
				if not chunk:
					break
				self.wfile.write(chunk)
				left -= len(chunk)

	def sse(self, data, event=None):
		self.wfile.write(((f'event: {event}\n' if event else '') + f'data: {data}\n\n').encode())
		self.wfile.flush()

	def stream_cast(self, name):
		"""Send the screen recording so far as one reset frame, then each new frame as it arrives."""
		srv = self.server
		self.send_response(200)
		self.send_header('Content-Type', 'text/event-stream')
		self.send_header('Cache-Control', 'no-store')
		self.end_headers()
		path = None
		while path is None:
			path = next((p for p in srv.app.casts(name) if p.exists()), None)
			if path is None:
				if srv.app.finished(name):
					return self.sse('{}', 'done')
				self.wfile.write(b': waiting\n\n')
				self.wfile.flush()
				srv.last_request = time.time()
				time.sleep(1)
		# The runner moves the recording when the builder stops. The open file stays readable.
		with path.open('rb') as f:
			buffer = b''

			def complete_lines():
				nonlocal buffer
				buffer += f.read()
				*lines, buffer = buffer.split(b'\n')
				return [line for line in lines if line.strip()]

			lines = complete_lines()
			while not lines:
				if srv.app.finished(name):
					return self.sse('{}', 'done')
				time.sleep(0.2)
				lines = complete_lines()
			header, frames = json.loads(lines[0]), [json.loads(line) for line in lines[1:]]
			output = [f for f in frames if f[1] == 'o']
			self.sse(json.dumps({'cols': header.get('width'), 'rows': header.get('height'),
			                     'time': output[-1][0] if output else 0, 'init': ''.join(f[2] for f in output)}))
			last_data = last_ping = time.time()
			while True:
				lines = complete_lines()
				for line in lines:
					frame = json.loads(line)
					if frame[1] == 'o':
						self.sse(json.dumps([frame[0], 'o', frame[2]]))
				now = time.time()
				srv.last_request = now
				if lines:
					last_data = now
					continue
				if srv.app.finished(name) and now - last_data > 3:
					return self.sse('{}', 'done')
				if now - last_ping > 15:
					self.wfile.write(b': ping\n\n')
					self.wfile.flush()
					last_ping = now
				time.sleep(0.2)


def pid_alive(pid):
	try:
		os.kill(pid, 0)
	except ProcessLookupError:
		return False
	except PermissionError:
		return True
	return True


def stop_when_idle(server, parent_pid):
	while True:
		time.sleep(30)
		if time.time() - server.last_request < IDLE_STOP_S:
			continue
		done = read_status(server.run_dir).get('phase') == 'done'
		if done or (parent_pid and not pid_alive(parent_pid)):
			server.shutdown()
			return


def serve(app, parent_pid=None, port=0):
	"""Serve app until it is idle. Writes the address to <run-dir>/live-url.txt."""
	server = LiveServer(('127.0.0.1', port), app)
	(app.run_dir / 'live-url.txt').write_text(f'http://127.0.0.1:{server.server_address[1]}\n')
	threading.Thread(target=stop_when_idle, args=(server, parent_pid), daemon=True).start()
	server.serve_forever()


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--run-dir', required=True)
	ap.add_argument('--parent-pid', type=int)
	ap.add_argument('--port', type=int, default=0)
	args = ap.parse_args()
	serve(BuilderApp(Path(args.run_dir).resolve()), args.parent_pid, args.port)


if __name__ == '__main__':
	main()
