/**
 * A differential test of Dates in Code nodes. It makes small Code bodies: a Date goes to a
 * holder (a variable, a member, a list, a callback, a parameter, `||`, `??`, a ternary) and
 * the code reads it back in several ways (a template, arithmetic, a comparison,
 * `JSON.stringify`, a method). Each body runs in the fallback host and in the native form.
 * The results must be equal, or the translation must refuse the code (the node then runs in
 * the host).
 *
 * `WF_DATE_CASES` sets the number of bodies (the default is 300). `WF_DATE_SEED` sets the seed.
 */
import { describe, expect, it } from 'vitest';

import { hostRunners } from '../../__tests__/behaviour/compare.ts';
import { allItemsCode } from '../../code-node.ts';
import { useUtc } from '../../../reference/runner.ts';
import { runModule } from '../../../testing/vm.ts';
import { checkTranslation } from '../check.ts';
import { translateCode } from '../translate.ts';

useUtc();

type Outcome = { ok: true; value: string } | { ok: false } | { refused: string };

const input = [
	{ t: '2024-03-07T10:20:30.000Z', u: '2023-11-05T06:30:00Z', ms: 1700000000000, k: 3 },
	{ t: 'not a date', u: 0, ms: 5, k: 1 },
	{ t: '2024-01-31T23:59:59.999+05:00', u: null, k: 2 },
	{ t: 1700000000000, u: '', ms: 86400000, k: 0 },
];

const SOURCES = [
	'new Date(i.json.t)',
	'new Date(i.json.ms)',
	'new Date(i.json.u)',
	'new Date(Date.UTC(2024, 1, i.json.k))',
	'make(i.json.t)',
];

/** A holder: the statements that put the Date `S` in a place, and the expression that reads it. */
const HOLDERS: Array<[string, string, string]> = [
	['variable', 'const d = S;', 'd'],
	['member', 'const o = { d: S, n: 1 };', 'o.d'],
	['member assignment', 'const o = {}; o.d = S;', 'o.d'],
	['computed member', "const o = {}; const key = 'd' + i.json.k; o[key] = S;", 'o[key]'],
	['list', 'const a = [S, 1];', 'a[0]'],
	['push', 'const a = []; a.push(S);', 'a[0]'],
	['callback', 'const a = [1].map(() => S);', 'a[0]'],
	['parameter', '', 'S'],
	['or', 'const d = i.json.u || S;', 'd'],
	['nullish', 'const d = i.json.u ?? S;', 'd'],
	['ternary with a value', 'const d = i.json.k > 1 ? S : i.json.t;', 'd'],
	['ternary with null', 'const d = i.json.k > 1 ? S : null;', 'd'],
	['ternary of two Dates', 'const d = i.json.k > 1 ? S : new Date(i.json.ms);', 'd'],
	['assignment after the declaration', 'let d; d = S;', 'd'],
	['item', 'i.json.d = S;', 'i.json.d'],
	['nested list', 'const o = { a: { list: [S] } };', 'o.a.list[0]'],
	['pattern', 'const { d } = { d: S };', 'd'],
	['alias', 'const first = S; const d = first;', 'd'],
	['values of an object', 'const d = Object.values({ x: S })[0];', 'd'],
	['result of a function', 'const d = pick(S);', 'd'],
];

const USES = [
	'`${R}`',
	"'' + R",
	'String(R)',
	'R - 5',
	'R - new Date(i.json.ms)',
	'+R',
	'R < new Date(i.json.ms)',
	'R > 1700000000000',
	'R == null',
	'R === R',
	'JSON.stringify(R)',
	'JSON.stringify({ v: R })',
	'R',
	'typeof R',
	'R instanceof Date',
	'R.getTime()',
	'R.toISOString()',
	'R.getUTCDay()',
	'R ? 1 : 2',
	'!R',
	"R || 'x'",
	"R ?? 'x'",
	'Math.max(R, 5)',
	'isNaN(R)',
	'Number(R)',
	"[R].join('|')",
	'[R, 1].includes(R)',
	'R.toString()',
	'R.valueOf()',
	'R.toJSON()',
	'[R, R].length',
	'{ v: R }',
	'[R]',
];

/** A small generator with a seed: the same seed gives the same bodies. */
function generator(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 4294967296;
	};
}

interface Body {
	code: string;
	holder: string;
	uses: string[];
}

function makeBody(next: () => number): Body {
	const pick = <T>(list: T[]): T => list[Math.floor(next() * list.length)];
	const [holder, statements, read] = pick(HOLDERS);
	const source = pick(SOURCES);
	const uses = [pick(USES), pick(USES), pick(USES)].slice(0, 1 + Math.floor(next() * 3));
	const head =
		'function make(v) { return new Date(v); }\nconst pick = (v) => v;\nconst use = (x, k) => (k === 0 ? U0 : k === 1 ? U1 : U2);\n';
	const text = (template: string, r: string) => template.split('R').join(r);
	if (holder === 'parameter') {
		const fn = head
			.replace('U0', text(uses[0], 'x'))
			.replace('U1', text(uses[1] ?? '1', 'x'))
			.replace('U2', text(uses[2] ?? '2', 'x'));
		return {
			code: `${fn}return items.map((i) => ({ json: { a: use(${source}, 0), b: use(${source}, 1), c: use(${source}, 2) } }));`,
			holder,
			uses,
		};
	}
	const fn = head.replace('U0', '0').replace('U1', '1').replace('U2', '2');
	const fields = uses.map((u, k) => `${'abc'[k]}: ${text(u, read)}`).join(', ');
	return {
		code: `${fn}return items.map((i) => { ${statements.split('S').join(source)} return { json: { ${fields} } }; });`,
		holder,
		uses,
	};
}

