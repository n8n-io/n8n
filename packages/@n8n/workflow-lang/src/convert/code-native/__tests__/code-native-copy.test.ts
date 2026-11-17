/**
 * The copy of the input items of a native Code node (`codeClone`). The node reads the list
 * without a copy only when the code provably changes nothing and the list is plain JSON
 * from a parse. The results must stay those of n8n's Code node, which always gets copies.
 */
import { describe, expect, it } from 'vitest';

import { hostRunners } from '../../__tests__/behaviour/compare.ts';
import { allItemsCode, eachItemCode } from '../../code-node.ts';
import { convertWorkflow } from '../../index.ts';
import { runReference, useUtc } from '../../../reference/runner.ts';
import { runModule } from '../../../testing/vm.ts';
import { checkTranslation } from '../check.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';

useUtc();

function translated(code: string, mode: CodeMode) {
	const t = translateCode({ code, mode, kind: 'code', hasNode: () => false, timezone: 'system' });
	if (!t.ok) throw new Error(`blocked: ${t.blockers.map((b) => b.feature).join(', ')}`);
	return t.translation;
}

function native(code: string, mode: CodeMode, input: unknown[], plainInput: boolean): unknown {
	const c = checkTranslation(translated(code, mode), mode, plainInput);
	if (!c.ok) throw new Error(`does not compile: ${c.blockers.map((b) => b.message).join('; ')}`);
	if (!c.compiled.data) throw new Error('no module');
	expect(c.source.slice(0, c.source.indexOf('\ttry {')).includes(COPIED)).toBe(!plainInput);
	const out = runModule(c.compiled.data, {
		trigger: { body: { input, nodes: [] } },
		now: 1_700_000_000_000,
		seed: 1,
		effects: {},
	});
	return out.status === 'ok' ? out.result : 'failed';
}

function host(code: string, mode: CodeMode, input: unknown[]): unknown {
	const body = mode === 'each' ? eachItemCode(code, false, false) : allItemsCode(code, false);
	try {
		return hostRunners().code({ name: 'code', code: body, items: input });
	} catch {
		return 'failed';
	}
}

/** The first statement of a native Code node that copies its input list. */
const COPIED = 'let __wf_items: Json[] = codeClone(__wf_in)';

const rows = [
	{ id: 2, name: 'Grace', tags: ['x', 'y'], address: { city: 'Paris', zip: null } },
	{ id: 1, name: 'Ada', tags: [], address: { city: 'London' }, $binary: { f: { data: 'aGk=' } } },
	{ id: 3, name: 'Edsger', tags: ['z'], address: null },
];

/** Code that changes no input object: [name, mode, code]. */
const readers: Array<[string, CodeMode, string]> = [
	[
		'a map with a spread',
		'all',
		'return items.map((i) => ({ json: { ...i.json, n: i.json.id * 2 } }));',
	],
	['the items as they are', 'all', 'return items;'],
	['$input.all() as it is', 'all', 'return $input.all();'],
	[
		'a sort of the item list',
		'all',
		'items.sort((a, b) => a.json.id - b.json.id); items.push({ json: { id: 9 } }); return items.reverse();',
	],
	[
		'a sort of $input.all() in a variable',
		'all',
		'const all = $input.all(); all.sort((a, b) => a.json.id - b.json.id); all[0] = { json: { first: all[0].json } }; return all;',
	],
	[
		'a list and an object that the code makes',
		'all',
		`const out = []; const byId = {}; let n = 0;
for (const i of items) { out.push({ json: { name: i.json.name, where: i.json.address } }); byId[i.json.id] = i.json; n++; }
out.sort((a, b) => a.json.name < b.json.name ? -1 : 1); delete byId[3]; out.length = 2;
return [...out, { json: { byId, n, keys: Object.keys(byId).sort() } }];`,
	],
	[
		'a change of a shallow copy',
		'all',
		'return items.map((i) => { const j = { ...i.json }; j.id += 1; delete j.name; j.extra = i.json.tags; return { json: j }; });',
	],
	[
		'a change of new lists',
		'all',
		`const names = items.map((i) => i.json.name); names.sort(); names.unshift('first');
const tags = items.filter((i) => i.json.tags.length > 0).map((i) => i.json.tags); tags.reverse(); tags[0] = 'own';
return [{ json: { names, tags, has: Object.prototype.hasOwnProperty.call(items[0].json, 'id'), merged: Object.assign({}, items[0].json, { id: 0 }) } }];`,
	],
	[
		'the item in each mode',
		'each',
		'return { json: { ...$json, name: $json.name.toUpperCase(), same: item.json.address } };',
	],
	['the item as it is in each mode', 'each', 'return item;'],
];

