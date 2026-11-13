import { describe, expect, it } from 'vitest';

import { allItemsCode, eachItemCode } from '../../code-node.ts';
import { convertWorkflow } from '../../index.ts';
import { hostRunners } from '../../__tests__/behaviour/compare.ts';
import { connect, node, webhookNode } from '../../__tests__/workflows.ts';
import { useUtc } from '../../../reference/runner.ts';
import { runModule } from '../../../testing/vm.ts';

// Workflows run in UTC (spec 4.5); the host process does too in these tests.
useUtc();
import { checkTranslation } from '../check.ts';
import { checkRegex } from '../regex-syntax.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';

const NOW = 1_700_000_000_000;

type Outcome = { ok: true; value: unknown } | { ok: false; error: string };

function native(
	code: string,
	mode: CodeMode,
	input: unknown[],
	nodes: Record<string, unknown[]> = {},
): Outcome {
	const names = Object.keys(nodes);
	// The host runs Luxon in the zone of the process (UTC), without a workflow zone.
	const t = translateCode({
		code,
		mode,
		kind: 'code',
		hasNode: (n) => names.includes(n),
		timezone: 'system',
	});
	if (!t.ok) throw new Error(`blocked: ${t.blockers.map((b) => b.feature).join(', ')}`);
	const c = checkTranslation(t.translation, mode);
	if (!c.ok) throw new Error(`does not compile: ${c.blockers.map((b) => b.message).join('; ')}`);
	if (!c.compiled.data) throw new Error('no module');
	const lists = t.translation.nodes.map((n) => nodes[n]);
	const out = runModule(c.compiled.data, {
		trigger: { body: { input, nodes: lists } },
		now: NOW,
		seed: 1,
		effects: {},
	});
	if (out.status === 'ok') return { ok: true, value: out.result };
	const r = out.result;
	return {
		ok: false,
		error: typeof r === 'object' && r !== null ? String(Reflect.get(r, 'message')) : String(r),
	};
}

