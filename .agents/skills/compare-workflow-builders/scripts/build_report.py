#!/usr/bin/env python3
"""Build one HTML page that compares the builder runs in a run directory.

  build_report.py <run-dir>

Inputs in <run-dir>:
  prompt.txt     the prompt that every builder received
  case.json      {"title", "expected",
                  "prices": {model: {"input", "cached", "cacheWrite", "output", "source"}}}
                 Prices are USD per million tokens, with the URL of the price page. They are
                 optional. A model with a price gets its cost calculated from its tokens.
  <name>/run.json and the files that the runner scripts wrote for each builder
  verdicts.json  optional: {"<name>": {"verdict": "pass|partial|fail", "summary": "...",
                 "checks": [{"ok": true|false|null, "text": "..."}]}}

Output: <run-dir>/report/index.html with the canvas images copied next to it.
"""

import html
import json
import shutil
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

ASSET_CACHE = Path.home() / '.config' / 'n8n-builder-compare' / 'assets'
PLAYER_VERSION = '3.17.0'
PLAYER_FILES = ('asciinema-player.min.js', 'asciinema-player.css')
MAX_CHARS = 15000
TITLES = {'instance-ai': 'Instance AI', 'claude': 'Claude Code + n8n MCP', 'codex': 'Codex + n8n MCP'}


def ts(value):
	value = value.replace('Z', '+00:00')
	if '+' not in value[10:] and '-' not in value[19:]:
		value += '+00:00'
	return datetime.fromisoformat(value).timestamp()


def esc(value):
	return html.escape(value if isinstance(value, str) else json.dumps(value, indent=2, ensure_ascii=False))


def pretty(value):
	if isinstance(value, str):
		try:
			value = json.loads(value)
		except ValueError:
			pass
	text = value if isinstance(value, str) else json.dumps(value, indent=2, ensure_ascii=False)
	if len(text) > MAX_CHARS:
		text = text[:MAX_CHARS] + f'\n\n… truncated ({len(text):,} chars in total)'
	return text


def content_text(content):
	if isinstance(content, dict) and 'content' in content:
		content = content['content']
	if isinstance(content, list):
		return '\n'.join(c.get('text', '') if isinstance(c, dict) else str(c) for c in content)
	return content if isinstance(content, str) else json.dumps(content)


def kilo(n):
	return f'{n / 1_000_000:.2f}M' if n >= 1_000_000 else f'{n / 1000:.1f}k' if n >= 1000 else str(n)


def price_calls(calls, model, prices):
	"""Calculate the cost of each call from the case.json price of the model."""
	p = (prices or {}).get(model)
	if not p:
		return False
	for c in calls:
		fresh = max(c['prompt'] - c['cache_read'] - c['cache_write'], 0)
		c['cost'] = (
			fresh * p.get('input', 0) + c['cache_read'] * p.get('cached', 0)
			+ c['cache_write'] * p.get('cacheWrite', p.get('input', 0)) + c['out'] * p.get('output', 0)
		) / 1_000_000
	return True


def png_size(path):
	"""Width and height in pixels, read from the PNG header."""
	header = Path(path).read_bytes()[16:24]
	return int.from_bytes(header[:4], 'big'), int.from_bytes(header[4:], 'big')


def read_jsonl(path):
	return [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]


def run_seconds(meta):
	return ts(meta['finishedAt']) - ts(meta['startedAt']) if meta.get('finishedAt') and meta.get('startedAt') else None


def load_claude(run_dir, meta, prices):
	rows = read_jsonl(run_dir / meta['sessionFile'])
	# Interactive runs have no event stream, so there is no result event with a cost estimate.
	stream = read_jsonl(run_dir / 'stream.jsonl') if (run_dir / 'stream.jsonl').exists() else []
	final = next((d for d in stream if d.get('type') == 'result'), {})
	start = ts(next(r['timestamp'] for r in rows if r.get('timestamp')))
	results = {}
	for r in rows:
		content = r['message'].get('content') if r.get('type') == 'user' else None
		for c in content if isinstance(content, list) else []:
			if c.get('type') == 'tool_result':
				results[c['tool_use_id']] = (r['timestamp'], c)

	# One API response is split over several rows that repeat its usage. The last copy is complete.
	calls, events, model = {}, [], None
	for r in rows:
		if r.get('type') != 'assistant':
			continue
		msg = r['message']
		model = msg.get('model') or model
		t = ts(r['timestamp']) - start
		usage = msg.get('usage') or {}
		read, write, inp = (usage.get('cache_read_input_tokens') or 0, usage.get('cache_creation_input_tokens') or 0,
		                    usage.get('input_tokens') or 0)
		# Anthropic reports uncached input only.
		prompt = inp + read + write
		calls.setdefault(msg['id'], {'t': t, 'id': msg['id']}).update(
			prompt=prompt, cache_read=read, cache_write=write, out=usage.get('output_tokens') or 0, cost=None)
		for c in msg.get('content', []):
			kind = c.get('type')
			if kind == 'thinking' and c.get('thinking', '').strip():
				events.append({'kind': 'reasoning', 't': t, 'text': c['thinking'], 'call': msg['id']})
			elif kind == 'text' and c.get('text', '').strip():
				events.append({'kind': 'text', 't': t, 'text': c['text'], 'call': msg['id']})
			elif kind == 'tool_use':
				end, res = results.get(c['id'], (None, {}))
				events.append({
					'kind': 'tool', 't': t, 'call': msg['id'], 'name': c['name'].replace('mcp__n8n__', ''),
					'duration': (ts(end) - start - t) if end else None,
					'args': c.get('input'), 'result': content_text(res.get('content')),
					'error': bool(res.get('is_error')),
				})
	calls = list(calls.values())
	if price_calls(calls, model, prices):
		cost, source = f'${sum(c["cost"] for c in calls):.2f}', 'prices'
	elif final.get('total_cost_usd') is not None:
		cost, source = f'${final["total_cost_usd"]:.2f}', 'claude-code'
	else:
		cost, source = 'not reported', None
	duration = final['duration_ms'] / 1000 if final.get('duration_ms') else run_seconds(meta)
	return {'events': events, 'calls': calls, 'model': model,
	        'duration': f'{duration:.0f}s' if duration else '-', 'cost': cost, 'costSource': source}