/** Code that changes an input object, or that the proof cannot follow: [name, mode, code]. */
const writers: Array<[string, CodeMode, string]> = [
	['an assignment to a field', 'all', 'for (const i of items) i.json.seen = true; return items;'],
	['an assignment to a nested field', 'all', 'items[0].json.address.city = "Rome"; return items;'],
	['an update of a field', 'all', 'items[0].json.id++; return items;'],
	['a delete', 'all', 'delete items[0].json.name; return items;'],
	['a push to a list of an item', 'all', 'items[0].json.tags.push("new"); return items;'],
	['a sort of a list of an item', 'all', 'return [{ json: { t: items[0].json.tags.sort() } }];'],
	[
		'a change through a variable',
		'all',
		'const first = items[0].json; first.name = "x"; return items;',
	],
	[
		'a change through a parameter',
		'all',
		'const mark = (o) => { o.marked = 1; }; items.forEach((i) => mark(i.json)); return items;',
	],
	[
		'a change through a list that the code makes',
		'all',
		'const all = items.map((i) => i.json); all[0].name = "x"; return items;',
	],
	[
		'a change through an object that the code makes',
		'all',
		'const o = { first: items[0].json }; o.first.name = "x"; return items;',
	],
	[
		'a variable that later holds an input object',
		'all',
		'let o = {}; o = items[0].json; o.name = "x"; return items;',
	],
	[
		'Object.assign into an input object',
		'all',
		'Object.assign(items[0].json, { name: "x" }); return items;',
	],
	['a destructuring assignment', 'all', 'let a; [a, items[0].json.name] = [1, "x"]; return items;'],
	[
		'a destructured variable',
		'all',
		'const [first] = items.map((i) => i.json); first.name = "x"; return items;',
	],
	['a splice of a list of an item', 'all', 'items[0].json.tags.splice(0, 1); return items;'],
	['a logical assignment', 'all', 'items[0].json.address ||= {}; return items;'],
	[
		'a loop variable that is a field',
		'all',
		'for (items[0].json.name of ["a", "b"]) {} return items;',
	],
	[
		'a conditional copy',
		'all',
		'const o = items.length > 5 ? {} : items[0].json; o.name = "x"; return items;',
	],
	['the item in each mode', 'each', 'item.json.name = item.json.name.toUpperCase(); return item;'],
	['$json in each mode', 'each', '$json.count = 1; return { json: $json };'],
];

describe('the proof that code changes no input', () => {
	it.each(readers)('proves %s', (_, mode, code) => {
		expect(translated(code, mode).readOnly).toBe(true);
	});

	it.each(writers)('does not prove %s', (_, mode, code) => {
		expect(translated(code, mode).readOnly).toBe(false);
	});

	it.each([
		['call', 'return [{ json: { n: [].slice.call(items).length } }];'],
		[
			'a computed method name',
			'const m = "push"; const xs = [1]; xs[m](2); return [{ json: { xs } }];',
		],
		[
			'a method as a value',
			'const xs = [1]; const add = xs.push; return [{ json: { n: typeof add } }];',
		],
		[
			'a this argument',
			'const seen = []; items.forEach(function (i) { seen.length; }, items[0].json); return items;',
		],
		['Object as a value', 'const O = Object; return [{ json: { k: O.keys(items[0].json) } }];'],
		['another function of Object', 'Object.freeze(items[0].json); return items;'],
		['this', 'function f() { return this; } return [{ json: { t: typeof f() } }];'],
	])('does not prove code with %s, whether or not it runs natively', (_, code) => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		const partial = t.ok ? t.translation : t.partial;
		expect(partial?.readOnly ?? false).toBe(false);
	});
});

