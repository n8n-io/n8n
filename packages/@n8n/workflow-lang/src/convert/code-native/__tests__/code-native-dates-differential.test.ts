/**
 * A differential test of Dates in Code nodes. It makes small Code bodies: a Date goes to a
 * holder (a variable, a member, a list, a callback, a parameter, `||`, `??`, a ternary) and
 * the code reads it back in several ways (a template, arithmetic, a comparison,
 * `JSON.stringify`, a method). Each body runs in the fallback host and in the native form.
 * The results must be equal, or the translation must refuse the code (the node then runs in
 * the host).
 *
 * `WF_DATE_CASES` sets the number of bodies (the default is 300). `WF_DATE_SEED` sets the seed.
 * `WF_DATE_VALUES=0` gives the translation without Date values. `WF_DATE_HELPERS` prints the
 * helpers of the bodies that ran: the list for `DATE_VALUE_HELPERS` of the translation.
 */
import { describe, expect, it } from 'vitest';

import { hostRunners } from '../../__tests__/behaviour/compare.ts';
import { allItemsCode } from '../../code-node.ts';
import { useUtc } from '../../../reference/runner.ts';
import { runModule } from '../../../testing/vm.ts';
import { translateDateForms } from '../index.ts';
import { translateCode } from '../translate.ts';
import { generator, input, makeBody, nativeModule } from './dates-cases.ts';

useUtc();

const VALUES = process.env.WF_DATE_VALUES !== '0';
/** `WF_DATE_SHARED=1`: the bodies also have a Date under two names, with setters. */
const SHARED = process.env.WF_DATE_SHARED === '1';

const USED = new Set<string>();
type Outcome = { ok: true; value: string } | { ok: false } | { refused: string };