def codex_session_events(rows):
	"""Trace events from the item_completed rows of a Codex session file."""
	first = next((ts(r['timestamp']) for r in rows if r.get('timestamp')), 0)
	events = []
	# Codex calls MCP tools from scripts that it runs with its exec tool. The scripts are not n8n tool calls.
	outputs = {(r.get('payload') or {}).get('call_id'): (r.get('payload') or {}).get('output') for r in rows
	           if (r.get('payload') or {}).get('type') == 'custom_tool_call_output'}
	for r in rows:
		payload = r.get('payload') or {}
		if r.get('type') == 'response_item' and payload.get('type') == 'custom_tool_call':
			events.append({'kind': 'code', 't': ts(r['timestamp']) - first, 'name': payload.get('name'),
			               'code': payload.get('input'), 'result': content_text(outputs.get(payload.get('call_id')))})
			continue
		if r.get('type') != 'event_msg' or payload.get('type') != 'item_completed':
			continue
		item = payload.get('item') or {}
		begin = (payload.get('started_at_ms') or 0) / 1000 - first if payload.get('started_at_ms') else ts(r['timestamp']) - first
		end = (payload.get('completed_at_ms') or 0) / 1000 - first if payload.get('completed_at_ms') else begin
		kind = item.get('type')
		if kind in ('AgentMessage', 'Reasoning'):
			text = '\n'.join(c.get('text', '') for c in item.get('content') or item.get('summary_text') or []
			                 if isinstance(c, dict)).strip()
			if text:
				events.append({'kind': 'text' if kind == 'AgentMessage' else 'reasoning', 't': begin, 'text': text})
		elif kind == 'McpToolCall':
			result = item.get('result')
			events.append({
				'kind': 'tool', 't': begin, 'name': item.get('tool'), 'duration': end - begin,
				'args': item.get('arguments'),
				'result': content_text(result) if result else item.get('error'),
				'error': bool(item.get('error')) or item.get('status') == 'failed'
				         or (isinstance(result, dict) and bool(result.get('isError') or result.get('is_error'))),
			})
	return events


def load_codex(run_dir, meta, prices):
	session = run_dir / meta['sessionFile'] if meta.get('sessionFile') else None
	rows = read_jsonl(session) if session and session.exists() else []
	if not (run_dir / 'stream.jsonl').exists():
		return codex_result(codex_session_events(rows), rows, meta, prices, run_seconds(meta))
	stream = read_jsonl(run_dir / 'stream.jsonl')
	times_file = run_dir / 'stream.times'
	times = [float(x) for x in times_file.read_text().split()] if times_file.exists() else [0.0] * len(stream)
	start = times[0] if times else 0.0
	started, events = {}, []
	for event, at in zip(stream, times):
		item = event.get('item') or {}
		t = at - start
		if event.get('type') == 'item.started':
			started[item.get('id')] = t
			continue
		if event.get('type') != 'item.completed':
			continue
		kind = item.get('type')
		if kind == 'agent_message' and (item.get('text') or '').strip():
			events.append({'kind': 'text', 't': t, 'text': item['text']})
		elif kind == 'reasoning' and (item.get('text') or '').strip():
			events.append({'kind': 'reasoning', 't': t, 'text': item['text']})
		elif kind == 'mcp_tool_call':
			begin = started.get(item.get('id'), t)
			events.append({
				'kind': 'tool', 't': begin, 'name': item.get('tool'), 'duration': t - begin,
				'args': item.get('arguments'),
				'result': content_text(item.get('result')) if item.get('result') else item.get('error'),
				'error': bool(item.get('error')) or item.get('status') == 'failed',
			})
		elif kind == 'command_execution':
			begin = started.get(item.get('id'), t)
			events.append({
				'kind': 'tool', 't': begin, 'name': 'shell', 'duration': t - begin,
				'args': item.get('command'), 'result': item.get('aggregated_output'),
				'error': item.get('exit_code') not in (0, None),
			})

	return codex_result(events, rows, meta, prices, (times[-1] - start) if times else None)


def codex_result(events, rows, meta, prices, duration):
	calls, model = [], meta.get('model')
	first = next((ts(r['timestamp']) for r in rows if r.get('timestamp')), 0)
	for r in rows:
		payload = r.get('payload') or {}
		if r.get('type') == 'turn_context':
			model = payload.get('model') or model
		if r.get('type') == 'token_usage_record':
			u = payload.get('usage') or {}
			calls.append({'t': ts(r['timestamp']) - first, 'prompt': u.get('input_tokens') or 0,
			              'cache_read': u.get('cached_input_tokens') or 0,
			              'cache_write': u.get('cache_write_input_tokens') or 0,
			              'out': u.get('output_tokens') or 0, 'cost': None})
	priced = price_calls(calls, model, prices)
	return {'events': events, 'calls': calls, 'model': model,
	        'duration': f'{duration:.0f}s' if duration else '-',
	        'cost': f'${sum(c["cost"] for c in calls):.2f}' if priced else 'not reported',
	        'costSource': 'prices' if priced else None}


def tree_events(tree, start, label=''):
	tool_calls = {c['toolCallId']: c for c in tree.get('toolCalls') or []}
	events, last_t = [], 0.0
	for item in tree.get('timeline') or []:
		if item.get('type') == 'tool-call' and item.get('toolCallId') in tool_calls:
			c = tool_calls[item['toolCallId']]
			t = ts(c['startedAt']) - start if c.get('startedAt') else last_t
			last_t = t
			result = c.get('result')
			events.append({
				'kind': 'tool', 't': t, 'name': label + c['toolName'],
				'duration': (ts(c['completedAt']) - ts(c['startedAt'])) if c.get('completedAt') and c.get('startedAt') else None,
				'args': c.get('args'), 'result': result,
				'error': isinstance(result, dict) and (result.get('success') is False or 'error' in result),
				'note': 'Confirmation card answered by the auto-approve policy.' if c.get('confirmation') else None,
			})
		elif (item.get('content') or '').strip():
			events.append({'kind': 'reasoning' if item['type'] == 'reasoning' else 'text', 't': last_t,
			               'text': item['content'], 'approx': True})
	for child in tree.get('children') or []:
		events += tree_events(child, start, f'{child.get("role") or child.get("agentId")} › ')
	return events


def load_instance_ai(run_dir, meta, prices):
	trace = json.loads((run_dir / 'trace.json').read_text())
	rich = trace['rich'].get('data', trace['rich'])
	messages = rich['messages']
	user = next(m for m in messages if m.get('role') == 'user')
	start = ts(user['createdAt'])
	events = []
	for m in messages:
		if m.get('role') == 'assistant' and m.get('agentTree'):
			events += tree_events(m['agentTree'], start)
	events.sort(key=lambda e: e['t'])

	calls, model, cost = [], None, 'not reported'
	usage_file = run_dir / 'usage.json'
	if usage_file.exists():
		usage = json.loads(usage_file.read_text())
		models = sorted({u['model'] for u in usage if u.get('model')})
		model = ', '.join(models) or None
		calls = sorted((
			{'t': ts(u['start']) - start, 'start': ts(u['start']) - start,
			 'end': ts(u['end']) - start if u.get('end') else None,
			 'name': (u.get('name') or '').removeprefix('llm: ') or None,
			 'prompt': u['in'], 'cache_read': u['cache_read'], 'cache_write': u['cache_write'],
			 'out': u['out'], 'cost': u['cost']} for u in usage), key=lambda c: c['t'])
		cost = f'${sum(c["cost"] for c in calls):.2f}'
	duration = ts(meta['finishedAt']) - ts(meta['startedAt'])
	return {'events': events, 'calls': calls, 'model': model, 'duration': f'{duration:.0f}s', 'cost': cost,
	        'costSource': 'langsmith' if usage_file.exists() else None}


