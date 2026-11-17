/**
 * Forms of Code node JavaScript that real workflows use often: each runs natively and in
 * the fallback host on the same items, and the results must be the same.
 */
import { describe, expect, it } from 'vitest';

import { hostRunners } from '../../__tests__/behaviour/compare.ts';
import { allItemsCode, eachItemCode } from '../../code-node.ts';
import { useUtc } from '../../../reference/runner.ts';
import { runModule } from '../../../testing/vm.ts';
import { checkTranslation } from '../check.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';

useUtc();

type Outcome = { ok: true; value: unknown } | { ok: false };

function native(
	code: string,
	mode: CodeMode,
	input: unknown[],
	itemsOfFirstOnly?: boolean,
): Outcome {
	const t = translateCode({
		code,
		mode,
		kind: 'code',
		hasNode: () => false,
		timezone: 'system',
		itemsOfFirstOnly,
	});
	if (!t.ok) throw new Error(`blocked: ${t.blockers.map((b) => b.feature).join(', ')}`);
	const c = checkTranslation(t.translation, mode);
	if (!c.ok) throw new Error(`does not compile: ${c.blockers.map((b) => b.message).join('; ')}`);
	if (!c.compiled.data) throw new Error('no module');
	const out = runModule(c.compiled.data, {
		trigger: { body: { input, nodes: [] } },
		now: 1_700_000_000_000,
		seed: 1,
		effects: {},
	});
	return out.status === 'ok' ? { ok: true, value: out.result } : { ok: false };
}

function host(code: string, mode: CodeMode, input: unknown[]): Outcome {
	const body = mode === 'each' ? eachItemCode(code, false, false) : allItemsCode(code, false);
	try {
		return { ok: true, value: hostRunners().code({ name: 'code', code: body, items: input }) };
	} catch {
		return { ok: false };
	}
}

function blockersOf(code: string, mode: CodeMode = 'all'): string[] {
	const t = translateCode({ code, mode, kind: 'code', hasNode: () => false });
	return t.ok ? [] : t.blockers.map((b) => b.feature);
}

const rows = [
	{ id: 1, name: 'Ada', Date: '2024-03-07', tags: ['a', 'b'], n: 3, length: 2 },
	{ id: 2, name: 'GRACE İ ß', Date: null, tags: [], n: 0 },
	{ id: 3, name: '', tags: 'text', n: 2.5, nested: { Date: 5, toString: 1 } },
	{ id: 4, name: 7, n: -1, tags: null },
	{ id: 5, n: '4', name: 'ǅ ﬁ Σ', tags: [null, undefined] },
];

const same = (code: string, mode: CodeMode = 'all', input: unknown[] = rows) => {
	const n = native(code, mode, input);
	expect(n).toEqual(host(code, mode, input));
	return n;
};

describe('Object.prototype.hasOwnProperty.call', () => {
	it('gives the result of JavaScript for objects, lists, text and other values', () => {
		const code = `const has = (o, k) => { try { return Object.prototype.hasOwnProperty.call(o, k); } catch (e) { return 'threw'; } };
return items.map((i) => ({ json: {
	own: has(i.json, 'Date'), missing: has(i.json, 'zzz'), inherited: has(i.json, 'toString'),
	nested: has(i.json.nested, 'toString'), nothing: has(i.json.nested, 'x'), nil: has(i.json.tags, 0),
	index: has(i.json.tags, '1'), length: has(i.json.tags, 'length'), text: has(i.json.name, 0),
	number: has(i.json.n, 'toFixed'), key: has({ 1: 'a', undefined: 2 }, i.json.zzz), numeric: has({ 1: 'a' }, i.json.id),
} }));`;
		expect(same(code).ok).toBe(true);
	});

	it('gives the result of JavaScript for a key that is a literal', () => {
		const code = `return items.map((i) => ({ json: {
	own: i.json.hasOwnProperty('Date'), missing: Object.hasOwn(i.json, 'zzz'), long: Object.prototype.hasOwnProperty.call(i.json, 'nested'),
	inherited: i.json.hasOwnProperty('toString'), maker: Object.hasOwn(i.json, 'constructor'), value: Object.prototype.hasOwnProperty.call(i.json, 'valueOf'),
	index: Object.hasOwn(i.json.tags ?? [], '1'), length: Object.hasOwn(i.json.tags ?? [], 'length'), text: Object.hasOwn(i.json.name ?? '', '0'),
} }));`;
		expect(same(code).ok).toBe(true);
		const literal = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(literal.ok && literal.translation.body).toContain("hasOwnNamedOf(i.json, 'Date')");
		expect(literal.ok && literal.translation.body).toContain("hasOwnOf(i.json, 'toString')");
	});

	it('fails for null and undefined as JavaScript does', () => {
		const code =
			'return items.map((i) => ({ json: { v: Object.prototype.hasOwnProperty.call(i.json.tags, "a") } }));';
		expect(same(code).ok).toBe(false);
	});

	it('keeps other uses of call in the host', () => {
		const t = translateCode({
			code: 'return [{ json: { v: Array.prototype.slice.call(items, 1).length } }];',
			mode: 'all',
			kind: 'code',
			hasNode: () => false,
		});
		// The translation leaves the call as it is; the compiler rejects it.
		expect(t.ok && checkTranslation(t.translation, 'all').ok).toBe(false);
	});
});