function native(code: string): Outcome {
	let t = translateCode({
		code,
		mode: 'all',
		kind: 'code',
		hasNode: () => false,
		timezone: 'system',
	});
	let c = t.ok ? checkTranslation(t.translation, 'all') : undefined;
	const typed = t.ok ? t.translation.typedDates : t.partial?.typedDates === true;
	const first = !t.ok ? t.blockers[0].feature : c && !c.ok ? c.blockers[0].feature : '';
	if (typed && !c?.ok) {
		t = translateCode({
			code,
			mode: 'all',
			kind: 'code',
			hasNode: () => false,
			timezone: 'system',
			plainDates: true,
		});
		c = t.ok ? checkTranslation(t.translation, 'all') : undefined;
	}
	if (!t.ok) return { refused: first || t.blockers[0].feature };
	if (!c?.ok) return { refused: first || (c ? c.blockers[0].feature : 'no check') };
	if (!c.compiled.data) return { refused: 'no module' };
	const out = runModule(c.compiled.data, {
		trigger: { body: { input: structuredClone(input), nodes: [] } },
		now: 1_700_000_000_000,
		seed: 1,
		effects: {},
	});
	return out.status === 'ok' ? { ok: true, value: JSON.stringify(out.result) } : { ok: false };
}

function host(code: string): Outcome {
	try {
		const value = hostRunners().code({
			name: 'code',
			code: allItemsCode(code, false),
			items: structuredClone(input),
		});
		return { ok: true, value: JSON.stringify(value) };
	} catch {
		return { ok: false };
	}
}

describe('Dates in Code nodes: the native form against the fallback host', () => {
	it('gives the result of the host, or refuses the code', () => {
		const cases = Number(process.env.WF_DATE_CASES ?? 300);
		const next = generator(Number(process.env.WF_DATE_SEED ?? 1));
		const wrong = new Map<string, { count: number; code: string; native: string; host: string }>();
		const refused = new Map<string, number>();
		let equal = 0;
		for (let k = 0; k < cases; k++) {
			const body = makeBody(next);
			const n = native(body.code);
			if ('refused' in n) {
				refused.set(n.refused, (refused.get(n.refused) ?? 0) + 1);
				continue;
			}
			const h = host(body.code);
			if (JSON.stringify(n) === JSON.stringify(h)) {
				equal++;
				continue;
			}
			const name = `${body.holder} | ${body.uses.join(' ; ')}`;
			const entry = wrong.get(body.holder) ?? {
				count: 0,
				code: body.code,
				native: JSON.stringify(n).slice(0, 300),
				host: JSON.stringify(h).slice(0, 300),
			};
			entry.count++;
			wrong.set(body.holder, entry);
			if (process.env.WF_DATE_VERBOSE) console.log('WRONG', name);
		}
		const report = [
			`cases ${cases}; equal ${equal}; refused ${cases - equal - [...wrong.values()].reduce((s, w) => s + w.count, 0)}`,
			...[...refused].sort((a, b) => b[1] - a[1]).map(([f, c]) => `  refused ${c}: ${f}`),
			...[...wrong].map(
				([holder, w]) =>
					`  WRONG ${w.count}: ${holder}\n    ${w.code}\n    native ${w.native}\n    host   ${w.host}`,
			),
		].join('\n');
		if (process.env.WF_DATE_CASES || wrong.size > 0) console.log(report);
		expect([...wrong.keys()]).toEqual([]);
		expect(equal).toBeGreaterThan(0);
	}, 1_800_000);
});

describe('Dates in node code and in expressions: the rule of Code nodes', () => {
	const translate = (code: string, where: 'node' | 'expression') =>
		translateCode({
			code,
			mode: 'all',
			kind: 'code',
			hasNode: () => false,
			timezone: 'UTC',
			...(where === 'node'
				? { nodeCode: { globals: new Set(['value']) } }
				: { expression: { globals: new Set(['value']) } }),
		});
	const feature = (code: string, where: 'node' | 'expression') => {
		const t = translate(code, where);
		return t.ok ? 'ok' : t.blockers[0].feature;
	};

	it.each(['node', 'expression'] as const)(
		'refuses a Date that loses its kind in %s code',
		(where) => {
			expect(feature('return value.getTime();', where)).toBe(
				'Date: method of a value of unknown kind',
			);
			expect(feature('return value.toISOString();', where)).toBe(
				'Date: method of a value of unknown kind',
			);
			expect(feature('const f = (d) => d - 1; return f(new Date(value));', where)).toBe(
				'Date: a Date in a place that loses its kind',
			);
			expect(feature('const o = { d: new Date(value) }; return o.d - 1;', where)).toBe(
				'Date: a Date read back from an object',
			);
			expect(feature('const a = [new Date(value)]; return a[0] - 1;', where)).toBe(
				'Date: a Date in a place that loses its kind',
			);
		},
	);

	it.each(['node', 'expression'] as const)(
		'keeps a Date with a proven kind in %s code',
		(where) => {
			expect(feature('return new Date(value).getTime();', where)).toBe('ok');
			expect(feature('const d = new Date(value); return d.toISOString();', where)).toBe('ok');
			expect(feature('const d = new Date(value); return { at: d, ms: d - 1 };', where)).toBe('ok');
		},
	);
});