LOADERS = {'instance-ai': load_instance_ai, 'claude': load_claude, 'codex': load_codex}


def build_steps(calls, events):
	"""Group the trace events by the LLM call that produced them. Returns [{"call", "events"}]."""
	if not calls:
		return [{'call': None, 'events': [e]} for e in events]
	steps = [{'call': c, 'events': []} for c in calls]
	by_id = {c['id']: s for c, s in zip(calls, steps) if c.get('id')}
	starts = [c.get('start') for c in calls]
	ends = [c.get('end') if c.get('end') is not None else c['t'] for c in calls]
	known_starts = all(s is not None for s in starts)
	last = len(calls) - 1
	for e in events:
		if e.get('call') in by_id:
			by_id[e['call']]['events'].append(e)
			continue
		t = e['t']
		# A tool call runs after the response that asked for it. Text is written during its response.
		if e['kind'] == 'tool':
			edges = starts if known_starts else ends
			i = max((k for k, edge in enumerate(edges) if edge <= t + 0.05), default=0)
		else:
			edges = starts if known_starts else ends
			i = next((k for k, edge in enumerate(edges) if edge >= t - 0.05), last)
		steps[i]['events'].append(e)
	return steps


def token_bar(c, max_prompt, max_out):
	fresh = max(c['prompt'] - c['cache_read'] - c['cache_write'], 0)
	segs = ''.join(
		f'<span class="seg {cls}" style="width:{100 * n / max_prompt:.2f}%"></span>'
		for cls, n in (('read', c['cache_read']), ('write', c['cache_write']), ('fresh', fresh)) if n
	)
	return (f'<div class="mini"><div class="bar">{segs}</div>'
	        f'<div class="bar"><span class="seg outp" style="width:{100 * c["out"] / max_out:.2f}%"></span></div></div>')


def step_preview(events, last):
	tools = [e['name'] for e in events if e['kind'] == 'tool']
	if tools:
		return f'<code class="step-text">{esc(", ".join(tools))}</code>'
	text = next((e['text'] for kind in ('text', 'reasoning') for e in events if e['kind'] == kind), None)
	if text and last:
		return '<span class="step-text">Final reply</span>'
	if text:
		return f'<span class="step-text">{esc(" ".join(text.split())[:160])}</span>'
	code = next((e for e in events if e['kind'] == 'code'), None)
	if code:
		return f'<code class="step-text">{esc(code["name"])}: {esc(" ".join((code["code"] or "").split())[:160])}</code>'
	return '<span class="step-text dim">No text or tool calls</span>'


def size_label(text):
	n = len((text or '').encode())
	return f'{n} B' if n < 1024 else f'{n / 1024:.1f} KB'


def render_card(e, index):
	time = f'{e["t"]:.1f}s{"*" if e.get("approx") else ""}'
	if e['kind'] == 'text':
		return (f'<article class="card text"><div class="card-head"><span class="mono-label">Agent</span>'
		        f'<span class="mono-label">{time}</span></div><div class="msg">{esc(e["text"])}</div></article>')
	if e['kind'] == 'reasoning':
		return (f'<details class="card reasoning"><summary class="card-head"><span class="mono-label">Reasoning</span>'
		        f'<span class="mono-label">{time}</span></summary><div class="msg">{esc(e["text"])}</div></details>')
	if e['kind'] == 'code':
		return (f'<article class="card code"><div class="card-head"><span class="mono-label">Script</span>'
		        f'<code class="tool-name">{esc(e["name"])}</code><span class="mono-label">{time}</span></div>'
		        f'<pre>{esc(e["code"] or "")}</pre>'
		        f'<details><summary>Output</summary><pre>{esc(pretty(e["result"]))}</pre></details></article>')
	output = pretty(e['result'])
	duration = f' · {e["duration"]:.1f}s' if e.get('duration') is not None else ''
	status = '<span class="badge fail">Error</span>' if e['error'] else ''
	note = f'<div class="note">{esc(e["note"])}</div>' if e.get('note') else ''
	return (
		f'<article class="card tool{" is-error" if e["error"] else ""}"><div class="card-head">'
		f'<span class="mono-label">Tool #{index}</span><code class="tool-name">{esc(e["name"])}</code>{status}'
		f'<span class="mono-label">{time}{duration}</span></div>{note}'
		f'<details open><summary>Input</summary><pre>{esc(pretty(e["args"]))}</pre></details>'
		f'<details{" open" if e["error"] else ""}><summary>Output · {size_label(output)}</summary>'
		f'<pre>{esc(output)}</pre></details></article>'
	)


def render_steps(calls, events, max_prompt, max_out, prompt):
	steps = build_steps(calls, events)
	if not steps:
		return '<div class="box"><div class="head"><h2>LLM steps</h2></div><p class="dim">No trace for this run.</p></div>'
	names = {s['call'].get('name') for s in steps if s['call']}
	items, panes, tool_index = [], [], 0
	for i, step in enumerate(steps, 1):
		c, evs = step['call'], step['events']
		error = any(e['kind'] == 'tool' and e['error'] for e in evs)
		# The first call answers the prompt, so the prompt opens its detail.
		cards = [f'<article class="card user"><div class="card-head"><span class="mono-label">User</span>'
		         f'<span class="mono-label">0.0s</span></div>'
		         f'<div class="msg">{esc(prompt)}</div></article>'] if i == 1 and prompt else []
		for e in evs:
			tool_index += e['kind'] == 'tool'
			cards.append(render_card(e, tool_index))
		t = c['t'] if c else evs[0]['t']
		label = f'<span class="mono-label">{esc(c["name"])}</span>' if c and c.get('name') and len(names) > 1 else ''
		items.append(
			f'<button type="button" class="step{" active" if i == 1 else ""}{" is-error" if error else ""}" data-step="{i}">'
			f'<span class="step-top"><span class="num">{i}</span>{step_preview(evs, i == len(steps))}'
			f'<span class="mono-label">{t:.0f}s</span></span>'
			+ (f'<span class="step-usage">{label}</span>' if label else '')
			+ (token_bar(c, max_prompt, max_out) if c else '')
			+ '</button>'
		)
		stats = ''
		if c:
			fresh = max(c['prompt'] - c['cache_read'] - c['cache_write'], 0)
			cells = [('Input', kilo(c['prompt'])), ('Cache read', kilo(c['cache_read'])),
			         ('Cache write', kilo(c['cache_write'])), ('Uncached', kilo(fresh)), ('Output', kilo(c['out']))]
			if c.get('cost') is not None:
				cells.append(('Cost', f'${c["cost"]:.3f}'))
			stats = '<dl class="stats">' + ''.join(
				f'<div><dt class="mono-label">{k}</dt><dd class="mono">{v}</dd></div>' for k, v in cells) + '</dl>'
		title = f'Step {i}' + (f' · {esc(c["name"])}' if c and c.get('name') else '')
		panes.append(
			f'<div class="step-detail" data-step="{i}"{"" if i == 1 else " hidden"}>'
			f'<div class="step-head"><h3>{title}</h3><span class="mono-label">{t:.1f}s from the prompt</span></div>'
			f'{stats}{"".join(cards) or "<p class=dim>This call wrote no text and called no tools.</p>"}</div>'
		)
	legend = ('<div class="legend mono-label"><span><i class="read"></i>Cache read</span><span><i class="write"></i>Cache write</span>'
	          '<span><i class="fresh"></i>Uncached input</span><span><i class="outp"></i>Output</span></div>')
	count = f'{len(steps)} LLM calls' if calls else f'{len(steps)} events, no per-call token data'
	return (
		f'<div class="box steps"><div class="head"><h2>LLM steps</h2><span class="mono-label">{count}</span></div>'
		f'{legend if calls else ""}<div class="steps-layout"><div class="step-list">{"".join(items)}</div>'
		f'<div class="step-pane">{"".join(panes)}</div></div></div>'
	)


