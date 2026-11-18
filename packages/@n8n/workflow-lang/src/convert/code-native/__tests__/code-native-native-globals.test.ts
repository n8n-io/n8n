/**
 * Member calls on the values of native globals (`new Intl.DateTimeFormat`, `new Map`, `new Set`,
 * `new Intl.NumberFormat`), against n8n's real task runner (`runner-oracle.ts`).
 *
 * Native code holds such a value as a plain object, so it has only the methods that the helpers
 * implement. A call of any other method fails at run time in native code where v1 succeeds.
 * Each case here must therefore give the result of v1, or the translator refuses the code and
 * the Code node runs in the fallback host. A native form that fails at run time is a failure of
 * the test, whether v1 succeeds or not.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

interface Case {
	name: string;
	code: string;
}

const FORMAT = `{ timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }`;
const NUMBER = `{ maximumFractionDigits: 2 }`;
const DATE = 'new Date(0)';

const code = (lines: string[], value: string) => `${lines.join('\n')}\nreturn [{ json: { v: ${value} } }];`;

/** One method that the native form has, and one that it does not have, for each receiver form. */
function pair(name: string, head: string[], has: string, misses: string): Case[] {
	return [
		{ name: `${name}: ${has}`, code: code(head, has) },
		{ name: `${name}: ${misses}`, code: code(head, misses) },
	];
}

const CASES: Case[] = [
	// Intl.DateTimeFormat and Intl.NumberFormat.
	...pair(
		'direct DateTimeFormat',
		[`const f = new Intl.DateTimeFormat('en-CA', ${FORMAT});`],
		`f.format(${DATE})`,
		'f.resolvedOptions().locale',
	),
	...pair(
		'direct NumberFormat',
		[`const n = new Intl.NumberFormat('en-CA', ${NUMBER});`],
		'String(n.format(12.345))',
		'n.formatRange(1, 2)',
	),
	...pair(
		'const Intl.DateTimeFormat',
		[`const make = () => new Intl.DateTimeFormat('en-CA', ${FORMAT});`, 'const f = make();'],
		`f.format(${DATE})`,
		'f.resolvedOptions().timeZone',
	),
	...pair(
		'let reassigned DateTimeFormat',
		[
			`let f = new Intl.DateTimeFormat('en-CA', ${FORMAT});`,
			`f = new Intl.DateTimeFormat('en-US', ${FORMAT});`,
		],
		`f.format(${DATE})`,
		'f.formatRangeToParts(0, 1)[0].value',
	),
	...pair(
		'parameter DateTimeFormat',
		[
			'const show = (f) => f.format(new Date(0));',
			`const f = new Intl.DateTimeFormat('en-CA', ${FORMAT});`,
		],
		'show(f)',
		'show(new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }))',
	),
	{
		name: 'missing method through a parameter',
		code: code(
			[
				"const opts = (f) => f.resolvedOptions().timeZone;",
				`const f = new Intl.DateTimeFormat('en-CA', ${FORMAT});`,
			],
			'opts(f)',
		),
	},
	...pair(
		'member DateTimeFormat',
		[
			'const box = {};',
			`box.f = new Intl.DateTimeFormat('en-CA', ${FORMAT});`,
		],
		`box.f.format(${DATE})`,
		'box.f.resolvedOptions().timeZone',
	),
	// Map: `get` is a native form, `getOrInsert` is a real method of this Node.js that it lacks.
	...pair(
		'direct Map',
		["const m = new Map([['a', 1]]);"],
		"String(m.get('a'))",
		"String(m.getOrInsert('b', 2))",
	),
	...pair(
		'const Map',
		["const make = () => new Map([['a', 1]]);", 'const m = make();'],
		"String(m.get('a'))",
		"m.getOrInsert('b', 2)",
	),
	...pair(
		'let reassigned Map',
		["let m = new Map([['a', 1]]);", "m = new Map([['a', 2]]);"],
		"String(m.get('a'))",
		"m.getOrInsertComputed('b', () => 2)",
	),
	...pair(
		'parameter Map',
		['const read = (m) => m.get("a");', "const m = new Map([['a', 1]]);"],
		'read(m)',
		'read(new Map([["a", 1]]))',
	),
	{
		name: 'missing Map method through a parameter',
		code: code(
			[
				"const add = (m) => String(m.getOrInsert('b', 2));",
				"const m = new Map([['a', 1]]);",
			],
			'add(m)',
		),
	},
	...pair(
		'member Map',
		['const box = {};', "box.m = new Map([['a', 1]]);"],
		"String(box.m.get('a'))",
		"box.m.getOrInsert('b', 2)",
	),
	// Set: `add`/`has` are native forms, `union` and `isSubsetOf` are not.
	...pair(
		'direct Set',
		['const s = new Set([1, 2]);'],
		'String(s.has(2))',
		's.union(new Set([3])).size',
	),
	...pair(
		'const Set',
		['const make = () => new Set([1, 2]);', 'const s = make();'],
		'String(s.has(2))',
		's.isSubsetOf(new Set([1, 2, 3]))',
	),
	...pair(
		'let reassigned Set',
		['let s = new Set([1]);', 's = new Set([1, 2]);'],
		'String(s.has(2))',
		's.union(new Set([3])).size',
	),
	...pair(
		'parameter Set',
		['const read = (s) => s.has(2);', 'const s = new Set([1, 2]);'],
		'read(s)',
		'read(new Set([1]))',
	),
	{
		name: 'missing Set method through a parameter',
		code: code(
			['const join = (s) => String(s.union(new Set([3])).size);', 'const s = new Set([1, 2]);'],
			'join(s)',
		),
	},
	...pair(
		'member Set',
		['const box = {};', 'box.s = new Set([1, 2]);'],
		'String(box.s.has(2))',
		'box.s.isSupersetOf(new Set())',
	),
];