describe('a property with the name Date', () => {
	it('reads and writes it as any other property', () => {
		const code = `return items.map((i) => { const o = { Date: i.json.Date, when: new Date(Date.UTC(2024, 0, i.json.id)).toISOString() };
	o.Date = o.Date || i.json.nested?.Date || 'none'; return { json: { ...o, has: 'Date' in i.json } }; });`;
		expect(same(code).ok).toBe(true);
	});

	it('keeps the global Date as a value in the host', () => {
		const t = translateCode({
			code: 'const D = Date; return [{ json: { v: typeof D } }];',
			mode: 'all',
			kind: 'code',
			hasNode: () => false,
		});
		expect(t.ok && checkTranslation(t.translation, 'all').ok).toBe(false);
	});
});

describe('Array(n).fill(v)', () => {
	it('makes the list of JavaScript for each kind of length', () => {
		const code = `const make = (n, v) => { try { return Array(n).fill(v); } catch (e) { return 'threw'; } };
return items.map((i) => { const shared = new Array(2).fill({ c: 0 }); shared[0].c = i.json.id;
	return { json: { a: make(i.json.n, 0), b: make(i.json.name, 'x'), c: new Array(i.json.id).fill().length,
		d: Array(3).fill(i.json.tags), shared, e: make(i.json.tags, 1), sum: Array(i.json.id).fill(2).reduce((a, b) => a + b, 0) } }; });`;
		expect(same(code).ok).toBe(true);
	});

	it('evaluates the length before the value', () => {
		const code = `return items.map((i) => { let calls = 0; const next = () => { calls++; return calls; };
	try { Array(i.json.n).fill(next()); } catch (e) { calls += 10; } return { json: { calls } }; });`;
		expect(same(code).ok).toBe(true);
	});

	it('keeps fill with a range and fill of another list in the host', () => {
		for (const code of [
			'return [{ json: { v: Array(3).fill(1, 1) } }];',
			'const a = [1, 2]; a.fill(0); return [{ json: { a } }];',
		]) {
			const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
			expect(t.ok && checkTranslation(t.translation, 'all').ok).toBe(false);
		}
	});
});

describe('toLocaleLowerCase and toLocaleUpperCase without a locale', () => {
	it('gives the text of JavaScript', () => {
		const plain = `const f = (v) => { try { return [v.toLocaleLowerCase(), v.toLocaleUpperCase()]; } catch (e) { return 'threw'; } };
return items.map((i) => ({ json: { name: f(i.json.name), n: f(i.json.n), missing: f(i.json.zzz) } }));`;
		expect(same(plain).ok).toBe(true);
	});

	it('keeps a locale argument in the host', () => {
		const t = translateCode({
			code: "return items.map((i) => ({ json: { v: String(i.json.name).toLocaleLowerCase('tr') } }));",
			mode: 'all',
			kind: 'code',
			hasNode: () => false,
		});
		expect(t.ok && checkTranslation(t.translation, 'all').ok).toBe(false);
	});
});

