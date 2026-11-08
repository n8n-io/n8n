#!/usr/bin/env python3
"""Build one HTML page that compares the builder runs in a run directory.

  build_report.py <run-dir> [--step judge|prices=queued|running|done ...]

--step writes the state of a step that comes after the run to status.json, then builds the page.
The page shows a queued or running step in the Result and Cost columns. When the live server
serves the page, the page reloads when it is built again.

Inputs in <run-dir>:
  prompt.txt     the prompt that every builder received
  case.json      {"title", "expected",
                  "prices": {model: {"input", "cached", "cacheWrite", "output", "source"}}}
                 Prices are USD per million tokens, with the URL of the price page. They are
                 optional. A model with a price gets its cost calculated from its tokens.
  <name>/run.json and the files that the runner scripts wrote for each builder
  verdicts.json  optional: {"<name>": {"verdict": "pass|partial|fail", "summary": "...",
                 "checks": [{"id": 3, "ok": true|false|null, "text": "..."}]}}
                 id is the number of the expected outcome item. It is optional.

Output: <run-dir>/report/index.html with the canvas images copied next to it.
"""

import argparse
import html
import json
import os
import re
import shutil
import sys
import time
import urllib.request
from collections import Counter
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
	lines = Path(path).read_text().splitlines()
	rows = []
	for i, line in enumerate(lines):
		if not line.strip():
			continue
		try:
			rows.append(json.loads(line))
		except json.JSONDecodeError:
			# A running builder can be in the middle of writing the last line.
			if i == len(lines) - 1:
				break
			raise
	return rows


def run_seconds(meta):
	# A CLI run also spends time on container start-up, the prompt paste wait and shutdown.
	if 'turnStartedAt' in meta or 'turnFinishedAt' in meta:
		if meta.get('turnStartedAt') and meta.get('turnFinishedAt'):
			return ts(meta['turnFinishedAt']) - ts(meta['turnStartedAt'])
		return None
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
					'kind': 'tool', 't': t, 'call': msg['id'], 'name': split_tool_name(c['name'])[1], 'fullName': c['name'],
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
	return {'events': events, 'calls': calls, 'model': model, 'context': claude_context(rows),
	        'duration': f'{duration:.0f}s' if duration else '-', 'cost': cost, 'costSource': source}


def claude_context(rows):
	"""The system prompt and tools of the first API request, from the request shape in the session file."""
	shape = next((r['shape'] for r in rows if r.get('type') == 'api-request-shape'), None)
	if not shape:
		return None
	system = shape.get('system')
	text = system if isinstance(system, str) else '\n\n'.join(b.get('text', '') for b in system or [])
	tools = [{'name': t.get('name'), 'description': t.get('description') or '', 'schema': t.get('input_schema'),
	          'type': t.get('type'), 'deferred': bool(t.get('defer_loading'))} for t in shape.get('tools') or []]
	# With tool search on, the model gets only the names of deferred tools and loads a schema with ToolSearch.
	deferred = {}
	for r in rows:
		delta = r.get('attachment') if isinstance(r.get('attachment'), dict) else {}
		if delta.get('type') == 'deferred_tools_delta':
			deferred.update(dict.fromkeys(delta.get('addedNames') or []))
			for name in delta.get('removedNames') or []:
				deferred.pop(name, None)
	known = {t['name'] for t in tools}
	tools += [{'name': name, 'description': '', 'schema': None, 'type': None, 'deferred': True}
	          for name in deferred if name not in known]
	return {'messages': [{'label': 'System prompt', 'text': text}] if text else [], 'tools': tools}


def mcp_name(item):
	return f'mcp__{item["server"]}__{item.get("tool")}' if item.get('server') else None


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
				'kind': 'tool', 't': begin, 'name': item.get('tool'), 'fullName': mcp_name(item),
				'duration': end - begin, 'args': item.get('arguments'),
				'result': content_text(result) if result else item.get('error'),
				'error': bool(item.get('error')) or item.get('status') == 'failed'
				         or (isinstance(result, dict) and bool(result.get('isError') or result.get('is_error'))),
			})
	return events


def load_codex(run_dir, meta, prices):
	session = run_dir / meta['sessionFile'] if meta.get('sessionFile') else None
	rows = read_jsonl(session) if session and session.exists() else []
	tools = codex_request_tools(run_dir / (meta.get('requests') or 'requests.jsonl'), meta.get('sessionId'))
	if not (run_dir / 'stream.jsonl').exists():
		return codex_result(codex_session_events(rows), rows, meta, prices, run_seconds(meta), tools)
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
				'kind': 'tool', 't': begin, 'name': item.get('tool'), 'fullName': mcp_name(item),
				'duration': t - begin, 'args': item.get('arguments'),
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

	return codex_result(events, rows, meta, prices, (times[-1] - start) if times else None, tools)


def codex_result(events, rows, meta, prices, duration, tools=None):
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
	return {'events': events, 'calls': calls, 'model': model, 'context': codex_context(rows, tools),
	        'duration': f'{duration:.0f}s' if duration else '-',
	        'cost': f'${sum(c["cost"] for c in calls):.2f}' if priced else 'not reported',
	        'costSource': 'prices' if priced else None}


NESTED_TOOL = re.compile(r'^### `([^`]+)`[ \t]*$', re.M)
TS_BLOCK = re.compile(r'```ts\n(.*?)```', re.S)


def split_nested_tools(text):
	"""In code mode, the exec description lists the tools that its scripts can call, one ### section
	each with a TypeScript declaration. Returns the description before those sections and the tools."""
	marks = list(NESTED_TOOL.finditer(text))
	nested = []
	for i, m in enumerate(marks):
		body = text[m.end():marks[i + 1].start() if i + 1 < len(marks) else len(text)]
		blocks = TS_BLOCK.findall(body)
		if blocks:
			nested.append((m.group(1), body.split('exec tool declaration:')[0].strip(), blocks[-1].strip()))
	if not nested:
		return text, []
	return text[:marks[0].start()].rstrip(), nested


def codex_tool(t, name):
	tool = {'name': name, 'description': t.get('description') or '', 'schema': t.get('parameters'),
	        'type': t.get('type')}
	if t.get('type') != 'custom':
		return [tool]
	fmt = t.get('format') or {}
	if fmt.get('definition'):
		tool['code'] = {'label': f'Input grammar ({fmt.get("syntax") or fmt.get("type")})', 'text': fmt['definition']}
	tool['description'], nested = split_nested_tools(tool['description'])
	return [tool] + [{'name': n, 'description': d, 'schema': None, 'type': 'function', 'group': f'System · in {name}',
	                  'code': {'label': f'Declaration in {name}', 'text': decl}} for n, d, decl in nested]


def codex_request_tools(path, session_id=None):
	"""The tools of the first model request of the session thread that the request recorder saved,
	as one flat list. Side tasks, such as a title request, run on other threads with other tools."""
	if not path.exists():
		return None
	rows = [r for r in read_jsonl(path) if r.get('tools')]
	own = [r for r in rows if session_id and (r.get('client_metadata') or {}).get('thread_id')
	       and session_id.endswith(r['client_metadata']['thread_id'])]
	raw = (own or rows or [{}])[0].get('tools')
	tools = []
	for t in raw or []:
		if t.get('type') != 'namespace':
			tools += codex_tool(t, t.get('name') or t.get('type'))
			continue
		space = t.get('name') or ''
		for sub in t.get('tools') or []:
			name = sub.get('name') or ''
			tools += codex_tool(sub, f'{space.rstrip("_")}__{name}' if space.startswith('mcp__') else name)
	return tools or None


def codex_context(rows, tools=None):
	"""The base instructions and the messages that Codex adds before the prompt, from the session file,
	and the tools from the request recording."""
	meta = next((r.get('payload') or {} for r in rows if r.get('type') == 'session_meta'), {})
	text = (meta.get('base_instructions') or {}).get('text')
	messages = [{'label': 'System prompt', 'text': text}] if text else []
	for r in rows:
		payload = r.get('payload') or {}
		if r.get('type') != 'response_item' or payload.get('type') != 'message':
			continue
		body = '\n'.join(c.get('text', '') for c in payload.get('content') or [] if isinstance(c, dict)).strip()
		# Codex wraps its own context in tags. The first untagged user message is the prompt.
		if payload.get('role') == 'user' and not body.startswith('<'):
			break
		if payload.get('role') in ('developer', 'user') and body:
			messages.append({'label': 'Developer message' if payload['role'] == 'developer' else 'Context', 'text': body})
	if not messages and not tools:
		return None
	if not tools:
		return {'messages': messages, 'tools': None,
		        'toolsNote': 'Codex does not save its tool definitions, and this run has no request recording.'}
	notes = {}
	if any(t.get('group') for t in tools) and not any(split_tool_name(t['name'])[0] for t in tools):
		notes['MCP'] = 'Not in the prompt. Codex scripts look up MCP tools in ALL_TOOLS at run time.'
	return {'messages': messages, 'tools': tools, 'toolNotes': notes}


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
	contexts = instance_ai_contexts(run_dir / 'context.json')
	first = next(iter(contexts), None)
	return {'events': events, 'calls': calls, 'model': model, 'duration': f'{duration:.0f}s', 'cost': cost,
	        'costSource': 'langsmith' if usage_file.exists() else None,
	        'context': contexts.pop(first) if first else {
	            'messages': [], 'tools': None,
	            'toolsNote': 'This run has no context.json. Run langsmith_usage.py again to fetch it from LangSmith.'},
	        'agentContexts': contexts}


LEADING_TAG_BLOCK = re.compile(r'\s*<([\w-]+)>.*?</\1>', re.S)


def split_tagged_context(text):
	"""n8n puts tagged blocks, such as <thread-context>, before the user prompt. Returns (blocks, rest)."""
	blocks, pos = [], 0
	while m := LEADING_TAG_BLOCK.match(text, pos):
		blocks.append(m.group(0).strip())
		pos = m.end()
	return blocks, text[pos:].strip()


def instance_ai_contexts(path):
	"""{agent: context} from the context.json of langsmith_usage.py, in the order that the agents started.
	The first agent answers the prompt, so the report shows its prompt in the User card, not here."""
	if not path.exists():
		return {}
	contexts = {}
	for i, agent in enumerate(json.loads(path.read_text())):
		messages, system_seen = [], False
		for m in agent.get('messages') or []:
			if m['role'] == 'system':
				messages.append({'label': 'System message' if system_seen else 'System prompt', 'text': m['text']})
				system_seen = True
				continue
			blocks, rest = split_tagged_context(m['text'])
			messages += [{'label': 'Context', 'text': b} for b in blocks]
			if rest and i > 0:
				messages.append({'label': 'Briefing', 'text': rest})
		loaded = [{**t, 'group': 'System · loaded with load_tool'} for t in agent.get('loadedTools') or []]
		contexts[(agent['agent'] or '').removeprefix('llm: ') or None] = {
			'messages': [m for m in messages if m['text'].strip()], 'tools': (agent.get('tools') or []) + loaded or None}
	return contexts


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
	tools = Counter(e['name'] for e in events if e['kind'] == 'tool')
	if tools:
		return f'<code class="step-text">{esc(", ".join(f"{n} ×{k}" if k > 1 else n for n, k in tools.items()))}</code>'
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


def split_tool_name(name):
	"""('n8n', 'search_nodes') for 'mcp__n8n__search_nodes'. Names without an MCP prefix have no server."""
	parts = (name or '').split('__')
	return (parts[1], '__'.join(parts[2:])) if len(parts) >= 3 and parts[0] == 'mcp' else (None, name or '')