function host(
	code: string,
	mode: CodeMode,
	input: unknown[],
	nodes: Record<string, unknown[]> = {},
): Outcome {
	const refs = Object.keys(nodes).length > 0;
	const body = mode === 'each' ? eachItemCode(code, refs, false) : allItemsCode(code, refs);
	try {
		const value = hostRunners().code({
			name: 'code',
			code: body,
			items: refs ? [...input, { $nodes: nodes }] : input,
		});
		return { ok: true, value };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

const items = [
	{
		name: 'Ada Lovelace',
		email: 'ADA@Example.com',
		amount: '12.5',
		tags: 'a, b,c',
		when: '2024-03-07T10:00:00Z',
	},
	{
		name: 'Grace Hopper',
		email: 'grace@example.org',
		amount: 7,
		tags: '',
		when: '2023-12-31T23:59:59Z',
	},
];

/** Hand-written code in the shapes that the analysis found most often. */
const cases: Array<[string, CodeMode, string]> = [
	[
		'map over $input.all()',
		'all',
		'return $input.all().map(i => ({ json: { ...i.json, total: Number(i.json.amount) * 2 } }));',
	],
	[
		'items and a plain object result',
		'all',
		'const out = []; for (const item of items) out.push({ first: item.json.name.split(" ")[0] }); return out;',
	],
	[
		'each item with $json',
		'each',
		'return { json: { lower: $json.email.toLowerCase(), idx: $itemIndex } };',
	],
	['each item that changes the item', 'each', '$input.item.json.seen = true; return $input.item;'],
	[
		'var, loose equality and for...in',
		'all',
		'var n = 0; for (var k in items[0].json) { if (items[0].json[k] == 12.5) n++; } return [{ json: { n: n } }];',
	],
	[
		'regular expressions',
		'all',
		'return items.map(i => ({ json: { user: i.json.email.match(/^([^@]+)@/)[1].toLowerCase(), tags: i.json.tags.split(/\\s*,\\s*/).filter(Boolean), dot: /\\.com$/i.test(i.json.email), clean: i.json.name.replace(/[aeiou]/g, (v) => v.toUpperCase()) } }));',
	],
	[
		'dates',
		'all',
		'const d = new Date(items[0].json.when); const days = Math.round((d - new Date(items[1].json.when)) / 86400000); return [{ json: { iso: d.toISOString(), days } }];',
	],
	[
		'helpers for missing library functions',
		'all',
		'const o = Object.fromEntries(items.map(i => [i.json.name, String(i.json.amount)])); return [{ json: { o, max: Math.max(...[3, 9, 4]), enc: encodeURIComponent("a b&c"), arr: Array.from({ length: 3 }, (_, k) => k), last: "a-b-c".lastIndexOf("-") } }];',
	],
	[
		'try/catch and throw',
		'all',
		'try { JSON.parse("{bad"); } catch (e) { return [{ json: { failed: true } }]; } return [];',
	],
	['an error stops the step', 'all', 'throw new Error("stop here");'],
	['a result that is not a list of objects', 'all', 'return [1, 2];'],
	[
		'undefined and NaN values in the result',
		'all',
		'return [{ json: { a: undefined, b: NaN, c: [undefined] } }];',
	],
	[
		'hoisted function declarations',
		'all',
		'return items.map(i => ({ json: { s: slug(i.json.name) } }));\nfunction slug(s) { return clean(s).replace(/ /g, "-"); }\nfunction clean(s) { return s.trim().toLowerCase(); }',
	],
	[
		'for...of over a string',
		'all',
		'const out = []; for (const c of "a😀b") out.push({ c }); return out;',
	],
	['map on an object fails as in JavaScript', 'all', 'const o = { a: 1 }; return o.map(x => x);'],
	[
		'Set and Map',
		'all',
		'const seen = new Set(); const m = new Map(); for (const i of items) { seen.add(i.json.tags); m.set(i.json.name, (m.get(i.json.name) || 0) + 1); } m.delete("x"); return [{ json: { n: seen.size, u: [...new Set([1, "1", 1, NaN, NaN])], m: Object.fromEntries(m), keys: [...m.keys()], s: JSON.stringify({ seen }), has: seen.has("") } }];',
	],
	[
		'Date methods on untyped values',
		'all',
		'const ds = items.map(i => new Date(i.json.when)); return [{ json: { y: ds[0].getUTCFullYear(), t: ds[1].getTime(), iso: ds[0].toISOString() } }];',
	],
	[
		'hasOwnProperty',
		'all',
		'const o = items[0].json; return [{ json: { a: o.hasOwnProperty("name"), b: o.hasOwnProperty("zzz") } }];',
	],
];

describe('native Code nodes', () => {
	it.each(cases)('%s: same result as the fallback host', (_, mode, code) => {
		const h = host(code, mode, items);
		const n = native(code, mode, items);
		expect(n.ok).toBe(h.ok);
		if (h.ok && n.ok) expect(JSON.stringify(n.value)).toBe(JSON.stringify(h.value));
	});

	it('converts Buffer text as Node.js does', () => {
		// Seeded inputs: text with surrogates, random base64 (also invalid), hex and byte arrays.
		let seed = 7;
		const rand = (n: number) => {
			seed = (seed * 1103515245 + 12345) % 2147483648;
			return seed % n;
		};
		const pick = (s: string) => s.charAt(rand(s.length));
		const cases: Array<Record<string, unknown>> = [];
		for (let k = 0; k < 150; k++) {
			let t = '';
			for (let j = rand(12); j > 0; j--) t += pick('aZ09+/=-_ é😀\ud800\n%');
			let bytes = '';
			for (let j = rand(10); j > 0; j--) bytes += String.fromCharCode(rand(256));
			cases.push({
				t,
				b64: Buffer.from(bytes, 'latin1').toString('base64'),
				hex: Buffer.from(bytes, 'latin1').toString('hex') + pick('0g'),
			});
		}
		const code = `return items.map((i) => ({ json: {
			u2b: Buffer.from(i.json.t).toString('base64'),
			u2u: Buffer.from(i.json.t, 'utf8').toString('base64url'),
			b2u: Buffer.from(i.json.b64, 'base64').toString('utf8'),
			t2u: Buffer.from(i.json.t, 'base64').toString('hex'),
			h2u: Buffer.from(i.json.hex, 'hex').toString('utf-8'),
			h2b: Buffer.from(i.json.hex, 'hex').toString('base64'),
		} }));`;
		const h = host(code, 'all', cases);
		const n = native(code, 'all', cases);
		expect(n.ok && h.ok).toBe(true);
		if (h.ok && n.ok) expect(n.value).toEqual(h.value);
	});

	it('formats and computes Luxon DateTimes as Luxon does', () => {
		let seed = 11;
		const rand = (n: number) => {
			seed = (seed * 1103515245 + 12345) % 2147483648;
			return seed % n;
		};
		const pad = (n: number, w = 2) => String(n).padStart(w, '0');
		const units = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second'];
		const cases: Array<Record<string, unknown>> = [];
		for (let k = 0; k < 120; k++) {
			const y = 1995 + rand(40);
			const date = `${y}-${pad(1 + rand(12))}-${pad(1 + rand(28))}`;
			const time = `T${pad(rand(24))}:${pad(rand(60))}:${pad(rand(60))}.${pad(rand(1000), 3)}`;
			const off = ['', 'Z', '+02:00', '-0530', '+01'][rand(5)];
			const iso = [
				date,
				`${date}${time}`,
				`${date}${time}${off}`,
				`${y}-W${pad(1 + rand(52))}-${1 + rand(7)}`,
				`${y}-${pad(1 + rand(365), 3)}`,
				'not a date',
				`${date}T24:00`,
			][rand(7)];
			cases.push({ iso, unit: units[rand(units.length)], n: rand(40) - 20, h: rand(100) - 50 });
		}
		const code = `return items.map((i) => {
			const d = DateTime.fromISO(i.json.iso);
			const z = d.setZone('America/New_York');
			return { json: {
				iso: d.toISO(), valid: d.isValid, date: d.toISODate(),
				fmt: z.toFormat("yyyy-LL-dd'T'HH:mm:ss.SSS ZZ cccc LLLL a h ooo q"),
				plus: d.plus({ months: i.json.n, days: i.json.n, hours: i.json.h }).toISO(),
				minus: z.minus({ years: 1, weeks: 2 }).toISO(),
				start: z.startOf(i.json.unit).toISO(), end: d.endOf(i.json.unit).toISO(),
				set: z.set({ hour: 3, minute: 30 }).toISO(),
				get: [d.year, d.month, d.day, d.weekday, d.ordinal, d.daysInMonth, z.offset, z.hour],
				cmp: d < DateTime.fromISO('2015-06-01'), text: \`\${d}\`, millis: d.toMillis(),
				diff: d.diff(z.minus({ days: i.json.n, hours: i.json.h }), ['months', 'days', 'hours']).toObject(),
				days: d.diff(DateTime.fromISO('2020-01-01'), 'days').days,
				years: z.diff(DateTime.fromISO('2001-03-31T05:00'), ['years', 'quarters', 'minutes']).toObject(),
				as: d.diff(DateTime.fromISO('2020-02-29T13:00'), ['weeks', 'hours']).as('days'),
				ms: d.diff(z.startOf(i.json.unit)).milliseconds,
				weeks: d.diff(DateTime.fromISO('1999-12-31T23:59:59.999Z'), i.json.unit).as('weeks'),
			} };
		});`;
		const h = host(code, 'all', cases);
		const n = native(code, 'all', cases);
		expect(h.ok && n.ok).toBe(true);
		if (h.ok && n.ok) expect(n.value).toEqual(h.value);
	});

	it('gives itemMatching in host code steps, also for a computed node name', () => {
		const code =
			"const name = 'Lookup'; let id; try { id = $(name).itemMatching($itemIndex).json.id; } catch (e) { id = e.message; } return { json: { id } };";
		const one = host(code, 'each', [{ a: 1 }, { a: 2 }], { Lookup: [{ id: 'x' }] });
		expect(one).toEqual({ ok: true, value: [{ id: 'x' }, { id: 'x' }] });
		const two = host(code, 'each', [{ a: 1 }, { a: 2 }], { Lookup: [{ id: 'x' }, { id: 'y' }] });
		expect(two).toEqual({ ok: true, value: [{ id: 'x' }, { id: 'y' }] });
	});

	it('reads other nodes with $()', () => {
		const code =
			"return [{ json: { n: $('Lookup').all().length, first: $('Lookup').first().json.id } }];";
		const nodes = { Lookup: [{ id: 'x' }, { id: 'y' }] };
		expect(native(code, 'all', items, nodes)).toEqual(host(code, 'all', items, nodes));
	});

	it.each([
		['require', "const c = require('crypto'); return [];", 'require'],
		['this.helpers', 'return [{ json: { b: this.helpers } }];', 'this (this.helpers)'],
		[
			'Luxon parsing with a format',
			"return [{ json: { d: DateTime.fromFormat('1/2', 'M/d').toISO() } }];",
			'Luxon DateTime',
		],
		[
			'lookbehind',
			'return [{ json: { m: "ab".match(/(?<=a)b/) } }];',
			'regular expression: a lookbehind assertion',
		],
		[
			'a RegExp without a pattern',
			'const r = new RegExp(); return [];',
			'RegExp with a computed pattern',
		],
		['the host pragma', '// @n8n-host\nreturn items;', 'host pragma'],
	])('keeps %s in the host', (_, code, feature) => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(t.ok).toBe(false);
		if (!t.ok) expect(t.blockers.map((b) => b.feature)).toContain(feature);
	});
});

describe('small forms', () => {
	it('computes Math.imul as V8 does', () => {
		const pairs: unknown[] = [];
		let seed = 3;
		const rnd = () => {
			seed = (seed * 1103515245 + 12345) % 2147483648;
			return seed;
		};
		for (let k = 0; k < 200; k++) {
			const pick = (v: number) => [v, -v, v * 65536 + 7, v / 3, 2 ** 31 + v, -(2 ** 32) - v][v % 6];
			pairs.push({ a: pick(rnd()), b: pick(rnd() % 100000) });
		}
		pairs.push({ a: '12', b: '3' }, { a: null, b: 5 }, { a: 'x', b: 2 }, { a: 4294967295, b: 5 });
		const code =
			'let h = 2166136261; for (const c of "n8n") h = Math.imul(h ^ c.charCodeAt(0), 16777619); return items.map((i) => ({ json: { m: Math.imul(i.json.a, i.json.b), h } }));';
		expect(native(code, 'all', pairs)).toEqual(host(code, 'all', pairs));
	});

	it('indexes object literals and keeps the last value of a repeated key', () => {
		const code =
			"return items.map((i) => ({ json: { e: ({ a: 'x', b: 'y' })[i.json.k], o: { a: 1, b: 2, a: 3, c: 4, b: 5 }, keys: Object.keys({ k: 1, j: 2, k: 3 }) } }));";
		const input = [{ k: 'a' }, { k: 'b' }, { k: 'z' }];
		expect(native(code, 'all', input)).toEqual(host(code, 'all', input));
	});

	it('passes a changed Date to a function that only reads it', () => {
		const code =
			"function fmt(d) { return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate(); } return items.map((i) => { const d = new Date(i.json.t); d.setUTCDate(d.getUTCDate() - 1); const a = fmt(d); d.setUTCMonth(0); return { json: { a, b: fmt(d) } }; });";
		const input = [{ t: '2024-03-01T10:00:00Z' }, { t: '2025-01-01T00:00:00Z' }];
		expect(native(code, 'all', input)).toEqual(host(code, 'all', input));
	});

	it('compares text with localeCompare as V8 does', () => {
		const words = [
			'résumé',
			'resume',
			'Resume',
			'co-op',
			'coop',
			'Zoë',
			'zoe',
			'Ångström',
			'Angstrom',
			'日本',
			'中文',
			'한국어',
			'ﬁle',
			'file',
			'naïve',
			'naive',
			'10',
			'9',
			'a b',
			'a-b',
			'αβγ',
			'абв',
			'',
			'ß',
			'ss',
			'Æsir',
			'Aesir',
		];
		const input = words.map((w) => ({ w }));
		const code =
			"const all = items.map((i) => i.json.w); const sorted = [...all].sort((a, b) => a.localeCompare(b)); return items.map((i) => ({ json: { sorted, en: i.json.w.localeCompare('resume', 'en'), u: i.json.w.localeCompare('Zoë', undefined), signs: all.map((x) => Math.sign(i.json.w.localeCompare(x))) } }));";
		expect(native(code, 'all', input)).toEqual(host(code, 'all', input));
	});

	it.each([
		["a.localeCompare(b, 'sv')", 'a Swedish tailoring'],
		['a.localeCompare(b, undefined, { numeric: true })', 'options'],
		['a.localeCompare(b, loc)', 'a computed locale'],
	])('keeps %s in the host (%s)', (expr) => {
		const code = `const a = $json.a, b = $json.b, loc = $json.l; return { json: { v: ${expr} } };`;
		const t = translateCode({ code, mode: 'each', kind: 'code', hasNode: () => false });
		expect(t.ok).toBe(false);
		if (!t.ok)
			expect(t.blockers.map((b) => b.feature)).toContain('localeCompare with a locale or options');
	});

	it('normalizes text as V8 does', () => {
		const words = [
			'Crème brûlée',
			'Ångström',
			'ﬁﬂ ①②',
			'São Paulo',
			'한국어',
			'Ⅻ ㎒',
			'Zoë',
			'e\u0301\u0323',
			'Ǖ',
			'x',
		];
		const input = words.map((w) => ({ w }));
		const code =
			"return items.map((i) => ({ json: { c: i.json.w.normalize(), d: i.json.w.normalize('NFD'), kc: i.json.w.normalize('NFKC'), kd: i.json.w.normalize('NFKD'), slug: i.json.w.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase() } }));";
		expect(native(code, 'all', input)).toEqual(host(code, 'all', input));
	});

	it('reads $item(k).$node[name].json as v1 does', () => {
		const code =
			"return items.map((i, k) => { try { return { json: { v: $item(k).$node['Src'].json.x } }; } catch (e) { return { json: { failed: 1 } }; } });";
		const nodes = { Src: [{ x: 'a' }, { x: 'b' }] };
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: (n) => n === 'Src' });
		expect(t.ok).toBe(true);
		const n = native(code, 'all', [{}, {}, {}], nodes);
		expect(n).toEqual({ ok: true, value: [{ v: 'a' }, { v: 'b' }, { failed: 1 }] });
	});
});