def render_verdict(v):
	if not v:
		return '<div class="box"><div class="head"><h2>Expected outcome</h2></div><p class="dim">Not judged yet.</p></div>'
	marks = {True: ('ok', '✓'), False: ('bad', '✗'), None: ('warn', '–')}
	checks = ''.join(
		f'<li class="{marks[c.get("ok")][0]}"><span class="mark">{marks[c.get("ok")][1]}</span>{esc(c.get("text", ""))}</li>'
		for c in v.get('checks') or []
	)
	return (
		f'<div class="box"><div class="head"><h2>Expected outcome</h2>{badge(v.get("verdict"))}</div>'
		f'<p class="summary">{esc(v.get("summary", ""))}</p><ul class="checks">{checks}</ul></div>'
	)


def player_assets(report):
	"""Copy the asciinema player next to the page, so the page works offline. Returns its URLs."""
	cache = ASSET_CACHE / f'asciinema-player-{PLAYER_VERSION}'
	cdn = f'https://cdn.jsdelivr.net/npm/asciinema-player@{PLAYER_VERSION}/dist/bundle/'
	try:
		cache.mkdir(parents=True, exist_ok=True)
		for name in PLAYER_FILES:
			if not (cache / name).exists():
				partial = cache / f'{name}.part'
				urllib.request.urlretrieve(cdn + name, partial)
				partial.rename(cache / name)
		(report / 'vendor').mkdir(exist_ok=True)
		for name in PLAYER_FILES:
			shutil.copy(cache / name, report / 'vendor' / name)
		return [f'vendor/{name}' for name in PLAYER_FILES]
	except OSError:
		return [cdn + name for name in PLAYER_FILES]


def cast_length(text):
	"""Seconds from the start of an asciicast to its last frame."""
	for line in reversed(text.splitlines()):
		if line.startswith('['):
			try:
				return float(json.loads(line)[0])
			except (ValueError, IndexError, TypeError):
				continue
	return 0.0


def collect_screens(runs, run_dir, report, verdicts):
	"""Copy the screen recordings next to the page. Returns one entry for each recording."""
	screens_dir = report / 'screens'
	shutil.rmtree(screens_dir, ignore_errors=True)
	screens = []
	for name, meta, data in runs:
		source = run_dir / name / meta['screen'] if meta.get('screen') else None
		if not source or not source.exists():
			continue
		screens_dir.mkdir(parents=True, exist_ok=True)
		screen = {'name': name, 'title': TITLES.get(meta['kind'], meta['kind']), 'duration': data['duration'],
		          'verdict': (verdicts.get(name) or {}).get('verdict')}
		if source.suffix == '.cast':
			text = source.read_text()
			# Browsers block fetch() on file:// pages, so the recording is loaded as a script.
			(screens_dir / f'{name}.cast.js').write_text(
				f'(window.CASTS = window.CASTS || {{}})[{json.dumps(name)}] = {json.dumps(text)};\n')
			screen.update(type='cast', src=f'screens/{name}.cast.js', end=cast_length(text))
		else:
			shutil.copy(source, screens_dir / f'{name}{source.suffix}')
			screen.update(type='video', src=f'screens/{name}{source.suffix}')
			poster = source.with_name(f'{source.stem}-poster.png')
			if poster.exists():
				shutil.copy(poster, screens_dir / f'{name}-poster.png')
				screen['poster'] = f'screens/{name}-poster.png'
		screens.append(screen)
	return screens


PLAY_ICON = '<span class="play-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>'


def render_replay(screens):
	"""A strip of final screens that play in place, and a full-screen player that Expand opens."""
	if not screens:
		return ''
	cards = []
	for s in screens:
		if s['type'] == 'cast':
			thumb = f'<div class="thumb-player" data-cast="{esc(s["name"])}"></div>'
		elif s.get('poster'):
			thumb = f'<img src="{esc(s["poster"])}" alt="">'
		else:
			thumb = f'<video muted preload="metadata" src="{esc(s["src"])}"></video>'
		kind = 'Terminal' if s['type'] == 'cast' else 'n8n UI'
		cards.append(
			f'<div class="reel-card"><div class="thumb" data-thumb="{esc(s["name"])}">'
			f'<button type="button" class="thumb-poster" data-play="{esc(s["name"])}" aria-label="Play {esc(s["title"])}">'
			f'{thumb}{PLAY_ICON}</button></div>'
			f'<div class="reel-meta"><span class="run-name">{esc(s["title"])}</span>{badge(s["verdict"]) if s["verdict"] else ""}</div>'
			f'<span class="mono-label">{kind} · {esc(s["duration"])}</span></div>'
		)
	side_by_side = '<button type="button" class="btn accent" data-open="all">Expand</button>'
	tabs = ''.join(f'<button type="button" class="tab" data-replay="{esc(s["name"])}">{esc(s["title"])}</button>'
	               for s in screens)
	if len(screens) > 1:
		tabs += '<button type="button" class="tab" data-replay="all">Side by side</button>'
	figures = ''.join(
		f'<figure class="screen" data-run="{esc(s["name"])}"><figcaption class="mono-label">{esc(s["title"])}</figcaption>'
		+ (f'<video controls muted playsinline preload="metadata" src="{esc(s["src"])}"'
		   + (f' poster="{esc(s["poster"])}"' if s.get('poster') else '') + '></video>' if s['type'] == 'video'
		   else '<div class="player"></div>')
		+ '</figure>'
		for s in screens
	)
	return (
		f'<div class="box replay"><div class="head"><h2>Replay</h2>{side_by_side}</div>'
		f'<div class="reel">{"".join(cards)}</div></div>'
		'<div class="theater" id="theater" role="dialog" aria-modal="true" aria-label="Replay" hidden>'
		f'<div class="theater-bar"><h2>Replay</h2><div class="tabs">{tabs}</div>'
		'<label class="mono-label">Speed <select id="speed"><option value="1">1×</option><option value="2">2×</option>'
		'<option value="4">4×</option><option value="8">8×</option></select></label>'
		'<label class="mono-label"><input type="checkbox" id="skip-idle" checked> Skip pauses</label>'
		'<button type="button" class="btn accent" id="play-all">Play all</button>'
		'<button type="button" class="btn" id="theater-close">Close</button></div>'
		f'<div class="replay-grid" id="replay-grid">{figures}</div>'
		'<p class="fineprint">Terminal screens are exact recordings of the interactive CLI. Instance AI is a video '
		'of the n8n UI. Skip pauses shortens idle time in the terminal recordings only. Press Esc to close.</p></div>'
	)