def tool_group(tool):
	"""System for the built-in tools of the CLI, one group for each MCP server, and Other for the rest,
	such as tools that the model provider runs."""
	server = split_tool_name(tool['name'])[0]
	if server:
		return f'MCP · {server}'
	if tool.get('type') not in (None, 'custom', 'function'):
		return 'Other'
	return 'System'


def schema_type(s):
	if not isinstance(s, dict):
		return 'any'
	if 'enum' in s:
		values = [json.dumps(v) for v in s['enum']]
		return ' | '.join(values[:6]) + (' | …' if len(values) > 6 else '')
	if 'const' in s:
		return json.dumps(s['const'])
	for key in ('anyOf', 'oneOf'):
		if key in s:
			return ' | '.join(dict.fromkeys(schema_type(x) for x in s[key]))
	t = s.get('type')
	if isinstance(t, list):
		return ' | '.join(t)
	if t == 'array':
		return f'{schema_type(s.get("items"))}[]'
	return t or 'any'


def schema_limits(s):
	labels = (('minLength', 'min length'), ('maxLength', 'max length'), ('minimum', 'min'), ('maximum', 'max'),
	          ('minItems', 'min items'), ('maxItems', 'max items'), ('format', 'format'), ('pattern', 'pattern'),
	          ('default', 'default'))
	return ' · '.join(f'{label} {json.dumps(s[k]) if k == "default" else s[k]}' for k, label in labels if k in s)


def schema_rows(schema, prefix='', depth=0):
	"""One row for each parameter. Nested objects add rows with a dotted name, two levels deep."""
	if not isinstance(schema, dict):
		return []
	required = set(schema.get('required') or [])
	rows = []
	for key, s in (schema.get('properties') or {}).items():
		s = s if isinstance(s, dict) else {}
		rows.append({'name': prefix + key, 'type': schema_type(s), 'required': key in required,
		             'description': s.get('description') or '', 'limits': schema_limits(s), 'depth': depth})
		if depth < 2:
			items = s.get('items') if isinstance(s.get('items'), dict) else {}
			if s.get('properties'):
				rows += schema_rows(s, f'{prefix}{key}.', depth + 1)
			elif items.get('properties'):
				rows += schema_rows(items, f'{prefix}{key}[].', depth + 1)
	return rows


def render_params(schema):
	rows = schema_rows(schema)
	if not rows:
		return '<p class="dim">No parameters.</p>'
	body = ''.join(
		f'<tr><td style="padding-left:{8 + 16 * r["depth"]}px"><code>{esc(r["name"])}</code>'
		+ ('<span class="req">required</span>' if r['required'] else '')
		+ f'</td><td><code class="type">{esc(r["type"])}</code></td><td>{esc(r["description"])}'
		+ (f'<div class="limits">{esc(r["limits"])}</div>' if r['limits'] else '') + '</td></tr>'
		for r in rows
	)
	return f'<table class="params"><thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>{body}</tbody></table>'


def render_tool_spec(e):
	if e.get('runtime'):
		return '<p class="dim">Not in the prompt. The model found this tool at run time, so the report has no schema for it.</p>'
	if e.get('deferred') and not e.get('schema'):
		return ('<p class="dim">Deferred. The model got only the name, and loads the schema with ToolSearch '
		        'when it needs the tool.</p>')
	if e.get('code'):
		return f'<div class="mono-label">{esc(e["code"]["label"])}</div><pre>{esc(e["code"]["text"])}</pre>'
	return (f'{render_params(e["schema"])}<details><summary>JSON schema</summary>'
	        f'<pre>{esc(json.dumps(e["schema"], indent=2))}</pre></details>')


def render_tools(tools, events, notes=None):
	"""Tool chips grouped by area, with the calls of this run, and the parameters of the selected tool.
	notes replaces the text of an empty group."""
	calls, failures = {}, {}
	for e in events:
		if e['kind'] in ('tool', 'code'):
			name = e.get('fullName') or e['name']
			calls[name] = calls.get(name, 0) + 1
			failures[name] = failures.get(name, 0) + bool(e.get('error'))
	entries = []
	for t in tools:
		short = split_tool_name(t['name'])[1]
		count = calls.get(t['name'], 0) or calls.get(short, 0)
		failed = failures.get(t['name'], 0) or failures.get(short, 0)
		entries.append({**t, 'short': short, 'group': t.get('group') or tool_group(t), 'calls': count, 'failed': failed})
	known = {t['name'] for t in tools}
	for name, count in calls.items():
		server, short = split_tool_name(name)
		if server and name not in known:
			entries.append({'name': name, 'short': short, 'description': '', 'group': f'MCP · {server}',
			                'calls': count, 'failed': failures[name], 'runtime': True})
	used = [e for e in entries if e['calls']]
	selected = max(used, key=lambda e: e['calls'])['name'] if used else entries[0]['name']

	names = {e['group'] for e in entries}
	# System and MCP always show, so an empty group says that the model had none of these tools.
	order = (['System'] + sorted(n for n in names if n.startswith('System ·'))
	         + sorted(n for n in names if n.startswith('MCP')) + (['Other'] if 'Other' in names else []))
	if not any(n.startswith('MCP') for n in names):
		order.insert(order.index('Other') if 'Other' in order else len(order), 'MCP')
	groups = []
	for group in order:
		members = sorted((e for e in entries if e['group'] == group), key=lambda e: (-e['calls'], e['short']))
		note = (notes or {}).get(group.split(' · ')[0])
		if not members:
			groups.append(f'<div class="tool-group empty"><div class="mono-label">{esc(group)} · 0</div>'
			              f'<span class="dim">{esc(note or "None given to the model.")}</span></div>')
			continue
		if all(e.get('runtime') for e in members):
			note = note or 'Not in the prompt. The model found these tools at run time.'
		elif any(e.get('deferred') and not e.get('schema') for e in members):
			note = 'Dashed tools are deferred: the model got only their names, and loads a schema with ToolSearch.'
		else:
			note = None
		chips = ''.join(
			f'<button type="button" class="chip{" used" if e["calls"] else ""}'
			f'{" runtime" if e.get("runtime") or e.get("deferred") else ""}'
			f'{" active" if e["name"] == selected else ""}"'
			f' data-tool="{esc(e["name"])}" data-search="{esc((e["short"] + " " + e["description"][:300]).lower())}">'
			f'{esc(e["short"])}'
			+ (f'<span class="count">×{e["calls"]}</span>' if e['calls'] else '')
			+ (f'<span class="fail-dot" title="{e["failed"]} failed"></span>' if e['failed'] else '')
			+ '</button>'
			for e in members
		)
		groups.append(f'<div class="tool-group"><div class="mono-label">{esc(group)} · {len(members)}</div>'
		              + (f'<span class="dim group-note">{esc(note)}</span>' if note else '')
		              + f'<div class="chips">{chips}</div></div>')

	details = []
	for e in entries:
		usage = ''
		if e['calls']:
			usage = f'<span class="badge partial">Called ×{e["calls"]}</span>'
			if e['failed']:
				usage += f'<span class="step-flag">{e["failed"]} failed</span>'
		details.append(
			f'<div class="tool-detail" data-tool="{esc(e["name"])}"{"" if e["name"] == selected else " hidden"}>'
			f'<div class="tool-detail-head"><code class="tool-name" title="{esc(e["name"])}">{esc(e["short"])}</code>'
			f'<span class="mono-label">{esc(e["group"])}</span>{usage}</div>'
			+ (f'<div class="msg tool-desc">{esc(e["description"].strip())}</div>' if e['description'].strip() else '')
			+ f'{render_tool_spec(e)}</div>'
		)
	return (
		f'<details class="card context"><summary class="card-head"><span class="mono-label">Tools</span>'
		f'<span class="mono-label">{len(tools)} tools · {len(used)} called · {size_label(json.dumps(tools))}</span></summary>'
		f'<div class="tools-browser"><div class="tools-bar"><input type="search" class="tools-filter" '
		f'placeholder="Filter tools" aria-label="Filter tools">'
		f'<span class="dim">Highlighted tools were called in this run.</span></div>'
		f'<div class="tool-groups">{"".join(groups)}</div>{"".join(details)}</div></details>'
	)


def render_context(context, events):
	"""Collapsed cards for what the model gets before the prompt: system prompt, added messages and tools."""
	if not context:
		return []
	cards = [
		f'<details class="card context"><summary class="card-head"><span class="mono-label">{esc(m["label"])}</span>'
		f'<span class="mono-label">{size_label(m["text"])}</span></summary><div class="msg">{esc(m["text"])}</div></details>'
		for m in context.get('messages') or []
	]
	if context.get('tools'):
		cards.append(render_tools(context['tools'], events, context.get('toolNotes')))
	elif context.get('toolsNote'):
		cards.append(f'<article class="card context"><div class="card-head"><span class="mono-label">Tools</span>'
		             f'<span class="dim">{esc(context["toolsNote"])}</span></div></article>')
	return cards


def sub_agent_events(events):
	"""Sub-agent tool events with the 'role › ' label removed, so that they match the tool names of the agent."""
	return [{**e, 'name': e['name'].split(' › ', 1)[1], 'fullName': None} for e in events
	        if e['kind'] == 'tool' and ' › ' in e['name']]