describe('catch blocks that read the error', () => {
	// Values of a field that make the code in the try block throw, or not.
	const values: unknown[] = [
		'{"a":1,"b":[1,2]}',
		'{"a":1,}',
		"{'a': 1}",
		'',
		'   ',
		'not json',
		'```json\n{"a":1}\n```',
		'{"text":"a very long value that goes past the context of twenty"} trailing',
		'[1, 2',
		'"😀 unterminated',
		'01',
		'-',
		'1e',
		'{"a":"\\x"}',
		'undefined',
		'NaN',
		42,
		true,
		null,
		{ nested: { x: 1 } },
		[1, 2],
		{ a: 'b' },
	];
	const codes = [
		'try { out.v = JSON.parse(item.json.f); } catch (e) { out.err = e.message; out.name = e.name; }',
		'try { out.v = item.json.f.trim(); } catch (err) { out.err = String(err); }',
		// The user code has a template literal: its text is a plain string here.
		'try { out.v = item.json.f.toLowerCase().split(",").map((s) => s.trim()); } catch (e) { out.err = `failed: $' +
			'{e}`; }',
		'try { out.v = (item.json.f || "").replace(/a/g, "b").trim(); } catch (e) { out.err = "x " + e; }',
		'try { out.v = item.json.f.nested.x + item.json.f.a.length; } catch (e) { out.err = e.message; }',
		'try { const p = JSON.parse(item.json.f); out.v = p.a.b.c; } catch (e) { out.err = e.toString(); }',
		'try { if (!item.json.f) throw new Error("missing f"); out.v = item.json.f.push(1); } catch (e) { out.err = e && e.message; out.t = typeof e; }',
		'try { out.v = item.json.f.filter(Boolean).join("-"); } catch (e) { out.err = e.message; }',
		'try { out.v = item.json["f"].toFixed(2); } catch (e) { out.err = e.message; }',
		'try { for (const x of item.json.f) out.v = x; } catch (e) { out.err = e.message; }',
		'try { item.json.f.y.z = 1; out.v = 1; } catch (e) { out.err = e.message; }',
		'try { out.v = Object.keys(item.json.f.q); } catch (e) { out.err = e.message; }',
	];
	it.each(codes.map((c, k) => [k, c]))('gives V8 messages (case %i)', (_, body) => {
		const code = `return $input.all().map((item) => { const out = {}; ${body} return { json: out }; });`;
		const input = values.map((f) => ({ f }));
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(t.ok ? [] : t.blockers).toEqual([]);
		const n = native(code, 'all', input);
		const h = host(code, 'all', input);
		expect(n).toEqual(h);
	});

	it.each([
		['the stack', 'try { JSON.parse("x"); } catch (e) { return [{ json: { s: e.stack } }]; }'],
		['the error as a value', 'try { JSON.parse("x"); } catch (e) { return [{ json: { e } }]; }'],
		[
			'a call of an unknown function',
			'try { cb(); } catch (e) { return [{ json: { m: e.message } }]; }',
		],
		[
			'destructuring',
			'try { const { a } = $json.q; } catch (e) { return [{ json: { m: e.message } }]; }',
		],
	])('keeps %s in the host', (_, code) => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(t.ok).toBe(false);
		if (!t.ok) expect(t.blockers.map((b) => b.feature)).toContain('catch reads the error');
	});
});