def badge(verdict):
	if not verdict:
		return '<span class="badge none">Not judged</span>'
	return f'<span class="badge {esc(verdict)}">{esc(verdict.upper())}</span>'


def main():
	run_dir = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
	case = json.loads((run_dir / 'case.json').read_text())
	if 'prompt' not in case:
		case['prompt'] = (run_dir / 'prompt.txt').read_text().strip()
	verdicts_file = run_dir / 'verdicts.json'
	verdicts = json.loads(verdicts_file.read_text()) if verdicts_file.exists() else {}
	report = run_dir / 'report'
	(report / 'img').mkdir(parents=True, exist_ok=True)
	if ASSET_CACHE.exists():
		for sub in ('fonts', 'brand'):
			if (ASSET_CACHE / sub).exists():
				shutil.copytree(ASSET_CACHE / sub, report / sub, dirs_exist_ok=True)

	order = {'instance-ai': 0, 'claude': 1, 'codex': 2}
	runs = []
	for meta_file in sorted(run_dir.glob('*/run.json')):
		sub = meta_file.parent
		meta = json.loads(meta_file.read_text())
		loader = LOADERS.get(meta.get('kind'))
		if not loader or sub.name == 'report':
			continue
		try:
			data = loader(sub, meta, case.get('prices'))
		except Exception as e:  # keep the other runs when one run has broken files
			data = {'events': [], 'calls': [], 'model': meta.get('model'), 'duration': '-', 'cost': '-',
			        'costSource': None, 'loadError': f'{type(e).__name__}: {e}'}
		if (sub / 'canvas.png').exists():
			shutil.copy(sub / 'canvas.png', report / 'img' / f'{sub.name}.png')
		runs.append((sub.name, meta, data))
	runs.sort(key=lambda r: (order.get(r[1]['kind'], 9), r[0]))
	if not runs:
		sys.exit('No runs found.')

	all_calls = [c for _, _, d in runs for c in d['calls']]
	max_prompt = max([c['prompt'] for c in all_calls] + [1])
	max_out = max([c['out'] for c in all_calls] + [1])
	base_url = case.get('baseUrl', 'http://localhost:5678')

	rows, panels = [], []
	for i, (name, meta, data) in enumerate(runs):
		active = ' active' if i == 0 else ''
		calls = data['calls']
		tools = [e for e in data['events'] if e['kind'] == 'tool']
		errors = sum(e['error'] for e in tools)
		prompt = sum(c['prompt'] for c in calls)
		cached = sum(c['cache_read'] for c in calls)
		out = sum(c['out'] for c in calls)
		title = TITLES.get(meta['kind'], meta['kind'])
		if name not in ('iai', 'claude', 'codex'):
			title += f' ({name})'
		verdict = verdicts.get(name)
		cells = [
			f'<span class="run-name">{esc(title)}</span>', esc(data.get('model') or '-'),
			badge((verdict or {}).get('verdict')), data['duration'], str(len(calls)),
			f'{len(tools)}' + (f' <span class="err">({errors} err)</span>' if errors else ''),
			kilo(prompt), f'{100 * cached / prompt:.0f}%' if prompt else '-', kilo(out),
			f'<strong>{esc(data["cost"])}</strong>',
		]
		rows.append(f'<tr class="row{active}" data-run="{name}" onclick="show(\'{name}\')">'
		            + ''.join(f'<td>{c}</td>' for c in cells) + '</tr>')

		wf = meta.get('workflowId')
		image = report / 'img' / f'{name}.png'
		# capture_canvas.mjs takes the screenshot at twice the CSS size.
		size = ' '.join(f'{k}="{v // 2}"' for k, v in zip(('width', 'height'), png_size(image))) if image.exists() else ''
		canvas = (
			f'<a class="canvas" href="img/{name}.png" target="_blank"><img src="img/{name}.png" {size} alt="{esc(title)} canvas"></a>'
			if image.exists() else '<p class="dim">No workflow was created.</p>'
		)
		link = f'<a href="{base_url}/workflow/{wf}" target="_blank">Open in n8n ↗</a>' if wf else ''
		error = f'<div class="box err">Could not read this run: {esc(data["loadError"])}</div>' if data.get('loadError') else ''
		panels.append(
			f'<section class="run{active}" id="{name}">{error}<div class="result-row">{render_verdict(verdict)}'
			f'<div class="box"><div class="head"><h2>Canvas</h2>{link}</div>{canvas}</div></div>'
			f'{render_steps(calls, data["events"], max_prompt, max_out, case["prompt"])}</section>'
		)

	notes = ['Token bars use one scale for all runs. Times are seconds from the prompt.']
	if any(meta['kind'] == 'instance-ai' for _, meta, _ in runs):
		notes.append('Instance AI steps come from LangSmith call times. An asterisk on a time marks Instance AI text '
		             'placed at the previous tool call.')
	notes = [esc(n) for n in notes]
	sources = {'langsmith': 'LangSmith', 'claude-code': 'the estimate of Claude Code', 'prices': 'tokens × published price'}
	for name, meta, data in runs:
		title = TITLES.get(meta['kind'], meta['kind'])
		source = sources.get(data.get('costSource'), 'not available')
		notes.append(f'{esc(title)} cost: {esc(source)}.')
	for model, p in (case.get('prices') or {}).items():
		link = f' (<a href="{esc(p["source"])}" target="_blank">source</a>)' if p.get('source') else ''
		notes.append(
			f'{esc(model)}: ${p.get("input", 0)} input, ${p.get("cached", 0)} cache read, '
			f'${p.get("cacheWrite", p.get("input", 0))} cache write, ${p.get("output", 0)} output per million tokens{link}.'
		)

	# The agent reads this file to find the models that still need a published price.
	models = [{'run': name, 'kind': meta['kind'], 'model': data.get('model'), 'costSource': data.get('costSource')}
	          for name, meta, data in runs]
	(run_dir / 'models.json').write_text(json.dumps(models, indent=2))
	unpriced = sorted({m['model'] for m in models
	                   if m['model'] and m['kind'] != 'instance-ai' and m['costSource'] != 'prices'})

	screens = collect_screens(runs, run_dir, report, verdicts)
	head, scripts = '', ''
	if any(s['type'] == 'cast' for s in screens):
		player_js, player_css = player_assets(report)
		head = f'<link rel="stylesheet" href="{esc(player_css)}">'
		scripts = f'<script src="{esc(player_js)}"></script>' + ''.join(
			f'<script src="{esc(s["src"])}"></script>' for s in screens if s['type'] == 'cast')
	scripts += f'<script>const SCREENS = {json.dumps(screens)};</script>'

	page = (TEMPLATE
	        .replace('{{HEAD}}', head)
	        .replace('{{REPLAY}}', render_replay(screens))
	        .replace('{{SCRIPTS}}', scripts)
	        .replace('{{TITLE}}', esc(case.get('title') or 'Builder comparison'))
	        .replace('{{PROMPT}}', esc(case['prompt']))
	        .replace('{{EXPECTED}}', esc(case.get('expected') or '-'))
	        .replace('{{ROWS}}', ''.join(rows))
	        .replace('{{NOTES}}', ' '.join(notes))
	        .replace('{{PANELS}}', ''.join(panels)))
	(report / 'index.html').write_text(page)
	print(report / 'index.html')
	if unpriced:
		print('models without a published price in case.json: ' + ', '.join(unpriced))