def render_steps(calls, events, max_prompt, max_out, prompt, context=None, agent_contexts=None):
	steps = build_steps(calls, events)
	if not steps:
		return fold('LLM steps', '', '<p class="dim">No trace for this run.</p>', cls='steps')
	names = {s['call'].get('name') for s in steps if s['call']}
	pending = dict(agent_contexts or {})
	items, panes, tool_index = [], [], 0
	for i, step in enumerate(steps, 1):
		c, evs = step['call'], step['events']
		failed = sum(1 for e in evs if e['kind'] == 'tool' and e['error'])
		# The first call answers the prompt, so the model context and the prompt open its detail.
		# A sub-agent gets its own context, which opens the detail of its first call.
		cards = render_context(context, events) if i == 1 else []
		if c and c.get('name') in pending:
			cards += render_context(pending.pop(c['name']), sub_agent_events(events))
		if i == 1 and prompt:
			cards.append(f'<article class="card user"><div class="card-head"><span class="mono-label">User</span>'
			             f'<span class="mono-label">0.0s</span></div><div class="msg">{esc(prompt)}</div></article>')
		for e in evs:
			tool_index += e['kind'] == 'tool'
			cards.append(render_card(e, tool_index))
		t = c['t'] if c else evs[0]['t']
		label = f'<span class="mono-label">{esc(c["name"])}</span>' if c and c.get('name') and len(names) > 1 else ''
		if failed:
			label += f'<span class="step-flag">{failed} failed</span>'
		items.append(
			f'<button type="button" class="step{" active" if i == 1 else ""}{" is-error" if failed else ""}" data-step="{i}">'
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
	return fold('LLM steps', f'<span class="mono-label">{count}</span>',
	            f'{legend if calls else ""}<div class="steps-layout"><div class="step-list">{"".join(items)}</div>'
	            f'<div class="step-pane">{"".join(panes)}</div></div>', cls='steps')


def code_spans(text):
	"""Show `backticked` parts of HTML text as code. Text with an odd number of backticks stays plain."""
	if text.count('`') % 2:
		return text
	return ''.join(f'<code>{part}</code>' if i % 2 else part for i, part in enumerate(text.split('`')))


def inline_code(text):
	"""Escape text and show `backticked` parts as code."""
	return code_spans(esc(text))


CHECK_GROUPS = ((False, 'bad', '✗', 'Not met'), (None, 'warn', '?', 'Not confirmed'), (True, 'ok', '✓', 'Met'))


AUTO_CHECKS_FILE = 'auto-checks.json'
# A failed check in these groups of auto-checks.json changes the verdict, when a group has no gating flag.
GATING_GROUPS = ('correctness', 'execution', 'contract')


def load_auto_checks(sub):
	path = sub / AUTO_CHECKS_FILE
	return json.loads(path.read_text()) if path.exists() else None


def load_workflow(sub):
	path = sub / 'workflow.json'
	return json.loads(path.read_text()) if path.exists() else None


def criteria_ids(expected):
	return [num for _, items in parse_criteria(expected or '') or [] for num, _ in items]


def node_value(node, path):
	"""The value at a path such as parameters.text or rules.values[0]. A path without the parameters
	prefix also reads from the parameters. Returns (found, value)."""
	keys = [int(k) if k.isdigit() else k for k in re.findall(r'[^.\[\]\'"]+', path or '')]
	for root in (node, node.get('parameters') or {}):
		current, found = root, True
		for key in keys:
			if isinstance(current, list) and isinstance(key, int) and key < len(current):
				current = current[key]
			elif isinstance(current, dict) and key in current:
				current = current[key]
			else:
				found = False
				break
		if found:
			return True, current
	return False, None


def loose(text):
	"""Text for a containment test: one quote style and single spaces."""
	return re.sub(r'\s+', ' ', text.replace('\\"', '"').replace('\\n', ' ')).replace('"', "'").strip()


def evidence_problems(evidence, workflow):
	"""The evidence entries that the workflow does not contain. An entry is {node, path, value}.
	An entry with "source": "message" quotes the final message and is not checked here."""
	nodes = {n['name']: n for n in (workflow or {}).get('nodes', [])}
	problems = []
	for e in evidence:
		if e.get('source') == 'message':
			continue
		node = nodes.get(e.get('node'))
		if node is None:
			problems.append(f'no node is called "{e.get("node")}"')
			continue
		target = node
		if e.get('path'):
			found, target = node_value(node, e['path'])
			if not found:
				problems.append(f'{e["node"]} has no {e["path"]}')
				continue
		value = e.get('value')
		text = target if isinstance(target, str) else json.dumps(target, ensure_ascii=False)
		if value not in (None, '') and loose(str(value)) not in loose(text):
			where = f'{e["node"]} › {e["path"]}' if e.get('path') else e['node']
			problems.append(f'{where} does not contain "{value}"')
	return problems


def is_strict(v):
	"""A panel verdict, or a verdict with cited evidence: a met check must then cite evidence."""
	return v.get('version', 1) >= 2 or bool(v.get('judges')) or any(c.get('evidence') for c in v.get('checks') or [])


def add_note(check, note):
	check['note'] = f'{check["note"]} {note}' if check.get('note') else note


def verify_checks(v, workflow):
	"""The checks of a verdict, with a met check that has no evidence, or evidence that the
	workflow does not contain, changed to not confirmed."""
	strict = is_strict(v)
	out = []
	for c in v.get('checks') or []:
		c = dict(c)
		if c.get('ok') is True and strict:
			if not c.get('evidence'):
				c['ok'] = None
				add_note(c, 'No evidence cited, so this is not confirmed.')
			elif problems := evidence_problems(c['evidence'], workflow):
				c['ok'] = None
				add_note(c, 'Evidence not found: ' + '; '.join(problems) + '.')
		out.append(c)
	return out


def is_gating(group):
	"""Older auto-checks.json files have no gating flag, so their group key decides."""
	return group.get('gating', group['key'] in GATING_GROUPS)


def gating_failures(auto):
	return [c for g in (auto or {}).get('groups', []) if is_gating(g)
	        for c in g['checks'] if c.get('ok') is False and c.get('level') != 'info']


def brief_met(checks, ids):
	"""(met, total) over the expected outcome criteria. Without criteria ids, or when no check has
	an id, over all checks."""
	if not ids or all(c.get('id') is None for c in checks):
		return sum(1 for c in checks if c.get('ok') is True), len(checks)
	by_id = {}
	for c in checks:
		by_id.setdefault(str(c.get('id')), []).append(c.get('ok'))
	return sum(1 for i in ids if by_id.get(i) and all(ok is True for ok in by_id[i])), len(ids)


def compute_verdict(v, checks, auto, has_workflow, ids):
	"""pass, partial or fail from the criteria, the goal and the auto-checks. The judge verdict of an
	old verdict file stays, but a failed auto-check turns its pass into partial."""
	if not v:
		return None
	gating = gating_failures(auto)
	if not is_strict(v):
		return 'partial' if v.get('verdict') == 'pass' and gating else v.get('verdict')
	if not has_workflow or v.get('goalMet') is False:
		return 'fail'
	met, total = brief_met(checks, ids)
	return 'pass' if total and met == total and not gating else 'partial'


def verdict_view(v, sub, expected):
	"""The verdict as the page shows it: verified checks and the computed verdict. Returns (view, auto)."""
	auto = load_auto_checks(sub)
	if not v:
		return v, auto
	workflow = load_workflow(sub)
	checks = verify_checks(v, workflow)
	view = dict(v, checks=checks, judgeVerdict=v.get('verdict'))
	view['verdict'] = compute_verdict(v, checks, auto, workflow is not None, criteria_ids(expected))
	if quality := quality_group(v):
		auto = dict(auto or {'groups': []}, groups=[*(auto or {}).get('groups', []), quality])
	return view, auto


def quality_group(v):
	"""The LLM binary checks of the eval suite, as the judge panel answered them. They do not change the verdict."""
	items = v.get('quality') or []
	if not items:
		return None
	checks = [{'id': f'Q{i + 1}', 'ok': q.get('ok'), 'text': f'{q["id"]}: {q.get("text", "")}',
	           'details': [q['note']] if q.get('note') else [],
	           'source': {'label': 'Instance AI eval binary checks (LLM), answered by the judges',
	                      'path': 'packages/@n8n/instance-ai/evaluations/binaryChecks/checks'}} for i, q in enumerate(items)]
	scored = [c for c in checks if c['ok'] is not None]
	return {'key': 'quality', 'title': 'Eval quality checks', 'gating': False,
	        'note': 'The LLM binary checks of the Instance AI eval suite. The judge panel answers them. This score does not change the verdict.',
	        'score': {'passed': sum(1 for c in scored if c['ok']), 'total': len(scored)}, 'checks': checks}


def standards_score(auto):
	group = next((g for g in (auto or {}).get('groups', []) if g['key'] == 'standards'), None)
	return (group or {}).get('score')


def verdict_head(v, expected=''):
	checks = v.get('checks') or []
	met, total = brief_met(checks, criteria_ids(expected))
	count = f'<span class="mono-label">{met} of {total} met</span>' if total else ''
	panel = ''
	if v.get('judges'):
		split = len(v.get('disagreements') or [])
		panel = (f'<span class="mono-label{" err" if split else ""}">{v["judges"]} judges'
		         + (f' · {split} split' if split else '') + '</span>')
	return f'<span class="head-meta">{panel}{count}{badge(v.get("verdict"))}</span>'


CHECK_CLASS = {True: 'ok', False: 'bad', None: 'warn'}
OTHER_FINDINGS = 'Other findings'


def check_body(c):
	"""The text of a judge check, with its note and the evidence that it cites."""
	parts = [f'<span>{inline_code(c.get("text", ""))}</span>']
	if c.get('note'):
		parts.append(f'<span class="check-note">{inline_code(c["note"])}</span>')
	cited = []
	for e in c.get('evidence') or []:
		where = 'Final message' if e.get('source') == 'message' else ' › '.join(filter(None, [e.get('node'), e.get('path')]))
		value = f' = <code>{esc(str(e["value"]))}</code>' if e.get('value') not in (None, '') else ''
		cited.append(f'<li>{esc(where)}{value}</li>')
	if cited:
		parts.append(f'<ul class="check-details">{"".join(cited)}</ul>')
	return f'<span class="check-body">{"".join(parts)}</span>'


def render_goal(v):
	"""A failed goal shows above the checks, because it fails the run on its own. A minority of judges
	that says the goal is not met shows as a warning."""
	if v.get('goalMet') is not False:
		split = next((d for d in v.get('disagreements') or [] if d.get('id') == 'goal'), None)
		if not split:
			return ''
		no = split['votes'].count(False)
		reasons = '; '.join(t for t in split.get('texts') or [] if t)
		return (f'<ul class="checks goal"><li class="warn"><span class="mark" aria-hidden="true">?</span>'
		        f'<span>{no} of {len(split["votes"])} judges {"says" if no == 1 else "say"} the workflow does not do what the prompt asks'
		        f'{": " + inline_code(reasons) if reasons else ""}</span></li></ul>')
	reason = f': {inline_code(v["goalReason"])}' if v.get('goalReason') else ''
	return (f'<ul class="checks goal"><li class="bad"><span class="mark" aria-hidden="true">✗</span>'
	        f'<span>The workflow does not do what the prompt asks{reason}</span></li></ul>')


def render_checks(v, expected=''):
	"""The judge summary and the checks. expected is the plain expected outcome text.
	When it has numbered groups and the checks have an id, the checks show under the same groups as the brief.
	Otherwise the failed checks show first."""
	checks = v.get('checks') or []
	summary = f'<p class="summary">{inline_code(v["summary"])}</p>' if v.get('summary') else ''
	summary += render_goal(v)
	criteria = parse_criteria(esc(expected)) if expected else None
	if criteria and any(c.get('id') is not None for c in checks):
		return summary + render_checks_by_criteria(checks, criteria)
	groups = []
	for ok, cls, mark, label in CHECK_GROUPS:
		items = [c for c in checks if c.get('ok') is ok]
		if items:
			rows = ''.join(f'<li class="{cls}"><span class="mark" aria-hidden="true">{mark}</span>'
			               f'{check_body(c)}</li>' for c in items)
			groups.append(f'<div class="check-group"><div class="mono-label">{label} · {len(items)}</div>'
			              f'<ul class="checks">{rows}</ul></div>')
	return summary + ''.join(groups)


def render_checks_by_criteria(checks, criteria):
	"""The checks under the groups of the expected outcome. A group with a failed or unconfirmed check shows open.
	A criterion without a check shows its own text as not judged. Checks with no known id show under Other findings."""
	by_id = {}
	for c in checks:
		by_id.setdefault(str(c.get('id')), []).append(c)
	known = {num for _, items in criteria for num, _ in items}
	other = [c for c in checks if str(c.get('id')) not in known]
	groups = [(heading, [(num, by_id.get(num), text) for num, text in items]) for heading, items in criteria]
	if other:
		groups.append((OTHER_FINDINGS, [('·', [c], '') for c in other]))
	parts = []
	for heading, rows in groups:
		html_rows = ''.join(
			''.join(f'<li class="{CHECK_CLASS.get(c.get("ok"), "warn")}"><span class="mark num" aria-hidden="true">{num}</span>'
			        f'{check_body(c)}</li>' for c in cs)
			if cs else f'<li class="warn"><span class="mark num" aria-hidden="true">{num}</span>'
			           f'<span class="dim">Not judged: {code_spans(text)}</span></li>'
			for num, cs, text in rows)
		body = f'<ul class="checks">{html_rows}</ul>'
		if not heading:
			parts.append(f'<div class="criteria-group">{body}</div>')
			continue
		met = sum(1 for _, cs, _ in rows if cs and all(c.get('ok') is True for c in cs))
		failed = met < len(rows)
		count = f'{len(rows)} found' if heading == OTHER_FINDINGS else f'{met} of {len(rows)} met'
		label = f'<span class="mono-label{" err" if failed else ""}">{count}</span>'
		parts.append(f'<details class="criteria-group"{" open" if failed else ""}><summary class="criteria-title">'
		             f'<span>{heading}</span>{label}</summary>{body}</details>')
	return f'<div class="verdict-groups">{"".join(parts)}</div>'


JUDGE_WAIT_TEXT = {'queued': 'Waiting for the judge.', 'running': 'The judge is checking this run.'}


def fold(title, meta, body, open_=False, cls=''):
	"""A collapsible box: the title and meta HTML in the header row, the body below."""
	return (f'<details class="box fold{" " + cls if cls else ""}"{" open" if open_ else ""}><summary class="head">'
	        f'<h2>{title}</h2>{meta}</summary>{body}</details>')


def render_verdict(v, expected='', judge=None, pending=False):
	"""The Expected outcome box. It shows open when the verdict is not pass or a check is not confirmed.
	pending is true on the live page, before the judges can run."""
	if not v:
		if pending:
			return fold('Expected outcome', '<span class="mono-label">Not verified yet</span>',
			            '<p class="dim">The judges check this run against the expected outcome after all builders finish.</p>')
		meta = pending_badge('judge', judge) or '<span class="mono-label">Not judged</span>'
		return fold('Expected outcome', meta, f'<p class="dim">{JUDGE_WAIT_TEXT.get(judge, "Not judged yet.")}</p>')
	attention = v.get('verdict') != 'pass' or any(c.get('ok') is not True for c in v.get('checks') or [])
	return fold('Expected outcome', verdict_head(v, expected), render_checks(v, expected), open_=attention)


def auto_check_row(c):
	info = c.get('level') == 'info'
	cls = 'info' if info else CHECK_CLASS.get(c.get('ok'), 'warn')
	details = ''.join(f'<li>{inline_code(d)}</li>' for d in c.get('details') or [])
	source = c.get('source') or {}
	links = []
	for s in (source, source.get('also') or {}):
		if s.get('url'):
			links.append(f'<a href="{esc(s["url"])}" target="_blank">{esc(s["label"])} ↗</a>')
		elif s.get('label'):
			links.append(esc(s['label']) + (f' (<code>{esc(s["path"])}</code>)' if s.get('path') else ''))
	return (f'<li class="{cls}"><span class="mark num" aria-hidden="true">{esc(c["id"])}</span><span class="check-body">'
	        f'<span>{inline_code(c.get("text", ""))}</span>'
	        + (f'<ul class="check-details">{details}</ul>' if details else '')
	        + (f'<span class="check-source">Source: {" · ".join(links)}</span>' if links else '')
	        + '</span></li>')


def render_auto_checks(auto):
	"""The groups of auto-checks.json. A gating group with a failed check shows open."""
	if not auto:
		return ''
	parts = []
	for g in auto.get('groups', []):
		judged = [c for c in g['checks'] if c.get('ok') is not None and c.get('level') != 'info']
		failed = sum(1 for c in judged if c['ok'] is False)
		gating = is_gating(g)
		score = g.get('score')
		if score:
			label = f'Score {score["passed"]} of {score["total"]} · does not change the verdict'
		else:
			label = f'{len(judged) - failed} of {len(judged)} passed' if judged else 'Not checked'
		rows = ''.join(auto_check_row(c) for c in g['checks'])
		parts.append(fold(
			esc(g['title']), f'<span class="mono-label{" err" if gating and failed else ""}">{esc(label)}</span>',
			f'<p class="dim auto-note">{esc(g.get("note", ""))}</p><ul class="checks">{rows}</ul>',
			open_=gating and failed > 0, cls='auto-group'))
	return ''.join(parts)


PENDING_CHECK_GROUPS = (
	('Correctness', 'Checks from the node definitions, the n8n editor and the workflow graph.'),
	('Execution with pinned data', 'Runs the workflow once for each scenario, with pinned data.'),
	('n8n standards', 'Rules from n8n-io/skills and the workflow-sdk best practices.'),
)


def render_pending_checks():
	"""Placeholders for the auto-check groups that every run gets, before auto-checks.json exists."""
	return ''.join(fold(title, '<span class="mono-label">Not run yet</span>',
	                    f'<p class="dim auto-note">{esc(note)} These checks run after all builders finish.</p>',
	                    cls='auto-group') for title, note in PENDING_CHECK_GROUPS)


def render_result(verdict, judge, auto):
	"""The Result cell: the verdict badge and the standards score."""
	score = standards_score(auto)
	std = (f' <span class="mono-label std" title="n8n standards score. It does not change the verdict.">'
	       f'Std {score["passed"]}/{score["total"]}</span>' if score and score['total'] else '')
	return badge((verdict or {}).get('verdict'), judge) + std


PLAYER_CACHE = ASSET_CACHE / f'asciinema-player-{PLAYER_VERSION}'
PLAYER_CDN = f'https://cdn.jsdelivr.net/npm/asciinema-player@{PLAYER_VERSION}/dist/bundle/'


def ensure_player_cache():
	"""Download the asciinema player once. Raises OSError when the download fails."""
	PLAYER_CACHE.mkdir(parents=True, exist_ok=True)
	for name in PLAYER_FILES:
		if not (PLAYER_CACHE / name).exists():
			partial = PLAYER_CACHE / f'{name}.part'
			urllib.request.urlretrieve(PLAYER_CDN + name, partial)
			partial.rename(PLAYER_CACHE / name)


def player_assets(report):
	"""Copy the asciinema player next to the page, so the page works offline. Returns its URLs."""
	cache, cdn = PLAYER_CACHE, PLAYER_CDN
	try:
		ensure_player_cache()
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


REPLAY_FINEPRINT = ('Terminal screens are exact recordings of the interactive CLI. Instance AI is a video '
                    'of the n8n UI. Skip pauses shortens idle time in the terminal recordings only. Press Esc to close.')


def screen_kind(s):
	return esc(s.get('label') or ('Terminal' if s['type'] == 'cast' else 'n8n UI'))


def render_replay(screens, fineprint=REPLAY_FINEPRINT):
	"""A strip of final screens that play in place, and a full-screen player that Expand opens.

	A screen can set "label" to replace the "Terminal" or "n8n UI" text under its card."""
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
		kind = screen_kind(s)
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
		f'<figure class="screen" data-run="{esc(s["name"])}"><figcaption class="screen-head">'
		f'<span class="run-name">{esc(s["title"])}</span><span class="mono-label">{screen_kind(s)} · {esc(s["duration"])}</span>'
		f'{badge(s["verdict"]) if s.get("verdict") else ""}</figcaption><div class="screen-frame">'
		+ (f'<video controls muted playsinline preload="metadata" src="{esc(s["src"])}"'
		   + (f' poster="{esc(s["poster"])}"' if s.get('poster') else '') + '></video>' if s['type'] == 'video'
		   else '<div class="player"></div>')
		+ '</div></figure>'
		for s in screens
	)
	speeds = ''.join(f'<button type="button" data-speed="{n}" aria-pressed="{str(n == 1).lower()}">{n}×</button>'
	                 for n in (1, 2, 4, 8))
	return (
		f'<div class="box replay"><div class="head"><h2>Replay</h2>{side_by_side}</div>'
		f'<div class="reel">{"".join(cards)}</div></div>'
		'<div class="theater" id="theater" role="dialog" aria-modal="true" aria-label="Replay" hidden>'
		f'<div class="theater-bar"><h2>Replay</h2><div class="tabs">{tabs}</div><div class="theater-controls">'
		f'<div class="speed" id="speed" role="group" aria-label="Speed"><span class="mono-label">Speed</span>{speeds}</div>'
		'<label class="mono-label"><input type="checkbox" id="skip-idle" checked> Skip pauses</label>'
		'<button type="button" class="btn" id="restart-all">Restart</button>'
		'<button type="button" class="btn accent" id="play-all">Play all</button>'
		'<button type="button" class="btn" id="theater-close">Close</button></div></div>'
		f'<div class="replay-grid" id="replay-grid">{figures}</div>'
		f'<p class="fineprint">{fineprint}</p></div>'
	)