function native(code: string): Outcome {
	const m = nativeModule(code, 'all', VALUES);
	if ('refused' in m) return m;
	for (const h of m.helpers) USED.add(h);
	const out = runModule(m.data, {
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
			const body = makeBody(next, SHARED);
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
				native: JSON.stringify(n).slice(0, 1000),
				host: JSON.stringify(h).slice(0, 1000),
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
		if (process.env.WF_DATE_CASES || wrong.size > 0) require('fs').writeFileSync('/tmp/date-diff-report.txt', report);
		if (process.env.WF_DATE_HELPERS) console.log('HELPERS', [...USED].sort().join(' '));
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

describe('Date values in Code nodes', () => {
	const feature = (code: string, dateValues: boolean) => {
		const t = translateCode({
			code,
			mode: 'all',
			kind: 'code',
			hasNode: () => false,
			timezone: 'system',
			dateValues,
		});
		return t.ok ? t.translation.body : t.blockers[0].feature;
	};
	const body = (statements: string) =>
		`return items.map((i) => { ${statements} return { json: { a: a[0] - 1 } }; });`;

	it('gives a Date in a list as a Date value only with the option', () => {
		const code = body('const a = [new Date(i.json.t)];');
		expect(feature(code, false)).toBe('Date: a Date in a place that loses its kind');
		expect(feature(code, true)).toContain('[Date.value(new Date(i.json.t))]');
	});

	it('checks the receiver of a Date method of a value of unknown kind', () => {
		const code = 'return items.map((i) => ({ json: { a: i.json.t.getTime() } }));';
		expect(feature(code, false)).toBe('Date: method of a value of unknown kind');
		expect(feature(code, true)).toContain(
			'Date.of(i.json.t, "getTime", "i.json.t.getTime").getTime()',
		);
	});

	it.each([
		[
			'two Date values of one variable',
			'const d = new Date(i.json.t); const a = [d]; const b = [d];',
		],
		[
			'a Date value of a variable in a loop',
			'const d = new Date(i.json.t); const a = []; for (let k = 0; k < 2; k++) a.push(d);',
		],
		[
			'a Date value of a variable with a setter',
			'const d = new Date(i.json.t); const a = [d]; d.setFullYear(2000);',
		],
	])('refuses %s: the code could see two objects', (_name, statements) => {
		expect(feature(body(statements), true)).toBe('Date: a Date in a place that loses its kind');
	});

	it('tests the kind of a value with instanceof Date', () => {
		const code = body(
			'const a = [new Date(i.json.t), i.json.t]; if (a[1] instanceof Date) a.pop();',
		);
		expect(feature(code, false)).toBe('Date: a Date in a place that loses its kind');
		expect(feature(code, true)).toContain('if (Date.is(a[1])) a.pop();');
	});

	it('refuses a method of a Date that the code reads as a value', () => {
		const code = body('const a = [new Date(i.json.t)]; if (a[0].getTime) return { json: {} };');
		expect(feature(code, true)).toBe('Date: method of a Date as a value');
	});

	it.each([
		['a write', 'const a = [new Date(i.json.t)]; a[0].note = 1;'],
		[
			'a write to a parameter',
			'const a = [new Date(i.json.t)]; const f = (o) => { o.note = 1; }; f(a[0]);',
		],
		['a delete', 'const a = [new Date(i.json.t)]; delete a[0].note;'],
		['a test with in', "const a = [new Date(i.json.t)]; if ('note' in a[0]) return { json: {} };"],
	])('refuses %s of a member of a value that can be a Date value', (_name, statements) => {
		expect(feature(body(statements), true)).toBe(
			'Date: a member of a value that can be a Date value',
		);
	});

	it('keeps a write to a member of an object of the code and of the json of an item', () => {
		const code = body(
			'const o = {}; o.d = new Date(i.json.t); i.json.at = new Date(i.json.ms); const a = [o.d];',
		);
		expect(feature(code, true)).toContain('i.json.at = Date.value(new Date(i.json.ms))');
	});

	it('refuses a Date value with a helper that is not proven', () => {
		const code = body('const a = [new Date(i.json.t)]; const name = "X"; const x = $(name).all();');
		expect(feature(code, true)).toBe('Date: a Date value with a helper that is not proven');
	});

	it('refuses a setter of a Date value beside a variable with the type Date', () => {
		const code = body('const d = new Date(i.json.t); const a = [d]; a[0].setHours(0);');
		expect(feature(code, true)).toBe('Date: setter on a shared Date');
		const copy = body('const a = [new Date(i.json.t)]; a[0].setHours(0);');
		expect(feature(copy, true)).toBe('Date: setter on a shared Date');
	});

	it('tests the kind of the receiver of toLocaleString at run time', () => {
		const code = body('const a = [new Date(i.json.t)]; const s = a[0].toLocaleString();');
		expect(feature(code, false)).toBe('Date: a Date in a place that loses its kind');
		expect(feature(code, true)).toMatch(/localeFormat\(a\[0\], .*, null\)/);
	});

	it('takes the Date of a Date value for toLocaleDateString, or the TypeError of JavaScript', () => {
		const code = body('const a = [new Date(i.json.t)]; const s = a[0].toLocaleDateString();');
		expect(feature(code, true)).toContain(
			'localeFormat(Date.of(a[0], "toLocaleDateString", "a[0].toLocaleDateString").getTime(), ',
		);
	});

	it('calls valueOf and toJSON of a value of unknown kind through a helper', () => {
		const code = body('const a = [new Date(i.json.t)]; const v = [a[0].valueOf(), a[0].toJSON()];');
		expect(feature(code, true)).toContain(
			'[valueOfOf(a[0], "a[0].valueOf"), toJsonOf(a[0], "a[0].toJSON")]',
		);
	});

	it('gives the text of V8 for the callee of a Date method', () => {
		const code =
			'const f = (v) => v; return items.map((i) => ({ json: { a: f(i.json.t).getTime(), b: i.json["t"].getUTCDay() } }));';
		const text = feature(code, true);
		expect(text).toContain('Date.of(f(i.json.t), "getTime", "f(...).getTime").getTime()');
		expect(text).toContain('Date.of(i.json["t"], "getUTCDay", "i.json.t.getUTCDay").getUTCDay()');
	});

	it('refuses a Date method name that the code defines as a member', () => {
		const code =
			'const clock = { getTime: () => 5 }; return items.map((i) => ({ json: { a: clock.getTime(), b: [new Date(0)] } }));';
		expect(feature(code, true)).toBe('Date: method of a value of unknown kind');
	});
});

describe('Date objects in Code nodes', () => {
	const options = (code: string) => ({
		code,
		mode: 'all' as const,
		kind: 'code' as const,
		hasNode: () => false,
		timezone: 'system',
		dateValues: true,
	});
	const objects = (code: string) => {
		const t = translateCode({ ...options(code), dateObjects: true });
		return t.ok ? t.translation.body : t.blockers[0].feature;
	};
	const form = (code: string) => {
		const f = translateDateForms(options(code));
		return {
			ok: f.result.ok,
			values: f.options.dateValues === true,
			objects: f.options.dateObjects === true,
		};
	};

	it('gives each Date that the code holds as a Date value', () => {
		const text = objects(
			'return items.map((i) => { const d = new Date(i.json.t); const e = d; return { json: { same: d === e, t: typeof d, n: new Date(i.json.ms).getTime(), at: d } }; });',
		);
		expect(text).toContain('const d: Json = Date.value(new Date(i.json.t));');
		expect(text).toContain('same: d === e, t: typeof d');
		// An operation reads this Date at once: it needs no Date value.
		expect(text).toContain('n: new Date(i.json.ms).getTime()');
	});

	it('gives a setter as a change of the Date value', () => {
		const text = objects(
			'return items.map((i) => { const d = new Date(i.json.t); const a = [d]; a[0].setUTCHours(1, 2); d.setDate(); return { json: { d } }; });',
		);
		expect(text).toContain('dateSetter("setUTCHours", "a[0].setUTCHours", a[0], [1, 2]);');
		expect(text).toContain('dateSetter("setDate", "d.setDate", d, []);');
	});

	it('refuses a setter with a spread argument', () => {
		expect(
			objects(
				'return items.map((i) => { const d = new Date(i.json.t); const p = [1, 2]; d.setHours(...p); return { json: { d } }; });',
			),
		).toBe('Date: method of a value of unknown kind');
	});

	it.each([
		[
			'no Date value for a Date that only leaves the node',
			'return items.map((i) => ({ json: { d: new Date(i.json.t) } }));',
			{ ok: true, values: false, objects: false },
		],
		[
			'a Date value for a Date in a list that the code reads',
			'return items.map((i) => { const a = [new Date(i.json.t)]; return { json: { n: a[0] - 1 } }; });',
			{ ok: true, values: true, objects: false },
		],
		[
			'Date objects for a setter on a shared Date',
			'return items.map((i) => { const d = new Date(i.json.t); const a = [d]; a[0].setUTCHours(0); return { json: { d } }; });',
			{ ok: true, values: true, objects: true },
		],
		[
			'Date objects for the kind of a Date variable',
			'return items.map((i) => { const d = new Date(i.json.t); return { json: { t: typeof d, c: d ? 1 : 2 } }; });',
			{ ok: true, values: true, objects: true },
		],
	])('takes the first form that is exact: %s', (_name, code, expected) => {
		expect(form(code)).toEqual(expected);
	});
});