/**
 * The methods that the translator implements for a Map, a Set and the two Intl formatters
 * (`COLLECTION_METHODS` and the `intlFormat` form of `translate.ts`). Each must compile through
 * a const, in a `for…of` loop, and as an argument of a call that reads the whole value.
 */
const IMPLEMENTED: Case[] = [
	{
		name: 'Map methods through a const',
		code: code(
			[
				'const m = new Map();',
				"m.set('a', 1);",
				"const got = String(m.get('a')), has = String(m.has('a'));",
				'm.delete("a"); m.clear();',
				'const seen = [];',
				'm.forEach((v, k) => seen.push([k, v]));',
				'const parts = [String(seen.length), String(m.size)];',
			],
			'parts.join("|")',
		),
	},
	{
		name: 'Map.entries in a for-of',
		code: [
			'const m = new Map();',
			"m.set('a', 1); m.set('b', 2);",
			'const out = [];',
			'for (const [k, v] of m.entries()) out.push(k + v);',
			'return [{ json: { out } }];',
		].join('\n'),
	},
	{
		name: 'Map.keys and Map.values in a for-of',
		code: [
			'const m = new Map();',
			"m.set('a', 1);",
			'const out = [];',
			'for (const k of m.keys()) out.push(k);',
			'for (const v of m.values()) out.push(v);',
			'return [{ json: { out } }];',
		].join('\n'),
	},
	{
		name: 'Set methods through a const',
		code: [
			'const s = new Set([1, 2]);',
			's.add(3);',
			'const has = String(s.has(2));',
			's.delete(1);',
			'const out = [];',
			's.forEach((v) => out.push(v));',
			's.clear();',
			'return [{ json: { has, out, n: s.size } }];',
		].join('\n'),
	},
	{
		name: 'Set.entries in a for-of',
		code: [
			"const s = new Set(['x']);",
			'const out = [];',
			'for (const [k, v] of s.entries()) out.push(k + v);',
			'for (const v of s.values()) out.push(v);',
			'for (const v of s.keys()) out.push(v);',
			'return [{ json: { out } }];',
		].join('\n'),
	},
	{
		name: 'a Map as a call argument',
		code: [
			'const m = new Map();',
			"m.set('a', 1);",
			'const out = [JSON.stringify(Object.fromEntries(m)), JSON.stringify([...m])];',
			'return [{ json: { out } }];',
		].join('\n'),
	},
	{
		name: 'a Set as a call argument',
		code: [
			'const s = new Set([1, 2]);',
			'const out = [JSON.stringify(Array.from(s)), JSON.stringify({ s })];',
			'return [{ json: { out } }];',
		].join('\n'),
	},
	{
		name: 'Intl formatters through a const',
		code: code(
			[
				`const d = new Intl.DateTimeFormat('en-CA', ${FORMAT});`,
				`const n = new Intl.NumberFormat('en-CA', ${NUMBER});`,
			],
			`d.format(new Date(0)) + String(n.format(12.345)) + JSON.stringify(d.formatToParts(new Date(0)).length)`,
		),
	},
];

describe.skipIf(!taskRunnerAvailable())("native Code nodes on the values of native globals", () => {
	beforeAll(async () => await startRunner(), 120_000);

	it.each(CASES)('gives the result of v1, or refuses the code: $name', async (c) => {
		const runner = await runnerCode(c.code, 'all', [{ a: 1 }]);
		let native: unknown;
		try {
			native = nativeCode(c.code, 'all', [{ a: 1 }]);
		} catch (error) {
			// A refusal is the host: it is correct when v1 runs the code. A refusal of a case
			// that v1 also fails is still exact, so both are accepted.
			expect(String(error)).toMatch(/blocked: /);
			return;
		}
		expect(native).toEqual(runner);
	});

	// The methods that the native form has stay compiled: the kind rules must not refuse them.
	it.each(IMPLEMENTED)('still compiles and gives the result of v1: $name', async (c) => {
		const native = nativeCode(c.code, 'all', [{ a: 1 }]);
		expect(native).toEqual(await runnerCode(c.code, 'all', [{ a: 1 }]));
	});
});