PENDING_BADGES = {
	'judge': {'queued': ('st-waiting', 'Judge queued'), 'running': ('st-running', 'Judging')},
	'prices': {'queued': ('st-waiting', 'Price queued'), 'running': ('st-running', 'Finding price')},
}


def pending_badge(step, state):
	"""The badge of a step that comes after the run, or '' when the step is not queued or running."""
	cls, label = PENDING_BADGES[step].get(state, (None, None))
	return f'<span class="badge {cls}">{label}</span>' if cls else ''


def badge(verdict, judge=None):
	"""The verdict badge. Without a verdict, judge is the state of the judge step."""
	if not verdict:
		return pending_badge('judge', judge) or '<span class="badge none">Not judged</span>'
	return f'<span class="badge {esc(verdict)}">{esc(verdict.upper())}</span>'


RUN_ORDER = {'instance-ai': 0, 'claude': 1, 'codex': 2}


def load_case(run_dir):
	case = json.loads((run_dir / 'case.json').read_text())
	if 'prompt' not in case:
		case['prompt'] = (run_dir / 'prompt.txt').read_text().strip()
	return case


def load_verdicts(run_dir):
	verdicts_file = run_dir / 'verdicts.json'
	return json.loads(verdicts_file.read_text()) if verdicts_file.exists() else {}


def load_run(sub, meta, prices):
	try:
		return LOADERS[meta['kind']](sub, meta, prices)
	except Exception as e:  # keep the other runs when one run has broken files
		return {'events': [], 'calls': [], 'model': meta.get('model'), 'duration': '-', 'cost': '-',
		        'costSource': None, 'loadError': f'{type(e).__name__}: {e}'}


def collect_runs(run_dir, case):
	runs = []
	for meta_file in sorted(run_dir.glob('*/run.json')):
		sub = meta_file.parent
		meta = json.loads(meta_file.read_text())
		if meta.get('kind') not in LOADERS or sub.name == 'report':
			continue
		runs.append((sub.name, meta, load_run(sub, meta, case.get('prices'))))
	runs.sort(key=lambda r: (RUN_ORDER.get(r[1]['kind'], 9), r[0]))
	return runs


def token_scale(runs):
	all_calls = [c for _, _, d in runs for c in d['calls']]
	return max([c['prompt'] for c in all_calls] + [1]), max([c['out'] for c in all_calls] + [1])


def run_title(name, meta):
	title = TITLES.get(meta['kind'], meta['kind'])
	return title if name in ('iai', 'claude', 'codex') else f'{title} ({name})'