describe('rest parameters', () => {
	it('gives the rest arguments as a new list at each call', () => {
		const code = `function pick(o, ...keys) { const r = {}; for (const k of keys) r[k] = o[k]; r.count = keys.length; return r; }
const sum = (...xs) => xs.reduce((a, b) => a + b, 0);
const first = function (a = 'none', b, ...rest) { rest.push('end'); return [a, b === undefined, rest]; };
function depth(n, ...trail) { return n <= 0 ? trail : depth(n - 1, ...[]) .concat(trail, [n]); }
return items.map((i) => ({ json: {
	picked: pick(i.json, 'id', 'name'), none: pick(i.json), total: sum(i.json.id, 2, sum(), sum(1, 1),),
	a: first(), b: first(i.json.zzz, 1), c: first(1, 2, 3, i.json.tags), keep: [sum(1), sum(2)],
} }));`;
		expect(blockersOf(code)).toContain('rest parameter');
		const direct = code.replace(
			'depth(n - 1, ...[]) .concat(trail, [n])',
			'depth(n - 1, n, n).concat(trail)',
		);
		expect(blockersOf(direct)).toEqual([]);
		expect(same(direct).ok).toBe(true);
	});

	it('runs a recursive function and a function that the code calls before it declares it', () => {
		const code = `const out = join('-', 'a', 'b', 'c');
function join(sep, ...parts) { return parts.length <= 1 ? String(parts[0] ?? '') : parts[0] + sep + join(sep, parts.slice(1).join(sep)); }
return items.map((i) => ({ json: { out, own: join('/', i.json.id, i.json.n) } }));`;
		expect(same(code).ok).toBe(true);
	});

	it.each([
		['a value', 'const f = (...xs) => xs.length; return [{ json: { v: [1, 2].map(f) } }];'],
		['a spread call', 'const f = (...xs) => xs.length; return [{ json: { v: f(...[1, 2]) } }];'],
		['a callback', 'return [{ json: { v: [[1, 2]].map((...xs) => xs.length) } }];'],
		[
			'a shadowing name',
			'const f = (...xs) => xs.length; const g = (f) => f(1); return [{ json: { v: g(f) } }];',
		],
		['a let', 'let f = (...xs) => xs.length; return [{ json: { v: f(1) } }];'],
		['a method', 'const o = { f(...xs) { return xs.length; } }; return [{ json: { v: o.f(1) } }];'],
		['a destructured rest', 'const f = (...[a, b]) => a + b; return [{ json: { v: f(1, 2) } }];'],
	])('keeps a rest parameter of a function used as %s in the host', (_, code) => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(t.ok && checkTranslation(t.translation, 'all').ok).toBe(false);
	});
});

describe('$items() without a node name', () => {
	/** The host step with the context item that the converter gives it. */
	const hostWithContext = (code: string, mode: CodeMode, input: unknown[], once: boolean) => {
		const body = mode === 'each' ? eachItemCode(code, true, false) : allItemsCode(code, true);
		const context = once ? { $nodes: {}, $itemsOnce: true } : { $nodes: {} };
		try {
			const value = hostRunners().code({ name: 'code', code: body, items: [...input, context] });
			return { ok: true, value };
		} catch {
			return { ok: false };
		}
	};

	// v1 (`$items` of `workflow-data-proxy.ts`): the input items, the same list as `items`.
	it.each([
		['all', 'return $items().map((i) => ({ json: { id: i.json.id, name: i.json.name } }));'],
		[
			'each',
			'return { json: { id: $json.id, of: $items().length, last: $items()[$items().length - 1].json.id } };',
		],
	] as Array<[CodeMode, string]>)('gives the input items in "%s" mode', (mode, code) => {
		for (const once of [false, true]) {
			const n = native(code, mode, rows, once);
			expect(n.ok).toBe(true);
			expect(n).toEqual(hostWithContext(code, mode, rows, once));
		}
	});

	it('gives the first item only when the node before has "execute once"', () => {
		const code = 'return [{ json: { ids: $items().map((i) => i.json.id) } }];';
		expect(native(code, 'all', rows, true)).toEqual({ ok: true, value: [{ ids: [1] }] });
		expect(native(code, 'all', rows, false)).toEqual({
			ok: true,
			value: [{ ids: [1, 2, 3, 4, 5] }],
		});
	});

	it('reads output 0 of a node with $items(name, 0) as with $items(name)', () => {
		const translate = (code: string) =>
			translateCode({ code, mode: 'all', kind: 'code', hasNode: (n) => n === 'Src' });
		const one = translate("return $items('Src').map((i) => ({ json: i.json }));");
		const two = translate("return $items('Src', 0).map((i) => ({ json: i.json }));");
		expect(one.ok && two.ok && two.translation.body === one.translation.body).toBe(true);
		expect(translate("return $items('Src', 1);").ok).toBe(false);
		expect(translate("return $items('Src', 0, 0);").ok).toBe(false);
	});

	it('stays in the host when the node before is not fixed, and with other arguments', () => {
		expect(blockersOf('return $items();')).toContain('$items() without a node name');
		const t = translateCode({
			code: 'return $items(undefined, 0);',
			mode: 'all',
			kind: 'code',
			hasNode: () => false,
			itemsOfFirstOnly: false,
		});
		expect(t.ok).toBe(false);
	});
});

describe('toLocaleString of a Date', () => {
	it('formats a variable that holds one of two new Dates as a Date', () => {
		const code = `return items.map((i) => {
	const when = i.json.n ? new Date(i.json.n * 86400000) : new Date(0);
	return { json: { text: when.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }), year: when.getUTCFullYear(), when } };
});`;
		expect(same(code).ok).toBe(true);
	});

	it('keeps date options on a value of unknown kind in the host', () => {
		const code = `const parse = (v) => new Date(v);
return items.map((i) => ({ json: { text: parse(i.json.n).toLocaleString('en-US', { dateStyle: 'medium' }) } }));`;
		expect(blockersOf(code)).toContain('Date: toLocaleString of a value of unknown kind');
	});
});