describe('a native Code node without a copy of its input', () => {
	it.each(readers)('gives the result of the fallback host for %s', (_, mode, code) => {
		const expected = host(code, mode, rows);
		expect(expected).not.toBe('failed');
		expect(native(code, mode, rows, false)).toEqual(expected);
		expect(native(code, mode, rows, true)).toEqual(expected);
	});

	const hook = {
		name: 'Hook',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 2,
		position: [0, 0],
		parameters: { path: 'a' },
	};
	const code = (name: string, jsCode: string, parameters: Record<string, unknown> = {}) => ({
		name,
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		position: [200, 0],
		parameters: { jsCode, ...parameters },
	});
	const chain = (names: string[]) =>
		Object.fromEntries(
			names
				.slice(0, -1)
				.map((n, k) => [n, { main: [[{ node: names[k + 1], type: 'main', index: 0 }]] }]),
		);
	/** The lines of the native Code node `name` in the generated source. */
	/** The lines of the native Code node `name` before its code: the values that the code reads. */
	const blockOf = (source: string, name: string): string => {
		const from = source.indexOf(`// ${name} (code)`);
		const to = source.indexOf('\ttry {', from);
		return source.slice(from, to);
	};
	const run = async (wf: Record<string, unknown>, body: unknown) => {
		const out = convertWorkflow(wf, { trace: 'all' });
		expect(out.ok).toBe(true);
		expect(out.fallbackNodes).toEqual([]);
		const ran = await runReference(out.source, {
			trigger: { body },
			now: 0,
			seed: 1,
			effects: {},
			trace: true,
		});
		const items = (name: string) => (ran.trace ?? []).find((t) => t.step === name)?.items;
		return { source: out.source, items };
	};

	it('reads the result of a native Code node without a copy, and later changes do not reach it', async () => {
		const wf = {
			name: 'Shared',
			nodes: [
				hook,
				code(
					'Make',
					'return [{ json: { id: 1, tags: ["a"], at: { n: 1 } } }, { json: { id: 2, tags: [], at: { n: 2 } } }];',
				),
				// Reads only: its result has the objects of the result of Make.
				code('Pass', 'return items.filter((i) => i.json.id > 0);'),
				// Changes its input: it gets copies.
				code(
					'Change',
					'for (const i of items) { i.json.id += 10; i.json.tags.push("changed"); i.json.at.n = 0; } return items;',
				),
				code(
					'Report',
					"return [{ json: { make: $('Make').all().map((i) => i.json), pass: $('Pass').all().map((i) => i.json), change: $input.all().map((i) => i.json) } }];",
				),
			],
			connections: chain(['Hook', 'Make', 'Pass', 'Change', 'Report']),
		};
		const { source, items } = await run(wf, {});
		expect(blockOf(source, 'Pass')).not.toContain(COPIED);
		expect(blockOf(source, 'Change')).toContain(COPIED);
		const made = [
			{ id: 1, tags: ['a'], at: { n: 1 } },
			{ id: 2, tags: [], at: { n: 2 } },
		];
		const changed = [
			{ id: 11, tags: ['a', 'changed'], at: { n: 0 } },
			{ id: 12, tags: ['changed'], at: { n: 0 } },
		];
		expect(items('Make')).toEqual(made);
		expect(items('Pass')).toEqual(made);
		expect(items('Change')).toEqual(changed);
		expect(items('Report')).toEqual([{ make: made, pass: made, change: changed }]);
	});

	it('keeps the copy for a list that is not the result of a parse', async () => {
		const wf = {
			name: 'Trigger first',
			nodes: [
				hook,
				// The trigger item of this run has places without a value: JSON has no such places.
				code('Read', 'return items.map((i) => ({ json: { keys: Object.keys(i.json).sort() } }));'),
				code('Again', 'return items.map((i) => ({ json: { ...i.json, again: true } }));'),
			],
			connections: chain(['Hook', 'Read', 'Again']),
		};
		const { source, items } = await run(wf, { n: 1 });
		expect(blockOf(source, 'Read')).toContain(COPIED);
		expect(blockOf(source, 'Again')).not.toContain(COPIED);
		expect(items('Read')).toEqual([{ keys: ['body', 'params'] }]);
		expect(items('Again')).toEqual([{ keys: ['body', 'params'], again: true }]);
	});

	it.each([
		['without an error setting', {}, false],
		['with an error setting that continues', { onError: 'continueRegularOutput' }, true],
	])('reads the result of a host step %s, also through an If node', (_, setting, copies) => {
		const reader = 'return items.map((i) => ({ json: { ...i.json, read: true } }));';
		const wf = {
			name: 'Host first',
			nodes: [
				hook,
				{
					...code('Python', '', { language: 'python', pythonCode: 'return _items' }),
					...setting,
				},
				code('Direct', reader),
				{
					name: 'If',
					type: 'n8n-nodes-base.if',
					typeVersion: 2,
					position: [400, 0],
					parameters: {
						conditions: {
							options: { caseSensitive: true, typeValidation: 'strict' },
							combinator: 'and',
							conditions: [
								{
									leftValue: '={{ $json.read }}',
									rightValue: '',
									operator: { type: 'boolean', operation: 'true', singleValue: true },
								},
							],
						},
						options: {},
					},
				},
				code('After If', reader),
				code('Writer', 'items[0].json.read = false; return items;'),
			],
			connections: {
				Hook: { main: [[{ node: 'Python', type: 'main', index: 0 }]] },
				Python: {
					main: [
						[
							{ node: 'Direct', type: 'main', index: 0 },
							{ node: 'If', type: 'main', index: 0 },
						],
					],
				},
				If: { main: [[{ node: 'After If', type: 'main', index: 0 }]] },
				'After If': { main: [[{ node: 'Writer', type: 'main', index: 0 }]] },
			},
		};
		const out = convertWorkflow(wf);
		expect(out.ok).toBe(true);
		expect(out.fallbackNodes).toEqual(['Python']);
		expect(blockOf(out.source, 'Direct').includes(COPIED)).toBe(copies);
		expect(blockOf(out.source, 'After If').includes(COPIED)).toBe(copies);
		expect(blockOf(out.source, 'Writer')).toContain(COPIED);
	});

	it('keeps the copy of the items of other nodes', async () => {
		const wf = {
			name: 'Other nodes',
			nodes: [
				hook,
				code('Make', 'return [{ json: { id: 1, list: [1] } }];'),
				code(
					'Same',
					"return [{ json: { same: $('Make').first().json === $input.first().json, list: $('Make').first().json.list } }];",
				),
			],
			connections: chain(['Hook', 'Make', 'Same']),
		};
		const { source, items } = await run(wf, {});
		expect(blockOf(source, 'Same')).toContain('codeClone(__wf_r0)');
		expect(blockOf(source, 'Same')).not.toContain(COPIED);
		// As v1: the items of another node are other objects than the input items.
		expect(items('Same')).toEqual([{ same: false, list: [1] }]);
	});
});