def render_row_cells(name, meta, data, result):
	"""The table cells of one run. result is the HTML of the Result cell.
	data can have costPending, the state of the price step, and costTitle, the source of the cost."""
	calls = data['calls']
	title = f' title="{esc(data["costTitle"])}"' if data.get('costTitle') else ''
	cost = pending_badge('prices', data.get('costPending')) or f'<strong{title}>{esc(data["cost"])}</strong>'
	tools = [e for e in data['events'] if e['kind'] == 'tool']
	errors = sum(e['error'] for e in tools)
	prompt = sum(c['prompt'] for c in calls)
	cached = sum(c['cache_read'] for c in calls)
	out = sum(c['out'] for c in calls)
	cells = [
		f'<span class="run-name">{esc(run_title(name, meta))}</span>', esc(data.get('model') or '-'),
		(f'<span title="{esc("Source: " + meta["effortSource"])}">{esc(meta["effort"])}</span>'
		 if meta.get('effort') and meta.get('effortSource') else esc(meta.get('effort') or '-')),
		result, data['duration'], str(len(calls)),
		f'{len(tools)}' + (f' <span class="err">({errors} err)</span>' if errors else ''),
		kilo(prompt), f'{100 * cached / prompt:.0f}%' if prompt else '-', kilo(out), cost,
	]
	return ''.join(f'<td>{c}</td>' for c in cells)


def render_canvas_box(name, meta, report, base_url, empty='No workflow was created.'):
	wf = meta.get('workflowId')
	image = report / 'img' / f'{name}.png'
	# capture_canvas.mjs takes the screenshot at twice the CSS size.
	size = ' '.join(f'{k}="{v // 2}"' for k, v in zip(('width', 'height'), png_size(image))) if image.exists() else ''
	n8n_url = f'{base_url}/workflow/{wf}' if wf else ''
	title = esc(run_title(name, meta))
	canvas = (
		f'<a class="canvas" href="img/{name}.png" target="_blank" data-canvas="{name}" data-title="{title}" '
		f'data-n8n="{esc(n8n_url)}"><img src="img/{name}.png" {size} alt="{title} canvas"></a>'
		if image.exists() else f'<p class="dim">{esc(empty)}</p>'
	)
	workflow = load_workflow(report.parent / name)
	nodes = [n for n in (workflow or {}).get('nodes', []) if n.get('type') != 'n8n-nodes-base.stickyNote']
	count = f'<span class="mono-label">{len(nodes)} node{"" if len(nodes) == 1 else "s"}</span>' if workflow else ''
	link = f'<a href="{n8n_url}" target="_blank">Open in n8n ↗</a>' if wf else ''
	return fold('Canvas', f'<span class="head-meta">{count}{link}</span>', canvas, cls='canvas-box')


def render_panel_body(data, verdict, canvas_box, max_prompt, max_out, prompt, expected='', judge=None, auto=None,
                      pending=False):
	"""The content of the section of one run: canvas, result, auto-checks and LLM steps.
	judge is the state of the judge step, and auto the content of auto-checks.json. pending is true on the
	live page: checks and verdicts that do not exist yet show as not run."""
	error = f'<div class="box err">Could not read this run: {esc(data["loadError"])}</div>' if data.get('loadError') else ''
	checks = render_pending_checks() if pending and not auto else render_auto_checks(auto)
	return (f'{error}<div class="folds">{canvas_box}{render_verdict(verdict, expected, judge, pending)}'
	        f'{checks}</div>'
	        f'{render_steps(data["calls"], data["events"], max_prompt, max_out, prompt, data.get("context"), data.get("agentContexts"))}')


POST_RUN_STEPS = ('judge', 'prices')
POST_RUN_STATES = ('queued', 'running', 'done')


def step_arg(value):
	step, _, state = value.partition('=')
	if step not in POST_RUN_STEPS or state not in POST_RUN_STATES:
		raise argparse.ArgumentTypeError(f'use {"|".join(POST_RUN_STEPS)}={"|".join(POST_RUN_STATES)}, not {value}')
	return step, state


def read_status(run_dir, steps=()):
	"""status.json. steps are (step, state) pairs to write to its postRun object first."""
	status_file = run_dir / 'status.json'
	status = json.loads(status_file.read_text()) if status_file.exists() else {}
	if steps:
		status.setdefault('postRun', {}).update(steps)
		tmp = status_file.with_suffix('.tmp')
		tmp.write_text(json.dumps(status, indent=2))
		os.replace(tmp, status_file)
	return status


def cost_title(meta, data, prices):
	"""Where the cost of a run comes from, for the tooltip of its Cost cell."""
	source = data.get('costSource')
	if source == 'langsmith':
		return 'From the LangSmith call costs.'
	if source == 'claude-code':
		return 'The estimate of Claude Code.'
	p = prices.get(data.get('model')) if source == 'prices' else None
	if not p:
		return 'Instance AI cost comes from LangSmith.' if meta['kind'] == 'instance-ai' else 'No published price.'
	return (f'Tokens × the published price of {data["model"]}: ${p.get("input", 0)} input, '
	        f'${p.get("cached", 0)} cache read, ${p.get("cacheWrite", p.get("input", 0))} cache write, '
	        f'${p.get("output", 0)} output per million tokens.' + (f' Source: {p["source"]}' if p.get('source') else ''))


RELOAD_JS = """
// Served by the live server while a step is pending: reload when the page is built again.
window.addEventListener('DOMContentLoaded', ()=>{
  const saved = JSON.parse(sessionStorage.getItem('report-view') || 'null');
  if (saved) {
    sessionStorage.removeItem('report-view');
    if (document.getElementById(saved.run)) show(saved.run);
    window.scrollTo(0, saved.y);
  }
  if (!PENDING || !location.protocol.startsWith('http')) return;
  setInterval(async ()=>{
    try {
      const version = (await (await fetch('version.txt', {cache: 'no-store'})).text()).trim();
      if (version && version !== REPORT_VERSION) {
        sessionStorage.setItem('report-view', JSON.stringify({run: document.querySelector('.run.active')?.id, y: window.scrollY}));
        location.reload();
      }
    } catch {}
  }, 3000);
});
"""


def main():
	ap = argparse.ArgumentParser(description='Build the comparison page of a run directory.')
	ap.add_argument('run_dir', nargs='?', default='.')
	ap.add_argument('--step', type=step_arg, action='append', default=[],
	                help='Set the state of a step after the run, for example judge=running. Repeat for more steps.')
	args = ap.parse_args()
	run_dir = Path(args.run_dir).resolve()
	status = read_status(run_dir, args.step)
	case = load_case(run_dir)
	verdicts = load_verdicts(run_dir)
	report = run_dir / 'report'
	(report / 'img').mkdir(parents=True, exist_ok=True)
	if ASSET_CACHE.exists():
		for sub in ('fonts', 'brand'):
			if (ASSET_CACHE / sub).exists():
				shutil.copytree(ASSET_CACHE / sub, report / sub, dirs_exist_ok=True)

	runs = collect_runs(run_dir, case)
	if not runs:
		sys.exit('No runs found.')
	for name, _, _ in runs:
		if (run_dir / name / 'canvas.png').exists():
			shutil.copy(run_dir / name / 'canvas.png', report / 'img' / f'{name}.png')

	max_prompt, max_out = token_scale(runs)
	base_url = case.get('baseUrl', 'http://localhost:5678')
	post_run = status.get('postRun') or {}
	# A run with a verdict is judged, so a step that was not marked done does not show as pending.
	judge = post_run.get('judge') if any(name not in verdicts for name, _, _ in runs) else None
	pending = False
	views = {name: verdict_view(verdicts.get(name), run_dir / name, case.get('expected') or '') for name, _, _ in runs}

	rows, panels = [], []
	for i, (name, meta, data) in enumerate(runs):
		active = ' active' if i == 0 else ''
		verdict, auto = views[name]
		data['costTitle'] = cost_title(meta, data, case.get('prices') or {})
		if meta['kind'] != 'instance-ai' and data.get('costSource') is None:
			data['costPending'] = post_run.get('prices')
		pending = pending or (not verdict and judge in ('queued', 'running')) \
			or data.get('costPending') in ('queued', 'running')
		rows.append(f'<tr class="row{active}" data-run="{name}" onclick="show(\'{name}\')">'
		            + render_row_cells(name, meta, data, render_result(verdict, judge, auto)) + '</tr>')
		canvas_box = render_canvas_box(name, meta, report, base_url)
		panels.append(f'<section class="run{active}" id="{name}">'
		              + render_panel_body(data, verdict, canvas_box, max_prompt, max_out, case['prompt'],
		                                  case.get('expected') or '', judge, auto=auto)
		              + '</section>')

	# The agent reads this file to find the models that still need a published price.
	models = [{'run': name, 'kind': meta['kind'], 'model': data.get('model'), 'costSource': data.get('costSource')}
	          for name, meta, data in runs]
	(run_dir / 'models.json').write_text(json.dumps(models, indent=2))
	unpriced = sorted({m['model'] for m in models
	                   if m['model'] and m['kind'] != 'instance-ai' and m['costSource'] != 'prices'})

	screens = collect_screens(runs, run_dir, report, {name: v for name, (v, _) in views.items() if v})
	head, scripts = '', ''
	if any(s['type'] == 'cast' for s in screens):
		player_js, player_css = player_assets(report)
		head = f'<link rel="stylesheet" href="{esc(player_css)}">'
		scripts = f'<script src="{esc(player_js)}"></script>' + ''.join(
			f'<script src="{esc(s["src"])}"></script>' for s in screens if s['type'] == 'cast')
	version = str(time.time_ns())
	scripts += (f'<script>const SCREENS = {json.dumps(screens)}; const REPORT_VERSION = "{version}"; '
	            f'const PENDING = {json.dumps(pending)};</script><script>{RELOAD_JS}</script>')

	meta = [f'{len(runs)} builder' + ('s' if len(runs) > 1 else '')]
	if status.get('startedAt'):
		meta.insert(0, datetime.fromtimestamp(status['startedAt']).strftime('%b %-d, %Y · %H:%M'))
	if status.get('mode') == 'parallel':
		meta.append('run in parallel')
	page = fill_template(esc(case.get('title') or 'Builder comparison'), ''.join(rows), '',
	                     ''.join(panels), replay=render_replay(screens), head=head, scripts=scripts,
	                     prompt=esc(case['prompt']), expected=esc(case.get('expected') or '-'),
	                     meta=esc(' · '.join(meta)))
	(report / 'index.html').write_text(page)
	(report / 'version.txt').write_text(version)
	print(report / 'index.html')
	if unpriced:
		print('models without a published price in case.json: ' + ', '.join(unpriced))


LIST_ITEM = re.compile(r'^\s*(?:(\d+)[.)]|[-*•])\s+')


def parse_criteria(expected):
	"""Split an expected outcome into [(heading, [(number, text)])].
	A line that is not a list item starts a new group. Returns None when the text is not a list."""
	groups = []
	for line in expected.splitlines():
		if not line.strip():
			continue
		match = LIST_ITEM.match(line)
		if not match:
			groups.append((line.strip().rstrip(':'), []))
			continue
		if not groups:
			groups.append(('', []))
		items = groups[-1][1]
		items.append((match.group(1) or str(sum(len(g[1]) for g in groups)), line[match.end():].strip()))
	if sum(len(items) for _, items in groups) < 2 or any(not items for _, items in groups):
		return None
	return groups


def render_criteria(groups):
	"""The groups from parse_criteria as numbered lists. A group with a heading shows collapsed. The text is HTML."""
	parts = []
	for heading, items in groups:
		rows = ''.join(f'<li><span class="num">{num}</span><span>{code_spans(text)}</span></li>' for num, text in items)
		if not heading:
			parts.append(f'<div class="criteria-group"><ol class="criteria">{rows}</ol></div>')
			continue
		span = items[0][0] if len(items) == 1 else f'{items[0][0]}–{items[-1][0]}'
		parts.append(
			f'<details class="criteria-group"><summary class="criteria-title"><span>{heading}</span>'
			f'<span class="mono-label">{span} · {len(items)} checks</span></summary>'
			f'<ol class="criteria">{rows}</ol></details>')
	return ''.join(parts)