TEMPLATE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<style>
@font-face{font-family:"n8n Baumer Uniwidth";src:url("fonts/n8nBaumerUniwidth.woff2") format("woff2");font-weight:400 500;font-display:swap}
@font-face{font-family:"n8n Baumer Mono";src:url("fonts/n8nBaumerMono.woff2") format("woff2");font-weight:400;font-display:swap}
/* n8n brand, Light mode: https://guidelines.n8n.design/ */
:root{
  --bg:#FAFAFA;--bg-2:#F1F1F1;--bg-3:#EAEAEA;--white:#FFFFFF;--black:#191919;
  --line:#E0E0E0;--line-strong:#BFBFBF;--text:#191919;--dim:#676767;
  --pink:#FF91AC;--pink-10:#FFE8EC;--pink-20:#FFD0D9;--pink-30:#FFBCCA;--pink-70:#87003C;--gray-50:#A4A4A4;
  --s4:4px;--s8:8px;--s12:12px;--s16:16px;--s24:24px;--s32:32px;--s40:40px;
  --r4:4px;--r8:8px;--r12:12px;--full:400px;
  --sans:"n8n Baumer Uniwidth",system-ui,sans-serif;--mono:"n8n Baumer Mono",ui-monospace,monospace;
}
*{box-sizing:border-box}
body{margin:0 auto;max-width:1360px;background:var(--bg);color:var(--text);font:14px/18px var(--sans);font-feature-settings:"liga" 1;padding:var(--s24) var(--s40) var(--s40)}
body.theater-open{overflow:hidden}
h1,h2,h3{font-weight:500;margin:0;text-wrap:balance}
h1{font-size:24px;line-height:24px}
h2{font-size:18px;line-height:22px}
h3{font-size:16px;line-height:20px}
a{color:var(--text);text-decoration:underline;text-decoration-color:var(--pink);text-decoration-thickness:2px;text-underline-offset:3px}
a:hover{text-decoration-color:var(--text)}
code,pre,.mono,.mono-label{font-family:var(--mono)}
.mono-label{font-size:10px;line-height:14px;text-transform:uppercase;letter-spacing:.02em;color:var(--dim)}
.dim{color:var(--dim)}
.err{color:var(--pink-70)}
button:focus-visible,select:focus-visible{outline:2px solid var(--pink);outline-offset:2px}
header{display:flex;align-items:center;gap:var(--s16);margin-bottom:var(--s24)}
header img{height:24px}
.case{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s16);margin-bottom:var(--s24)}
.case .mono-label{margin-bottom:var(--s8)}
.msg{white-space:pre-wrap;word-break:break-word;text-wrap:pretty}
table{width:100%;border-collapse:collapse;margin-bottom:var(--s8)}
th{text-align:left;font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em;color:var(--dim);padding:var(--s8) var(--s12);font-weight:400}
td{padding:var(--s12);border-top:1px solid var(--line);font-family:var(--mono);white-space:nowrap}
td:first-child{font-family:var(--sans)}
.row{cursor:pointer}
.row:hover td{background:var(--bg-2)}
.row.active td{background:var(--bg-3)}
.row.active td:first-child{box-shadow:inset 4px 0 0 var(--pink)}
.run-name{font-weight:500}
.fineprint{color:var(--dim);font-size:10px;line-height:14px;margin:0 0 var(--s24);max-width:960px;text-wrap:pretty}
.badge{display:inline-block;font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em;padding:var(--s4) var(--s12);border-radius:var(--full);white-space:nowrap}
.badge.pass{background:var(--pink);color:var(--black)}
.badge.partial{background:var(--bg-3);color:var(--black)}
.badge.fail{background:var(--pink-70);color:var(--bg)}
.badge.none{box-shadow:inset 0 0 0 1px var(--line-strong);color:var(--dim)}
.summary{margin:0 0 var(--s8)}
.checks{list-style:none;margin:0;padding:0}
.checks li{display:flex;gap:var(--s8);padding:2px 0}
.checks .mark{font-family:var(--mono);width:16px}
.checks .bad .mark{color:var(--pink-70)}
.checks .warn .mark{color:var(--dim)}
.run{display:none}
.run.active{display:block}
.box{background:var(--bg-2);border-radius:var(--r12);padding:var(--s16);margin-bottom:var(--s24)}
.box.err{background:var(--pink-10);color:var(--pink-70)}
.head{display:flex;justify-content:space-between;align-items:center;gap:var(--s12);margin-bottom:var(--s12)}
.result-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s16);margin-bottom:var(--s24)}
.result-row > .box{margin-bottom:0}
.canvas{display:grid;place-items:center;background:var(--bg);border-radius:var(--r8);padding:var(--s16)}
.canvas img{display:block;max-width:100%;height:auto;max-height:360px;object-fit:contain}
.btn,.tab{font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em;color:var(--black);background:var(--bg-2);border:0;box-shadow:inset 0 0 0 1px var(--line);border-radius:var(--full);padding:var(--s8) var(--s16);cursor:pointer;white-space:nowrap}
.btn:hover,.tab:hover{background:var(--white)}
.btn.accent,.tab.active{background:var(--pink);box-shadow:none}
.btn.accent:hover,.tab.active:hover{background:var(--pink-20)}
.btn.accent:active{background:var(--pink-30)}
.tabs{display:flex;flex-wrap:wrap;gap:var(--s4)}
/* Replay strip */
.reel{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--s16)}
.reel-card{display:flex;flex-direction:column;gap:var(--s8);min-width:0}
.thumb{position:relative;aspect-ratio:16/10;border-radius:var(--r8);overflow:hidden;background:var(--black);box-shadow:inset 0 0 0 1px var(--line)}
.thumb-poster{position:absolute;inset:0;padding:0;border:0;background:none;cursor:pointer}
.thumb-poster img,.thumb-poster video{display:block;width:100%;height:100%;object-fit:cover;object-position:top left}
.thumb-player{pointer-events:none}
.thumb-player .ap-overlay,.thumb-player .ap-control-bar{display:none !important}
.thumb-live{position:absolute;inset:0;display:grid;place-items:center}
.thumb-live > video{width:100%;height:100%;object-fit:contain}
.thumb-live .ap-wrapper{width:100%;height:100%}
.play-icon{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:var(--full);background:var(--pink);display:grid;place-items:center;transition:transform .15s}
.play-icon svg{width:24px;height:24px;fill:var(--black);margin-left:2px}
.thumb-poster:hover .play-icon{transform:scale(1.12)}
.reel-meta{display:flex;align-items:center;justify-content:space-between;gap:var(--s8)}
/* Full-screen player */
.theater{position:fixed;inset:0;z-index:10;background:var(--bg);padding:var(--s24) var(--s40);overflow:auto;display:flex;flex-direction:column;gap:var(--s16)}
.theater[hidden]{display:none}
.theater-bar{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s16)}
.theater-bar label{display:flex;align-items:center;gap:var(--s8)}
.theater-bar select{font:10px/14px var(--mono);background:var(--white);color:var(--text);border:1px solid var(--line);border-radius:var(--r4);padding:2px var(--s4)}
.theater-bar input{accent-color:var(--black)}
#theater-close{margin-left:auto}
.replay-grid{display:grid;gap:var(--s16);width:100%;margin:0 auto;grid-template-columns:minmax(0,1fr);max-width:calc((100vh - 184px) * 1.5)}
.screen{margin:0;display:none}
.screen.shown{display:block}
.screen figcaption{margin-bottom:var(--s8)}
.replay-grid:not(.all) figcaption{display:none}
.player{overflow:hidden;border-radius:var(--r8)}
.screen video{width:100%;display:block;border-radius:var(--r8);background:var(--black)}
.theater .fineprint{margin:0}
/* LLM steps */
.legend{display:flex;flex-wrap:wrap;gap:var(--s16);margin-bottom:var(--s12)}
.legend i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:var(--s4)}
.read{background:var(--gray-50)}
.write{background:var(--pink)}
.fresh{background:var(--black)}
.outp{background:var(--pink-70)}
.steps-layout{display:grid;grid-template-columns:minmax(240px,320px) minmax(0,1fr);gap:var(--s16);height:min(720px,calc(100vh - 96px))}
.step-list{display:flex;flex-direction:column;gap:var(--s4);overflow-y:auto;min-height:0;padding:2px}
.step{display:flex;flex-direction:column;gap:var(--s8);width:100%;padding:var(--s8) var(--s12);border:0;border-radius:var(--r8);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.step:hover{background:var(--bg)}
.step.active{background:var(--white);box-shadow:inset 4px 0 0 var(--pink),0 0 0 1px var(--line)}
.step-top{display:flex;align-items:flex-start;gap:var(--s8);width:100%}
.num{flex:none;display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 var(--s4);border-radius:var(--full);background:var(--bg-3);font:10px/14px var(--mono)}
.step.active .num{background:var(--pink)}
.step.is-error .num{background:var(--pink-70);color:var(--bg)}
.step-text{flex:1;min-width:0;padding-top:3px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}
code.step-text{font-size:12px;line-height:16px}
.step-top .mono-label{padding-top:5px}
.step-usage{display:flex;gap:var(--s8)}
.mini{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,1fr);gap:var(--s4);width:100%}
.bar{display:flex;height:8px;background:var(--bg-3);border-radius:2px;overflow:hidden}
.seg{display:block;height:100%}
.step-pane{min-height:0;overflow-y:auto;background:var(--white);border-radius:var(--r8);box-shadow:inset 0 0 0 1px var(--line);padding:var(--s16)}
.step-detail{display:flex;flex-direction:column;gap:var(--s12)}
.step-detail[hidden]{display:none}
.step-head{display:flex;align-items:baseline;justify-content:space-between;gap:var(--s12)}
.stats{display:flex;flex-wrap:wrap;gap:var(--s24);margin:0;padding:var(--s12) var(--s16);background:var(--bg);border-radius:var(--r8)}
.stats dd{margin:var(--s4) 0 0;font-size:14px;line-height:18px}
.card{display:block;background:var(--bg);border-radius:var(--r8);padding:var(--s12);box-shadow:inset 4px 0 0 var(--line-strong)}
.card.text{box-shadow:inset 4px 0 0 var(--pink)}
.card.user{background:var(--white);box-shadow:inset 0 0 0 1px var(--line),inset 4px 0 0 var(--black)}
.card.reasoning{background:transparent;box-shadow:inset 0 0 0 1px var(--line);color:var(--dim)}
.card.is-error{background:var(--pink-10);box-shadow:inset 4px 0 0 var(--pink-70)}
.card-head{display:flex;align-items:center;gap:var(--s12);margin-bottom:var(--s8)}
.card-head > .mono-label:last-child{margin-left:auto}
summary.card-head{margin-bottom:0;cursor:pointer}
.card.reasoning[open] summary{margin-bottom:var(--s8)}
.tool-name{font-size:14px;line-height:18px}
.note{color:var(--dim);margin-bottom:var(--s4)}
.card details summary{cursor:pointer;color:var(--dim);margin-top:var(--s8);font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em}
.card pre{background:var(--white);border-radius:var(--r4);box-shadow:inset 0 0 0 1px var(--line);padding:var(--s12);margin:var(--s8) 0 0;overflow:auto;max-height:320px;font-size:12px;line-height:16px;white-space:pre-wrap;word-break:break-word}
</style>{{HEAD}}</head><body>
<header><img src="brand/n8n-logo-black-accent.svg" alt="n8n" onerror="this.remove()"><h1>{{TITLE}}</h1></header>
<div class="case"><div class="box"><div class="mono-label">Prompt</div><div class="msg">{{PROMPT}}</div></div>
<div class="box"><div class="mono-label">Expected outcome</div><div class="msg">{{EXPECTED}}</div></div></div>
<table><thead><tr><th>Run</th><th>Model</th><th>Result</th><th>Active time</th><th>LLM calls</th><th>Tool calls</th><th>Input tokens</th><th>Cached</th><th>Output tokens</th><th>Cost</th></tr></thead>
<tbody>{{ROWS}}</tbody></table>
<p class="fineprint">{{NOTES}}</p>
{{REPLAY}}
{{PANELS}}
{{SCRIPTS}}
<script>
const $ = (id) => document.getElementById(id);
function show(id){
  document.querySelectorAll('.run').forEach(p=>p.classList.toggle('active',p.id===id));
  document.querySelectorAll('.row').forEach(r=>r.classList.toggle('active',r.dataset.run===id));
}