describe('regex subset check', () => {
	it('accepts the common forms and names the groups', () => {
		const r = checkRegex('(?<y>\\d{4})-(\\d{2})', 'g');
		expect(r).toEqual({ ok: true, info: { groups: 2, names: ['y', null] } });
	});

	it.each([
		['(?<=a)b', ''],
		['\\p{L}', 'u'],
		['a', 'iu'],
		['\\07', ''],
		['a', 'd'],
	])('rejects /%s/%s', (source, flags) => {
		expect(checkRegex(source, flags).ok).toBe(false);
	});
});

describe('converter', () => {
	const wf = (code: string, extra: Record<string, unknown> = {}) => ({
		name: 'Code test',
		nodes: [webhookNode(), node('Code', 'code', 2, [200, 0], { jsCode: code }, extra)],
		connections: connect([['Webhook', 0, 'Code', 0]]),
	});

	it('writes native code when the code fits', () => {
		const r = convertWorkflow(wf('return items.map(i => ({ json: { a: 1 } }));'));
		expect(r.ok).toBe(true);
		expect(r.fallbackNodes).not.toContain('Code');
		expect(r.source).not.toContain('ctx.code(');
	});

	it('keeps the host step with a diagnostic that names the construct', () => {
		const r = convertWorkflow(
			wf("return [{ json: { d: DateTime.fromFormat('1/2', 'M/d').toISO() } }];"),
		);
		expect(r.fallbackNodes).toContain('Code');
		expect(r.diagnostics.find((d) => d.code === 'code-host')?.message).toContain('Luxon');
	});

	it('moves a node to the host when the compiler rejects its native form', () => {
		const r = convertWorkflow(wf('return [{ json: { a: "x".codePointAt(0) } }];'));
		expect(r.ok).toBe(true);
		expect(r.fallbackNodes).toContain('Code');
		expect(r.diagnostics.find((d) => d.code === 'code-host')?.message).toContain('codePointAt');
	});

	it('keeps the host step with the codeNodes option and per node', () => {
		const code = 'return items;';
		expect(convertWorkflow(wf(code), { codeNodes: 'host' }).fallbackNodes).toContain('Code');
		expect(convertWorkflow(wf(code), { hostCodeNodes: ['Code'] }).fallbackNodes).toContain('Code');
		expect(convertWorkflow(wf(`// @n8n-host\n${code}`)).fallbackNodes).toContain('Code');
	});
});
