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
from datetime import datetime
from pathlib import Path

ASSET_CACHE = Path.home() / '.config' / 'n8n-builder-compare' / 'assets'
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


def read_jsonl(path):
	return [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]


def load_claude(run_dir, meta, prices):
	rows = read_jsonl(run_dir / meta['sessionFile'])
	stream = read_jsonl(run_dir / 'stream.jsonl')
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
		calls.setdefault(msg['id'], {'t': t}).update(prompt=prompt, cache_read=read, cache_write=write,
		                                              out=usage.get('output_tokens') or 0, cost=None)
		for c in msg.get('content', []):
			kind = c.get('type')
			if kind == 'thinking' and c.get('thinking', '').strip():
				events.append({'kind': 'reasoning', 't': t, 'text': c['thinking']})
			elif kind == 'text' and c.get('text', '').strip():
				events.append({'kind': 'text', 't': t, 'text': c['text']})
			elif kind == 'tool_use':
				end, res = results.get(c['id'], (None, {}))
				events.append({
					'kind': 'tool', 't': t, 'name': c['name'].replace('mcp__n8n__', ''),
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
	duration = final.get('duration_ms')
	return {'events': events, 'calls': calls, 'model': model,
	        'duration': f'{duration / 1000:.0f}s' if duration else '-', 'cost': cost, 'costSource': source}


def load_codex(run_dir, meta, prices):
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

	calls, model = [], meta.get('model')
	session = run_dir / meta['sessionFile'] if meta.get('sessionFile') else None
	if session and session.exists():
		rows = read_jsonl(session)
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
	        'duration': f'{(times[-1] - start):.0f}s' if times else '-',
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
		calls = [{'t': ts(u['start']) - start, 'prompt': u['in'], 'cache_read': u['cache_read'],
		          'cache_write': u['cache_write'], 'out': u['out'], 'cost': u['cost']} for u in usage]
		cost = f'${sum(c["cost"] for c in calls):.2f}'
	duration = ts(meta['finishedAt']) - ts(meta['startedAt'])
	return {'events': events, 'calls': calls, 'model': model, 'duration': f'{duration:.0f}s', 'cost': cost,
	        'costSource': 'langsmith' if usage_file.exists() else None}


LOADERS = {'instance-ai': load_instance_ai, 'claude': load_claude, 'codex': load_codex}


def render_tokens(calls, max_prompt, max_out):
	if not calls:
		return '<p class="dim">No per-call token data for this run.</p>'
	rows = []
	for i, c in enumerate(calls, 1):
		fresh = max(c['prompt'] - c['cache_read'] - c['cache_write'], 0)
		segs = ''.join(
			f'<span class="seg {cls}" style="width:{100 * n / max_prompt:.2f}%"></span>'
			for cls, n in (('read', c['cache_read']), ('write', c['cache_write']), ('fresh', fresh)) if n
		)
		cost = f'${c["cost"]:.3f}' if c['cost'] is not None else ''
		rows.append(
			f'<div class="tok-row"><span class="mono dim">#{i}</span><span class="mono dim">{c["t"]:.0f}s</span>'
			f'<div class="bar">{segs}</div><span class="mono">{kilo(c["prompt"])}</span>'
			f'<div class="bar out"><span class="seg outp" style="width:{100 * c["out"] / max_out:.2f}%"></span></div>'
			f'<span class="mono">{kilo(c["out"])}</span><span class="mono dim">{cost}</span></div>'
		)
	legend = ('<div class="legend mono-label"><span><i class="read"></i>Cache read</span><span><i class="write"></i>Cache write</span>'
	          '<span><i class="fresh"></i>Uncached input</span><span><i class="outp"></i>Output</span></div>')
	head = ('<div class="tok-row head mono-label"><span>Call</span><span>Time</span><span>Input</span><span></span>'
	        '<span>Output</span><span></span><span>Cost</span></div>')
	return f'{legend}{head}{"".join(rows)}'


def render_event(e, index):
	time = f'<div class="time mono">{e["t"]:.1f}s{"*" if e.get("approx") else ""}</div>'
	if e['kind'] == 'text':
		return f'<div class="ev text">{time}<div class="ev-body"><div class="mono-label">Agent</div><div class="msg">{esc(e["text"])}</div></div></div>'
	if e['kind'] == 'reasoning':
		return f'<div class="ev reasoning">{time}<div class="ev-body"><details><summary>Reasoning</summary><div class="msg">{esc(e["text"])}</div></details></div></div>'
	duration = f'{e["duration"]:.1f}s' if e.get('duration') is not None else '-'
	status = '<span class="mono-label err">Error</span>' if e['error'] else ''
	note = f'<div class="note">{esc(e["note"])}</div>' if e.get('note') else ''
	return (
		f'<div class="ev tool{" is-error" if e["error"] else ""}">{time}<div class="ev-body">'
		f'<div class="tool-head"><span class="mono dim">#{index}</span><code class="tool-name">{esc(e["name"])}</code>{status}'
		f'<span class="mono dim duration">{duration}</span></div>{note}'
		f'<details><summary>Input</summary><pre>{esc(pretty(e["args"]))}</pre></details>'
		f'<details><summary>Output</summary><pre>{esc(pretty(e["result"]))}</pre></details></div></div>'
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

		tool_index, rendered = 0, []
		for e in data['events']:
			tool_index += e['kind'] == 'tool'
			rendered.append(render_event(e, tool_index))
		wf = meta.get('workflowId')
		canvas = (
			f'<a href="img/{name}.png" target="_blank"><img src="img/{name}.png" alt="{esc(title)} canvas"></a>'
			if (report / 'img' / f'{name}.png').exists() else '<p class="dim">No workflow was created.</p>'
		)
		link = f'<a href="{base_url}/workflow/{wf}" target="_blank">Open in n8n ↗</a>' if wf else ''
		error = f'<div class="box err">Could not read this run: {esc(data["loadError"])}</div>' if data.get('loadError') else ''
		panels.append(
			f'<section class="run{active}" id="{name}">{error}{render_verdict(verdict)}'
			f'<div class="box"><div class="head"><h2>Canvas</h2>{link}</div>{canvas}</div>'
			f'<div class="box"><div class="head"><h2>Tokens per LLM call</h2></div>{render_tokens(calls, max_prompt, max_out)}</div>'
			f'<div class="head"><h2>Trace</h2></div>'
			f'<div class="ev user"><div class="time mono">0.0s</div><div class="ev-body"><div class="mono-label">User</div>'
			f'<div class="msg">{esc(case["prompt"])}</div></div></div>{"".join(rendered)}</section>'
		)

	notes = ['Bars in the token chart use one scale for all runs. Trace times are seconds from the prompt.']
	if any(meta['kind'] == 'instance-ai' for _, meta, _ in runs):
		notes.append('An asterisk on a trace time marks Instance AI text placed at the previous tool call.')
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

	page = (TEMPLATE
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
:root{
  --bg:#191919;--bg-2:#242424;--bg-3:#464646;--text:#FAFAFA;--dim:rgba(250,250,250,.6);
  --pink:#FF91AC;--pink-bg:#5A0026;--green:#7BE3A6;--amber:#FFC46B;
  --s4:4px;--s8:8px;--s12:12px;--s16:16px;--s24:24px;--s40:40px;
  --sans:"n8n Baumer Uniwidth",system-ui,sans-serif;--mono:"n8n Baumer Mono",ui-monospace,monospace;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/18px var(--sans);padding:var(--s24) var(--s40) var(--s40)}
h1,h2{font-weight:500;margin:0}
h1{font-size:24px;line-height:28px}
h2{font-size:18px;line-height:22px}
a{color:var(--pink);text-decoration:none}
a:hover{text-decoration:underline}
code,pre,.mono,.mono-label{font-family:var(--mono)}
.mono-label{font-size:10px;line-height:14px;text-transform:uppercase;color:var(--dim)}
.dim{color:var(--dim)}
.err{color:var(--pink)}
header{display:flex;align-items:center;gap:var(--s16);margin-bottom:var(--s16)}
header img{height:20px}
.case{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s16);margin-bottom:var(--s24)}
.case .msg{white-space:pre-wrap}
table{width:100%;border-collapse:collapse;margin-bottom:var(--s24)}
th{text-align:left;font:10px/14px var(--mono);text-transform:uppercase;color:var(--dim);padding:var(--s8) var(--s12);font-weight:400}
td{padding:var(--s12);border-top:1px solid var(--bg-3);font-family:var(--mono);white-space:nowrap}
td:first-child{font-family:var(--sans)}
.row{cursor:pointer}
.row:hover td,.row.active td{background:var(--bg-2)}
.row.active td:first-child{box-shadow:inset 3px 0 0 var(--pink)}
.run-name{font-weight:500}
.fineprint{color:var(--dim);font-size:12px;line-height:16px;margin:calc(-1 * var(--s16)) 0 var(--s24);max-width:960px}
.badge{font:10px/14px var(--mono);padding:2px var(--s8);border-radius:4px;border:1px solid currentColor}
.badge.pass{color:var(--green)}
.badge.partial{color:var(--amber)}
.badge.fail{color:var(--pink)}
.badge.none{color:var(--dim)}
.summary{margin:0 0 var(--s8)}
.checks{list-style:none;margin:0;padding:0}
.checks li{display:flex;gap:var(--s8);padding:2px 0}
.checks .mark{font-family:var(--mono);width:14px}
.checks .ok .mark{color:var(--green)}
.checks .bad .mark{color:var(--pink)}
.checks .warn .mark{color:var(--amber)}
.run{display:none}
.run.active{display:block}
.box{background:var(--bg-2);border-radius:12px;padding:var(--s16);margin-bottom:var(--s24)}
.head{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--s12)}
.box img{width:100%;display:block;border-radius:8px}
.legend{display:flex;gap:var(--s16);margin-bottom:var(--s12)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:var(--s4);vertical-align:-1px}
.tok-row{display:grid;grid-template-columns:32px 48px minmax(0,4fr) 64px minmax(0,1fr) 56px 64px;gap:var(--s8);align-items:center;padding:2px 0}
.tok-row.head{margin:0;padding-bottom:var(--s4)}
.tok-row .mono{font-size:12px;text-align:right}
.bar{display:flex;height:14px;background:var(--bg);border-radius:3px;overflow:hidden}
.seg{display:block;height:100%}
.read{background:var(--bg-3)}
.write{background:var(--pink)}
.fresh{background:var(--text)}
.outp{background:#9FB8FF}
.ev{display:grid;grid-template-columns:64px minmax(0,1fr);gap:var(--s12);margin-bottom:var(--s8)}
.time{color:var(--dim);text-align:right;padding-top:var(--s12);font-size:12px}
.ev-body{background:var(--bg-2);border-radius:8px;padding:var(--s12);border-left:3px solid var(--bg-3)}
.msg{white-space:pre-wrap;word-break:break-word}
.ev.user .ev-body{border-left-color:var(--text)}
.ev.text .ev-body{border-left-color:var(--pink)}
.ev.reasoning .ev-body{background:transparent;border:1px dashed var(--bg-3);color:var(--dim)}
.ev.is-error .ev-body{background:var(--pink-bg);border-left-color:var(--pink)}
.tool-head{display:flex;gap:var(--s12);align-items:center}
.tool-name{font-size:14px}
.duration{margin-left:auto;font-size:12px}
.note{color:var(--dim);margin-top:var(--s4)}
details summary{cursor:pointer;color:var(--dim);margin-top:var(--s4)}
.ev.reasoning summary{margin-top:0}
pre{background:var(--bg);border-radius:6px;padding:var(--s12);margin:var(--s8) 0 0;overflow:auto;max-height:420px;font-size:12px;line-height:16px;white-space:pre-wrap;word-break:break-word}
</style></head><body>
<header><img src="brand/n8n-logo-white-accent.svg" alt="n8n" onerror="this.remove()"><h1>{{TITLE}}</h1></header>
<div class="case"><div class="box"><div class="mono-label">Prompt</div><div class="msg">{{PROMPT}}</div></div>
<div class="box"><div class="mono-label">Expected outcome</div><div class="msg">{{EXPECTED}}</div></div></div>
<table><thead><tr><th>Run</th><th>Model</th><th>Result</th><th>Active time</th><th>LLM calls</th><th>Tool calls</th><th>Input tokens</th><th>Cached</th><th>Output tokens</th><th>Cost</th></tr></thead>
<tbody>{{ROWS}}</tbody></table>
<p class="fineprint">{{NOTES}}</p>
{{PANELS}}
<script>
function show(id){document.querySelectorAll('.run').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.row').forEach(r=>r.classList.toggle('active',r.dataset.run===id));}
</script></body></html>"""

if __name__ == '__main__':
	main()