// LLM steps: one list and one detail pane for each run.
function selectStep(root, step, focus){
  const items = [...root.querySelectorAll('.step')];
  const item = items.find(b=>b.dataset.step===step);
  if (!item) return;
  items.forEach(b=>b.classList.toggle('active', b===item));
  root.querySelectorAll('.step-detail').forEach(d=>{ d.hidden = d.dataset.step !== step; });
  root.querySelector('.step-pane').scrollTop = 0;
  item.scrollIntoView({block:'nearest'});
  if (focus) item.focus({preventScroll:true});
}
document.querySelectorAll('.steps').forEach(root=>{
  root.addEventListener('click', e=>{ const b = e.target.closest('.step'); if (b) selectStep(root, b.dataset.step); });
  root.querySelector('.step-list').addEventListener('keydown', e=>{
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...root.querySelectorAll('.step')];
    const i = items.findIndex(b=>b.classList.contains('active')) + (e.key === 'ArrowDown' ? 1 : -1);
    if (items[i]) selectStep(root, items[i].dataset.step, true);
  });
});

// Replay
let replayMode = null;
const players = {};
function npt(seconds){
  const s = Math.max(0, Math.ceil(seconds));
  return `npt:${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function mountCast(s, el){
  if (players[s.name]) players[s.name].dispose();
  players[s.name] = AsciinemaPlayer.create({data: window.CASTS[s.name]}, el, {
    speed: Number($('speed').value), idleTimeLimit: $('skip-idle').checked ? 2 : undefined, fit: 'width', poster: 'npt:0:8',
  });
}
function disposePlayers(){
  for (const name of Object.keys(players)) { players[name].dispose(); delete players[name]; }
}
// Side by side uses the column count that gives the largest screens in the window.
function layoutGrid(){
  const grid = $('replay-grid');
  if (replayMode !== 'all') { grid.style.gridTemplateColumns = ''; grid.style.maxWidth = ''; return; }
  const gap = 16, caption = 24, aspect = 1.5;
  const width = grid.parentElement.clientWidth - 80;
  const height = window.innerHeight - grid.getBoundingClientRect().top - 72;
  let best = {cols: 1, cell: 0};
  for (let cols = 1; cols <= SCREENS.length; cols++) {
    const rows = Math.ceil(SCREENS.length / cols);
    const cell = Math.min((width - gap * (cols - 1)) / cols, ((height - gap * (rows - 1)) / rows - caption) * aspect);
    if (cell > best.cell) best = {cols, cell};
  }
  grid.style.gridTemplateColumns = `repeat(${best.cols}, minmax(0, 1fr))`;
  grid.style.maxWidth = `${Math.floor(best.cell * best.cols + gap * (best.cols - 1))}px`;
}
function showReplay(mode){
  replayMode = mode;
  const grid = $('replay-grid');
  grid.classList.toggle('all', mode === 'all');
  layoutGrid();
  document.querySelectorAll('[data-replay]').forEach(b=>b.classList.toggle('active', b.dataset.replay === mode));
  $('play-all').style.display = mode === 'all' ? '' : 'none';
  for (const s of SCREENS) {
    const fig = grid.querySelector(`.screen[data-run="${s.name}"]`);
    const shown = mode === 'all' || mode === s.name;
    fig.classList.toggle('shown', shown);
    if (s.type === 'cast') {
      // The player measures its box when it starts, so it starts again after a layout change.
      if (shown) mountCast(s, fig.querySelector('.player'));
      else if (players[s.name]) { players[s.name].dispose(); delete players[s.name]; }
    } else {
      const video = fig.querySelector('video');
      video.playbackRate = Number($('speed').value);
      if (!shown) video.pause();
    }
  }
}
// A card plays in place: the poster gives way to a player with controls.
const inline = {};
function playInline(name){
  const s = SCREENS.find(x=>x.name === name);
  const thumb = document.querySelector(`.thumb[data-thumb="${name}"]`);
  const live = document.createElement('div');
  live.className = 'thumb-live';
  thumb.replaceChildren(live);
  if (s.type === 'cast') {
    inline[name] = AsciinemaPlayer.create({data: window.CASTS[name]}, live, {fit: 'both', autoPlay: true, idleTimeLimit: 2});
  } else {
    const video = Object.assign(document.createElement('video'), {src: s.src, controls: true, muted: true, playsInline: true, autoplay: true});
    if (s.poster) video.poster = s.poster;
    live.append(video);
    inline[name] = video;
  }
}
function pauseInline(){
  Object.values(inline).forEach(p=>p.pause());
}
function openTheater(mode){
  pauseInline();
  $('theater').hidden = false;
  document.body.classList.add('theater-open');
  showReplay(mode);
  $('theater-close').focus();
}
function closeTheater(){
  disposePlayers();
  document.querySelectorAll('#theater video').forEach(v=>v.pause());
  $('theater').hidden = true;
  document.body.classList.remove('theater-open');
  replayMode = null;
}
if (SCREENS.length) {
  document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click', ()=>openTheater(b.dataset.open)));
  document.querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click', ()=>playInline(b.dataset.play)));
  document.querySelectorAll('[data-replay]').forEach(b=>b.addEventListener('click', ()=>showReplay(b.dataset.replay)));
  $('speed').addEventListener('change', ()=>showReplay(replayMode));
  $('skip-idle').addEventListener('change', ()=>showReplay(replayMode));
  $('theater-close').addEventListener('click', closeTheater);
  document.addEventListener('keydown', e=>{ if (e.key === 'Escape' && !$('theater').hidden) closeTheater(); });
  let resizeTimer;
  window.addEventListener('resize', ()=>{
    if (replayMode !== 'all') return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=>showReplay('all'), 200);
  });
  $('play-all').addEventListener('click', ()=>{
    Object.values(players).forEach(p=>p.play());
    document.querySelectorAll('.screen.shown video').forEach(v=>v.play());
  });
  // The strip shows the last screen of each terminal recording.
  for (const s of SCREENS.filter(s=>s.type === 'cast')) {
    const el = document.querySelector(`.thumb-player[data-cast="${s.name}"]`);
    if (el) AsciinemaPlayer.create({data: window.CASTS[s.name]}, el, {fit: 'width', controls: false, poster: npt(s.end)});
  }
}
</script></body></html>"""

if __name__ == '__main__':
	main()