def render_brief(prompt, expected):
	"""The prompt and expected outcome boxes. Both arguments are HTML.
	An expected outcome with one numbered or bulleted item on each line shows as numbered lists,
	grouped under the plain lines between them."""
	groups = parse_criteria(expected)
	if groups:
		total = sum(len(items) for _, items in groups)
		named = sum(1 for heading, _ in groups if heading)
		label = f'{total} checks' + (f' · {named} groups' if named > 1 else '')
		toggle = '<button type="button" class="btn" data-expand-all>Expand all</button>' if named else ''
		body = render_criteria(groups)
		count = f'<span class="head-meta"><span class="mono-label">{label}</span>{toggle}</span>'
	else:
		body, count = f'<div class="msg">{code_spans(expected)}</div>', ''
	words = len(html.unescape(prompt).split())
	prompt_meta = (f'<span class="head-meta"><span class="mono-label">Sent to every builder · {words} words</span>'
	               '<button type="button" class="btn" data-copy="brief-prompt">Copy</button></span>')
	return (
		'<section class="brief folds">'
		+ fold('Prompt', prompt_meta, f'<blockquote class="msg" id="brief-prompt">{prompt}</blockquote>',
		       open_=True, cls='brief-card prompt')
		+ fold('Expected outcome', count, body, cls='brief-card expected')
		+ '</section>'
	)


THEAD = ('<tr><th>Run</th><th>Model</th><th>Effort</th><th>Result</th><th>Active time</th><th>LLM calls</th><th>Tool calls</th>'
         '<th>Input tokens</th><th>Cached</th><th>Output tokens</th><th>Cost</th></tr>')


def fill_template(title, rows, notes, panels, replay='', head='', scripts='', case=None, thead=THEAD,
                  prompt='', expected='', after_table='', kicker='Builder comparison', meta=''):
	"""The full page. Text arguments are HTML. case defaults to the prompt and expected outcome boxes.
	kicker is the label next to the logo, and meta the line under the title.
	replay comes before the table, and after_table between the table and the panels."""
	return (TEMPLATE
	        .replace('{{THEAD}}', thead)
	        .replace('{{HEAD}}', head)
	        .replace('{{REPLAY}}', replay)
	        .replace('{{AFTER_TABLE}}', after_table)
	        .replace('{{SCRIPTS}}', scripts)
	        .replace('{{KICKER}}', kicker)
	        .replace('{{META}}', f'<p class="page-meta mono-label">{meta}</p>' if meta else '')
	        .replace('{{TITLE}}', title)
	        .replace('{{ROWS}}', rows)
	        .replace('{{NOTES}}', f'<p class="fineprint">{notes}</p>' if notes else '')
	        .replace('{{CASE}}', render_brief(prompt, expected) if case is None else case)
	        .replace('{{PANELS}}', panels))


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
.page-head{margin-bottom:var(--s24)}
.brand-row{display:flex;align-items:center;gap:var(--s12)}
.brand-row img{height:20px}
.brand-row img + .mono-label{padding-left:var(--s12);box-shadow:inset 1px 0 0 var(--line-strong)}
.page-head h1{margin-top:var(--s16);font-size:32px;line-height:36px;letter-spacing:-.01em;max-width:960px}
.page-meta{margin:var(--s8) 0 0}
.brief{margin-bottom:var(--s32)}
.brief-card.prompt{background:var(--white);box-shadow:inset 0 0 0 1px var(--line),inset 4px 0 0 var(--pink);padding-left:calc(var(--s16) + 4px)}
.brief-card blockquote{margin:0;font-size:18px;line-height:26px}
details.criteria-group + details.criteria-group{border-top:1px solid var(--line-strong)}
.criteria-title{display:flex;align-items:baseline;gap:var(--s8);padding:var(--s12) 0;font-weight:500;cursor:pointer;list-style:none}
.criteria-title::-webkit-details-marker{display:none}
.criteria-title::before{content:"";flex:none;align-self:center;width:6px;height:6px;margin-right:var(--s4);border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);transition:transform .15s}
details[open] > .criteria-title::before{transform:rotate(45deg)}
.criteria-title .mono-label{margin-left:auto}
.criteria-title:hover{color:var(--dim)}
.criteria-title:focus-visible{outline:2px solid var(--pink);outline-offset:2px;border-radius:var(--r4)}
details.criteria-group > .criteria{padding-bottom:var(--s12)}
details.criteria-group:first-of-type > .criteria-title{padding-top:0}
@media (prefers-reduced-motion:reduce){.criteria-title::before{transition:none}}
.checks .mark.num{width:auto;min-width:20px;height:20px;margin-top:-1px;padding:0 var(--s4);border-radius:var(--full)}
.criteria{list-style:none;margin:0;padding:0}
.criteria li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:var(--s12);padding:var(--s8) 0;text-wrap:pretty}
.criteria li:first-child{padding-top:0}
.criteria li + li{border-top:1px solid var(--line)}
.criteria .num{display:grid;place-items:center;height:24px;margin-top:-3px;border-radius:var(--full);background:var(--white);box-shadow:inset 0 0 0 1px var(--line);font:10px/14px var(--mono)}
.brief code{font-size:12px;padding:0 4px;border-radius:var(--r4);background:var(--white);box-shadow:inset 0 0 0 1px var(--line);word-break:break-word}
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
/* Live page */
.badge.st-waiting,.badge.st-skipped{box-shadow:inset 0 0 0 1px var(--line-strong);color:var(--dim)}
.badge.st-running{background:var(--pink-10);color:var(--pink-70);box-shadow:inset 0 0 0 1px var(--pink-30)}
.badge.st-running::before{content:"";display:inline-block;width:6px;height:6px;margin-right:var(--s8);border-radius:50%;background:var(--pink-70);vertical-align:1px;animation:pulse 1.2s ease-in-out infinite}
.badge.st-done{background:var(--bg-3);color:var(--black)}
.badge.st-failed{background:var(--pink-70);color:var(--bg)}
@keyframes pulse{50%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.badge.st-running::before{animation:none}}
.live-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s16)}
@media (max-width:1000px){.live-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.live-grid{grid-template-columns:minmax(0,1fr)}}
.live-card{display:flex;flex-direction:column;min-width:0;background:var(--white);border:1px solid var(--line);border-radius:var(--r8);overflow:hidden}
.live-card:has([data-live-badge] :is(.st-failed,.st-error)){background:var(--pink-10);border-color:var(--pink-70);box-shadow:0 0 0 1px var(--pink-70)}
.live-card .reel-meta{align-items:flex-start;padding:var(--s12)}
.live-card .run-name{padding-top:3px;word-break:break-word}
.live-card [data-live-badge]{flex:none}
.live-screen{position:relative;aspect-ratio:16/10;overflow:hidden;background:var(--bg-2);border-bottom:1px solid var(--line)}
.live-screen:has([data-cast]){background:var(--black)}
.live-screen img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center;transition:transform .15s}
.live-screen img[hidden]{display:none}
.live-screen .live-empty{display:grid;place-items:center;height:100%;color:var(--gray-50);font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em;padding:var(--s16);text-align:center}
.live-screen [data-cast],.live-screen [data-cast] .ap-wrapper{width:100%;height:100%}
.live-screen .ap-control-bar,.live-screen .ap-overlay-info,.live-zoomed .ap-control-bar,.live-zoomed .ap-overlay-info{display:none !important}
.live-zoom{display:block;width:100%;height:100%;padding:0;border:0;background:none;cursor:zoom-in}
.live-zoom:has(img[hidden]){display:none}
.live-zoom:hover img{transform:scale(1.03)}
.live-zoom:focus-visible{outline:2px solid var(--pink);outline-offset:-2px}
.live-zoom.overlay{position:absolute;inset:0}
@media (prefers-reduced-motion:reduce){.live-screen img{transition:none}}
.live-zoomed-cast{width:100%;height:100%}
.live-zoomed-cast .ap-wrapper{width:100%;height:100%}
.live-theater [data-zoom-close]{margin-left:auto}
.live-theater{overflow:hidden}
.live-zoomed{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}
.live-zoomed img{display:block;max-width:100%;max-height:100%;border-radius:var(--r8);box-shadow:0 0 0 1px var(--line)}
.live-zoomed .live-empty{display:grid;place-items:center;width:min(100%,960px);aspect-ratio:16/10;border-radius:var(--r8);background:var(--black);color:var(--gray-50);font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em}
.live-zoomed [hidden]{display:none}
.head-meta{display:flex;align-items:center;gap:var(--s12)}
.verdict-body{margin-top:var(--s16)}
.summary{margin:0 0 var(--s16);text-wrap:pretty}
.check-group + .check-group{margin-top:var(--s16)}
.check-group > .mono-label{margin-bottom:var(--s4)}
.checks{list-style:none;margin:0;padding:0;display:grid;gap:var(--s4)}
.checks li{display:flex;align-items:flex-start;gap:var(--s8);padding:var(--s8);border-radius:var(--r8);background:var(--white);text-wrap:pretty}
.checks li.bad{background:var(--pink-10);box-shadow:inset 3px 0 0 var(--pink-70)}
.checks li.ok{background:none;padding-block:var(--s4)}
.checks .mark{flex:none;display:grid;place-items:center;width:16px;height:16px;margin-top:1px;border-radius:50%;font:10px/1 var(--mono)}
.checks .ok .mark{background:var(--pink);color:var(--black)}
.checks .bad .mark{background:var(--pink-70);color:var(--bg)}
.checks .warn .mark{box-shadow:inset 0 0 0 1px var(--line-strong);color:var(--dim)}
.summary code,.checks code{font-size:12px;padding:0 2px;border-radius:var(--r4);background:var(--bg-3);word-break:break-word}
.checks .bad code{background:var(--pink-20)}
.checks .info .mark{box-shadow:inset 0 0 0 1px var(--line-strong);color:var(--dim)}
.checks li.info{background:none;padding-block:var(--s4)}
.checks.goal{margin-bottom:var(--s12)}
.check-body{display:grid;gap:var(--s4);min-width:0}
.check-note,.check-source{font-size:12px;color:var(--dim)}
.check-details{margin:0;padding-left:var(--s16);font-size:12px;color:var(--dim);display:grid;gap:2px;list-style:disc}
.checks .check-details li{display:list-item;padding:0;border-radius:0;background:none;box-shadow:none}
.folds{margin-bottom:var(--s24)}
.folds > .box{margin-bottom:var(--s12)}
details.fold > summary{list-style:none;cursor:pointer;margin-bottom:0}
details.fold > summary::-webkit-details-marker{display:none}
details.fold > summary h2::before{content:"▸";display:inline-block;width:1em;color:var(--dim);transition:transform .15s}
details.fold[open] > summary h2::before{transform:rotate(90deg)}
details.fold[open] > summary{margin-bottom:var(--s12)}
.canvas-box .canvas img{max-height:480px}
.auto-note{margin:0 0 var(--s12);font-size:12px}
.std{margin-left:var(--s8);white-space:nowrap}
.run{display:none}
.run.active{display:block}
.box{background:var(--bg-2);border-radius:var(--r12);padding:var(--s16);margin-bottom:var(--s24)}
.box.err{background:var(--pink-10);color:var(--pink-70)}
.head{display:flex;justify-content:space-between;align-items:center;gap:var(--s12);margin-bottom:var(--s12)}
.result-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s16);margin-bottom:var(--s24)}
.result-row > .box{margin-bottom:0}
.canvas{display:grid;place-items:center;background:var(--bg);border-radius:var(--r8);padding:var(--s16)}
.canvas img{display:block;max-width:100%;height:auto;max-height:360px;object-fit:contain}
a.canvas[data-canvas]{cursor:zoom-in}
/* Full-screen canvas */
#canvas-view{overflow:hidden}
#canvas-badge{margin-left:auto}
#canvas-n8n[hidden]{display:none}
.canvas-stage{position:relative;flex:1;min-height:0;display:flex;overflow:auto;background:var(--white);border-radius:var(--r12);box-shadow:inset 0 0 0 1px var(--line);padding:var(--s24)}
.canvas-stage img{display:block;margin:auto;max-width:100%;max-height:100%}
.canvas-stage.zoomable img{cursor:zoom-in}
.canvas-stage.zoomed img{max-width:none;max-height:none;cursor:zoom-out}
.btn:disabled{opacity:.4;cursor:default;background:var(--bg-2)}
.btn,.tab{font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em;color:var(--black);background:var(--bg-2);border:0;box-shadow:inset 0 0 0 1px var(--line);border-radius:var(--full);padding:var(--s8) var(--s16);cursor:pointer;white-space:nowrap}
.btn:hover,.tab:hover{background:var(--white)}
.btn.accent,.tab.active{background:var(--pink);box-shadow:none}
.btn.accent:hover,.tab.active:hover{background:var(--pink-20)}
.btn.accent:active{background:var(--pink-30)}
.tabs{display:flex;flex-wrap:wrap;gap:var(--s4)}
/* Replay strip */
.reel{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--s16)}
.reel-card{display:flex;flex-direction:column;gap:var(--s8);min-width:0;padding:var(--s12);background:var(--white);border-radius:var(--r12);box-shadow:inset 0 0 0 1px var(--line)}
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
.theater-bar input{accent-color:var(--black)}
.theater-controls{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s16);margin-left:auto}
.speed{display:flex;align-items:center;gap:var(--s4)}
.speed .mono-label{margin-right:var(--s4)}
.speed button{font:10px/14px var(--mono);color:var(--dim);background:none;border:0;border-radius:var(--full);padding:var(--s4) var(--s8);cursor:pointer}
.speed button:hover{color:var(--text);background:var(--bg-2)}
.speed button[aria-pressed="true"]{color:var(--black);background:var(--bg-3)}
.replay-grid{display:grid;gap:var(--s16);width:100%;margin:0 auto;grid-template-columns:minmax(0,1fr);max-width:calc((100vh - 240px) * 1.6 + 24px)}
.replay-grid.all{grid-template-columns:repeat(var(--cols),var(--cell));justify-content:center;max-width:none}
.screen{margin:0;display:none;padding:var(--s12);background:var(--white);border-radius:var(--r12);box-shadow:inset 0 0 0 1px var(--line)}
.screen.shown{display:flex;flex-direction:column;gap:var(--s8)}
.screen:has(.badge.fail){background:var(--pink-10);box-shadow:inset 0 0 0 1px var(--pink-30)}
.screen-head{display:flex;align-items:center;gap:var(--s12);min-height:22px}
.screen-head .badge{margin-left:auto;padding-block:var(--s4)}
.screen-frame{aspect-ratio:16/10;overflow:hidden;border-radius:var(--r8);background:var(--black)}
.screen-frame video{display:block;width:100%;height:100%;object-fit:contain}
.player,.player .ap-wrapper{width:100%;height:100%}
.theater .fineprint{margin:0}
/* LLM steps */
.run-picker{margin-right:auto;max-width:320px;font:12px/16px var(--sans);color:var(--text);padding:var(--s4) var(--s12);border:0;border-radius:var(--full);background:var(--white);box-shadow:inset 0 0 0 1px var(--line);cursor:pointer}
.run-picker:hover{box-shadow:inset 0 0 0 1px var(--line-strong)}
.legend{display:flex;flex-wrap:wrap;gap:var(--s16);margin-bottom:var(--s12)}
.legend i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:var(--s4)}
.read{background:var(--gray-50)}
.write{background:var(--pink)}
.fresh{background:var(--black)}
.outp{background:var(--dim)}
.steps-layout{display:grid;grid-template-columns:minmax(240px,320px) minmax(0,1fr);gap:var(--s16);height:min(720px,calc(100vh - 96px))}
.step-list{display:flex;flex-direction:column;gap:var(--s4);overflow-y:auto;min-height:0;padding:2px}
.step{display:flex;flex-direction:column;gap:var(--s8);width:100%;padding:var(--s8) var(--s12);border:0;border-radius:var(--r8);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.step:hover{background:var(--bg)}
.step.active{background:var(--white);box-shadow:inset 4px 0 0 var(--pink),0 0 0 1px var(--line)}
.step-top{display:flex;align-items:flex-start;gap:var(--s8);width:100%}
.num{flex:none;display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 var(--s4);border-radius:var(--full);background:var(--bg-3);font:10px/14px var(--mono)}
.step.active .num{background:var(--pink)}
.step > .step-usage,.step > .mini{padding-left:calc(24px + var(--s8))}
.step-flag{display:inline-flex;align-items:center;gap:var(--s4);font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em;color:var(--pink-70)}
.step-flag::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--pink-70)}
.step-text{flex:1;min-width:0;padding-top:3px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}
code.step-text{font-size:12px;line-height:16px}
.step-top .mono-label{padding-top:5px}
.step-usage{display:flex;gap:var(--s8)}
.mini{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,1fr);gap:var(--s4);width:100%}
.bar{display:flex;height:6px;background:var(--bg-3);border-radius:var(--full);overflow:hidden}
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
.card.context{background:transparent;box-shadow:inset 0 0 0 1px var(--line)}
.card.context[open] > summary{margin-bottom:var(--s8)}
.card.context > .msg{max-height:420px;overflow:auto;font-size:12px;line-height:16px}
.card.context .card-head .dim{margin-left:auto}
/* Tools browser */
.tools-browser{display:flex;flex-direction:column;gap:var(--s16)}
.tools-bar{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s12);font-size:12px;line-height:16px}
.tools-filter{font:12px/16px var(--sans);padding:var(--s8) var(--s12);border:0;border-radius:var(--full);background:var(--white);box-shadow:inset 0 0 0 1px var(--line);min-width:200px}
.tools-filter:focus-visible{outline:2px solid var(--pink);outline-offset:1px}
.tool-groups{display:flex;flex-direction:column;gap:var(--s12);max-height:280px;overflow:auto;padding:2px}
.tool-group{display:flex;flex-direction:column;gap:var(--s4)}
.tool-group[hidden],.chip[hidden]{display:none}
.tool-group.empty .dim,.group-note{font-size:12px;line-height:16px}
.chip.runtime:not(.active){background:var(--white);border:1px dashed var(--pink-30);box-shadow:none;padding:calc(var(--s4) - 1px) calc(var(--s12) - 1px)}
.chips{display:flex;flex-wrap:wrap;gap:var(--s4)}
.chip{display:inline-flex;align-items:center;gap:var(--s4);font:12px/16px var(--mono);color:var(--dim);background:var(--white);border:0;box-shadow:inset 0 0 0 1px var(--line);border-radius:var(--full);padding:var(--s4) var(--s12);cursor:pointer}
.chip:hover{color:var(--text);box-shadow:inset 0 0 0 1px var(--line-strong)}
.chip.used{color:var(--text);background:var(--pink-10);box-shadow:inset 0 0 0 1px var(--pink-30)}
.chip.active{color:var(--black);background:var(--pink);box-shadow:none}
.chip .count{font-size:10px;color:var(--dim)}
.chip.active .count{color:var(--black)}
.fail-dot{width:6px;height:6px;border-radius:50%;background:var(--pink-70)}
.tool-detail{display:flex;flex-direction:column;gap:var(--s12);padding-top:var(--s16);border-top:1px solid var(--line)}
.tool-detail[hidden]{display:none}
.tool-detail-head{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s12)}
.tool-desc{font-size:12px;line-height:16px;color:var(--dim);max-height:200px;overflow:auto}
.params{margin:0;font-size:12px;line-height:16px;background:var(--white);border-radius:var(--r8);box-shadow:inset 0 0 0 1px var(--line)}
.params th{padding:var(--s8)}
.params td{padding:var(--s8);vertical-align:top;white-space:normal;font-family:var(--sans)}
.params td:first-child{white-space:nowrap}
.params code{font-size:12px}
.params .type{color:var(--dim);word-break:break-word}
.params .req{margin-left:var(--s8);font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em;color:var(--pink-70)}
.params .limits{margin-top:var(--s4);font:10px/14px var(--mono);color:var(--dim);word-break:break-all}
.tool-name{font-size:14px;line-height:18px}
.note{color:var(--dim);margin-bottom:var(--s4)}
.card details summary{cursor:pointer;color:var(--dim);margin-top:var(--s8);font:10px/14px var(--mono);text-transform:uppercase;letter-spacing:.02em}
.card pre{background:var(--white);border-radius:var(--r4);box-shadow:inset 0 0 0 1px var(--line);padding:var(--s12);margin:var(--s8) 0 0;overflow:auto;max-height:320px;font-size:12px;line-height:16px;white-space:pre-wrap;word-break:break-word}
</style>{{HEAD}}</head><body>
<header class="page-head"><div class="brand-row"><img src="brand/n8n-logo-black-accent.svg" alt="n8n" onerror="this.remove()">
<span class="mono-label">{{KICKER}}</span></div><h1>{{TITLE}}</h1>{{META}}</header>
{{CASE}}
{{REPLAY}}
<table><thead>{{THEAD}}</thead>
<tbody>{{ROWS}}</tbody></table>
{{NOTES}}
{{AFTER_TABLE}}
{{PANELS}}
<div class="theater" id="canvas-view" role="dialog" aria-modal="true" aria-label="Canvas" hidden>
<div class="theater-bar"><h2>Canvas</h2><div class="tabs" id="canvas-tabs"></div><span id="canvas-badge"></span>
<a id="canvas-n8n" target="_blank">Open in n8n ↗</a>
<button type="button" class="btn" id="canvas-zoom">Zoom in</button>
<button type="button" class="btn" id="canvas-close">Close</button></div>
<div class="canvas-stage" id="canvas-stage"><img id="canvas-img" alt=""></div>
<p class="fineprint">Pick a run, or press the left and right arrow keys. Click the canvas to zoom in where you click. Press Esc to close.</p></div>
{{SCRIPTS}}
<script>
const $ = (id) => document.getElementById(id);
// file:// pages can block the clipboard. Then the text is selected, so Cmd+C copies it.
document.addEventListener('click', async e=>{
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  e.preventDefault();
  const el = $(b.dataset.copy);
  try { await navigator.clipboard.writeText(el.textContent); b.textContent = 'Copied'; }
  catch { getSelection().selectAllChildren(el); b.textContent = 'Selected'; }
  setTimeout(()=>{ b.textContent = 'Copy'; }, 1500);
});
document.addEventListener('click', e=>{
  const b = e.target.closest('[data-expand-all]');
  if (!b) return;
  e.preventDefault();
  const card = b.closest('.brief-card');
  const groups = card.querySelectorAll('details.criteria-group');
  const open = [...groups].some(d=>!d.open);
  card.open = true;
  groups.forEach(d=>{ d.open = open; });
});
document.addEventListener('toggle', e=>{
  const card = e.target.closest?.('.brief-card');
  const b = card?.querySelector('[data-expand-all]');
  if (b) b.textContent = [...card.querySelectorAll('details.criteria-group')].every(d=>d.open) ? 'Collapse all' : 'Expand all';
}, true);
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
// Delegated, so the steps keep working when the live page replaces them.
document.addEventListener('click', e=>{
  const b = e.target.closest('.steps .step');
  if (b) selectStep(b.closest('.steps'), b.dataset.step);
});
document.addEventListener('keydown', e=>{
  const list = e.target.closest ? e.target.closest('.step-list') : null;
  if (!list || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
  e.preventDefault();
  const root = list.closest('.steps');
  const items = [...root.querySelectorAll('.step')];
  const i = items.findIndex(b=>b.classList.contains('active')) + (e.key === 'ArrowDown' ? 1 : -1);
  if (items[i]) selectStep(root, items[i].dataset.step, true);
});

// Run picker in the LLM steps header. The live page calls it again after it replaces a panel.
function addRunPickers(){
  const rows = [...document.querySelectorAll('.row[data-run]')];
  if (rows.length < 2) return;
  document.querySelectorAll('.run .steps > .head').forEach(head=>{
    if (head.querySelector('.run-picker')) return;
    const run = head.closest('.run').id;
    const select = Object.assign(document.createElement('select'), {className: 'run-picker'});
    select.setAttribute('aria-label', 'Run');
    for (const r of rows) {
      const title = r.querySelector('.run-name')?.textContent || r.dataset.run;
      select.add(new Option(title, r.dataset.run, false, r.dataset.run === run));
    }
    head.querySelector('h2').after(select);
  });
}
// The picker is in the summary of the LLM steps box. A click on it must not open or close the box.
document.addEventListener('click', e=>{
  if (e.target.closest && e.target.closest('summary .run-picker')) e.preventDefault();
});
// The new run's steps open at the same place on the screen as the old run's steps, open or closed like them.
document.addEventListener('change', e=>{
  if (!e.target.matches || !e.target.matches('.run-picker')) return;
  const select = e.target, old = select.closest('.steps'), top = old.getBoundingClientRect().top;
  show(select.value);
  const next = document.getElementById(select.value)?.querySelector('.steps');
  if (next) next.open = old.open;
  if (next) window.scrollBy(0, next.getBoundingClientRect().top - top);
  select.value = select.closest('.run').id;
  next?.querySelector('.run-picker')?.focus({preventScroll: true});
});
addRunPickers();

// Tools browser: a chip selects a tool, the filter hides chips. Delegated, like the steps.
document.addEventListener('click', e=>{
  const chip = e.target.closest('.tools-browser .chip');
  if (!chip) return;
  const root = chip.closest('.tools-browser');
  root.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active', c === chip));
  root.querySelectorAll('.tool-detail').forEach(d=>{ d.hidden = d.dataset.tool !== chip.dataset.tool; });
});
document.addEventListener('input', e=>{
  if (!e.target.matches || !e.target.matches('.tools-filter')) return;
  const root = e.target.closest('.tools-browser');
  const q = e.target.value.trim().toLowerCase();
  root.querySelectorAll('.chip').forEach(c=>{ c.hidden = !!q && !c.dataset.search.includes(q); });
  root.querySelectorAll('.tool-group').forEach(g=>{ g.hidden = !!q && !g.querySelector('.chip:not([hidden])'); });
});

// Canvas: full screen, with a tab for each run that has a canvas.
// The runs come from the page on each open, so the live page works when it replaces the panels.
let canvasRun = null;
function canvasLinks(){
  const seen = new Set();
  return [...document.querySelectorAll('a.canvas[data-canvas]')]
    .filter(a=>!seen.has(a.dataset.canvas) && seen.add(a.dataset.canvas));
}
function updateCanvasZoom(){
  const img = $('canvas-img'), stage = $('canvas-stage'), btn = $('canvas-zoom');
  const zoomed = stage.classList.contains('zoomed');
  const zoomable = zoomed || (img.complete && img.naturalWidth > img.clientWidth + 1);
  stage.classList.toggle('zoomable', zoomable);
  btn.disabled = !zoomable;
  btn.textContent = zoomed ? 'Fit to screen' : 'Zoom in';
}
// x and y are the clicked point as a fraction of the image. The zoom keeps that point in the middle.
function zoomCanvas(on, x = 0.5, y = 0.5){
  const img = $('canvas-img'), stage = $('canvas-stage');
  if (on && !stage.classList.contains('zoomable')) return;
  stage.classList.toggle('zoomed', on);
  if (on) {
    stage.scrollLeft = img.offsetLeft + x * img.offsetWidth - stage.clientWidth / 2;
    stage.scrollTop = img.offsetTop + y * img.offsetHeight - stage.clientHeight / 2;
  }
  updateCanvasZoom();
}
function showCanvas(name){
  const a = canvasLinks().find(x=>x.dataset.canvas === name);
  if (!a) return;
  canvasRun = name;
  document.querySelectorAll('#canvas-tabs .tab').forEach(t=>t.classList.toggle('active', t.dataset.canvasTab === name));
  const badge = document.querySelector(`.row[data-run="${name}"] .badge`);
  $('canvas-badge').replaceChildren(...(badge ? [badge.cloneNode(true)] : []));
  const link = $('canvas-n8n');
  link.hidden = !a.dataset.n8n;
  link.href = a.dataset.n8n || '#';
  const img = $('canvas-img');
  $('canvas-stage').classList.remove('zoomed');
  img.onload = updateCanvasZoom;
  img.alt = `${a.dataset.title} canvas`;
  img.src = a.getAttribute('href');
  updateCanvasZoom();
  if (document.getElementById(name)) show(name);
}
function openCanvas(name){
  $('canvas-tabs').replaceChildren(...canvasLinks().map(a=>{
    const tab = Object.assign(document.createElement('button'), {type: 'button', className: 'tab', textContent: a.dataset.title});
    tab.dataset.canvasTab = a.dataset.canvas;
    return tab;
  }));
  pauseInline();
  $('canvas-view').hidden = false;
  document.body.classList.add('theater-open');
  showCanvas(name);
  $('canvas-close').focus();
}
function closeCanvas(){
  $('canvas-view').hidden = true;
  document.body.classList.remove('theater-open');
  canvasRun = null;
}
document.addEventListener('click', e=>{
  const a = e.target.closest('a.canvas[data-canvas]');
  if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  openCanvas(a.dataset.canvas);
});
$('canvas-tabs').addEventListener('click', e=>{
  const tab = e.target.closest('[data-canvas-tab]');
  if (tab) showCanvas(tab.dataset.canvasTab);
});
$('canvas-zoom').addEventListener('click', ()=>zoomCanvas(!$('canvas-stage').classList.contains('zoomed')));
$('canvas-img').addEventListener('click', e=>{
  const r = e.target.getBoundingClientRect();
  zoomCanvas(!$('canvas-stage').classList.contains('zoomed'), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
});
$('canvas-close').addEventListener('click', closeCanvas);
document.addEventListener('keydown', e=>{
  if ($('canvas-view').hidden) return;
  if (e.key === 'Escape') { closeCanvas(); return; }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  const names = canvasLinks().map(a=>a.dataset.canvas);
  const i = names.indexOf(canvasRun) + (e.key === 'ArrowRight' ? 1 : -1);
  showCanvas(names[(i + names.length) % names.length]);
});
window.addEventListener('resize', ()=>{ if (!$('canvas-view').hidden) updateCanvasZoom(); });

// Replay
let replayMode = null;
const players = {};
function npt(seconds){
  const s = Math.max(0, Math.ceil(seconds));
  return `npt:${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
let speed = 1;
// Play all turns into Pause all, and turns back when every shown screen has ended.
let ended = new Set();
function setPlayingAll(on){
  $('play-all').textContent = on ? 'Pause all' : 'Play all';
  $('play-all').dataset.playing = on ? '1' : '';
}
function screenEnded(name){
  ended.add(name);
  if (ended.size >= document.querySelectorAll('.screen.shown').length) setPlayingAll(false);
}
function mountCast(s, el){
  if (players[s.name]) players[s.name].dispose();
  players[s.name] = AsciinemaPlayer.create({data: window.CASTS[s.name]}, el, {
    speed, idleTimeLimit: $('skip-idle').checked ? 2 : undefined, fit: 'both', poster: 'npt:0:8',
  });
  players[s.name].addEventListener('ended', ()=>screenEnded(s.name));
}
function disposePlayers(){
  for (const name of Object.keys(players)) { players[name].dispose(); delete players[name]; }
}
// Side by side uses the column count that gives the largest screens in the window.
function layoutGrid(){
  const grid = $('replay-grid');
  if (replayMode !== 'all') { grid.style.removeProperty('--cell'); grid.style.removeProperty('--cols'); return; }
  const gap = 16, pad = 24, head = 30, aspect = 1.6;
  const width = grid.parentElement.clientWidth - 80;
  const height = window.innerHeight - grid.getBoundingClientRect().top - 72;
  let best = {cols: 1, cell: 0};
  for (let cols = 1; cols <= SCREENS.length; cols++) {
    const rows = Math.ceil(SCREENS.length / cols);
    const byHeight = ((height - gap * (rows - 1)) / rows - pad - head) * aspect + pad;
    const cell = Math.min((width - gap * (cols - 1)) / cols, byHeight);
    if (cell > best.cell) best = {cols, cell};
  }
  grid.style.setProperty('--cols', best.cols);
  grid.style.setProperty('--cell', `${Math.floor(best.cell)}px`);
}
function showReplay(mode){
  replayMode = mode;
  ended = new Set();
  setPlayingAll(false);
  const grid = $('replay-grid');
  grid.classList.toggle('all', mode === 'all');
  layoutGrid();
  document.querySelectorAll('[data-replay]').forEach(b=>b.classList.toggle('active', b.dataset.replay === mode));
  $('play-all').style.display = $('restart-all').style.display = mode === 'all' ? '' : 'none';
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
      video.playbackRate = speed;
      video.onended = ()=>screenEnded(s.name);
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
  // The terminal player has no speed setting after it starts, so a new speed starts the recordings again.
  $('speed').addEventListener('click', e=>{
    const b = e.target.closest('[data-speed]');
    if (!b) return;
    speed = Number(b.dataset.speed);
    $('speed').querySelectorAll('[data-speed]').forEach(x=>x.setAttribute('aria-pressed', String(x === b)));
    showReplay(replayMode);
  });
  $('skip-idle').addEventListener('change', ()=>showReplay(replayMode));
  $('theater-close').addEventListener('click', closeTheater);
  document.addEventListener('keydown', e=>{ if (e.key === 'Escape' && !$('theater').hidden) closeTheater(); });
  let resizeTimer;
  window.addEventListener('resize', ()=>{
    if (replayMode !== 'all') return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=>showReplay('all'), 200);
  });
  const playAll = (on)=>{
    if (on) ended = new Set();
    Object.values(players).forEach(p=>on ? p.play() : p.pause());
    document.querySelectorAll('.screen.shown video').forEach(v=>on ? v.play() : v.pause());
    setPlayingAll(on);
  };
  $('play-all').addEventListener('click', ()=>playAll(!$('play-all').dataset.playing));
  $('restart-all').addEventListener('click', ()=>{
    showReplay(replayMode);
    document.querySelectorAll('.screen.shown video').forEach(v=>{ v.currentTime = 0; });
    playAll(true);
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
