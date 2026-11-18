import type { runModule } from '../../../testing/vm.ts';
import { checkTranslation } from '../check.ts';
import { translateDateForms } from '../index.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';

/**
 * The generated Code bodies of the Date tests: a Date goes to a holder (a variable, a member, a
 * list, a callback, a parameter, `||`, `??`, a ternary) and the code reads it back in several
 * ways (a template, arithmetic, a comparison, `JSON.stringify`, a method).
 */
export const input = [
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

/**
 * More holders: one Date under two names. A setter through one name changes the Date that the
 * other name reads, and the two names are one object.
 */
const SHARED_HOLDERS: Array<[string, string, string]> = [
	['shared member', 'const d = S; const o = { d, list: [d] }; o.list[0].setUTCDate(15);', 'o.d'],
	['two names', 'const d = S; const e = d; e.setUTCMinutes(7);', 'd'],
	[
		'pushed in a loop',
		'const a = []; const d = S; for (let k = 0; k < 2; k++) a.push(d); a[1].setUTCMinutes(9);',
		'a[0]',
	],
	[
		'changed in a function',
		'const bump = (v) => { v.setUTCFullYear(2001); return v; }; const d = bump(S);',
		'd',
	],
	['setter on a variable', 'const d = S; const a = [d]; d.setUTCHours(3, 4);', 'a[0]'],
	['item member', 'i.json.d = S; i.json.d.setUTCMonth(0, 31);', 'i.json.d'],
	['two Dates', 'const d = S; const e = new Date(d); e.setUTCDate(2); const a = [d, e];', 'a[0]'],
];

/** More uses: setters, the tests of the kind and of the identity, and the texts of a locale. */
const SHARED_USES = [
	'R.setUTCHours(5)',
	'R.setUTCDate(31)',
	'R.setUTCFullYear(2020, 1, 29)',
	'R.setTime(86400000)',
	'R.setUTCMinutes()',
	'R.setUTCMonth(13, 1)',
	'R.setUTCSeconds(1, undefined)',
	'R.setUTCMilliseconds(i.json.k)',
	'R.setHours(i.json.k, 59, 59, 999)',
	"R.setDate('7')",
	'R.setMonth(i.json.u)',
	'R.toLocaleString()',
	"R.toLocaleDateString('en-US')",
	'R.toLocaleTimeString()',
	"R.toLocaleString('en-US', { dateStyle: 'short' })",
	'R.valueOf()',
	'R.toJSON()',
	'R.getTime() === R.getTime()',
	'new Date(R).getTime()',
	'[R].indexOf(R)',
	'Object.keys(R).length',
	'R.getTimezoneOffset()',
	'R.toUTCString()',
	'JSON.stringify([R])',
	'R === R',
	'typeof R',
	'R instanceof Date',
	'R ? 1 : 2',
	'[R, 1].includes(R)',
	'R.getUTCDate()',
	'R.toISOString()',
	'`${R}`',
	'R',
	// A Date in each helper of the translation that can get a value of the code.
	'[...[R, 1]].length',
	'(() => { let n = 0; for (const v of [R, R]) n += v - 0; return n; })()',
	"[...'ab', R].length",
	"String(R).replace(/\\d+/g, 'n')",
	"'x-y'.replace(/-/, R)",
	"'a1b'.replace(/\\d/, () => R)",
	"'a-b-a'.replaceAll('a', R)",
	'/2024/.test(R)',
	'String(R).match(/\\d{4}/)',
	'String(R).split(/\\s/).length',
	'/(\\d+)/.exec(R)',
	"new RegExp('2024').test(R)",
	"String(R).search(/20/)",
	'[...String(R).matchAll(/\\d\\d/g)].length',
	'new Set([R, R]).size',
	'new Set([R, new Date(R)]).size',
	'new Map([[1, R]]).get(1)',
	'new Set([R]).has(R)',
	'(() => { const m = new Map(); m.set(R, 1); return [m.get(R), m.has(new Date(R)), m.size]; })()',
	'[...new Set([R, R])].length',
	'(() => { const s = new Set([R]); s.delete(R); return s.size; })()',
	'(() => { const out = []; new Map([[R, R]]).forEach((v, k) => out.push(v === k)); return out; })()',
	'[...new Map([[1, R]]).values()]',
	'JSON.stringify({ s: new Set([R]), d: R, l: [R] })',
	'(() => { const s = new Set([1]); return Object.keys(R).length + s.size; })()',
	'Number.isNaN(R)',
	'isFinite(R)',
	'Number.isSafeInteger(R)',
	'Math.max(...[R, 5])',
	'Math.min(...[R, 5])',
	'Math.imul(R, 1)',
	"R.hasOwnProperty('x')",
	"Object.hasOwn(R, 'getTime')",
	"({ a: R }).hasOwnProperty('a')",
	"({ a: R }).hasOwnProperty('toString')",
	'Array.from([R])[0]',
	'Array.from(R).length',
	"Array.from('ab', () => R)",
	"Object.fromEntries([['a', R]]).a",
	'Object.fromEntries([[R, 1]])',
	'[R, 1].lastIndexOf(R)',
	'Array(2).fill(R)',
	'Array(R).length',
	'Object.assign({}, { v: R }).v',
	'Object.assign({ a: 1 }, R)',
	'(() => { const a = [1, 2, 3]; a.splice(1, 1, R); return a; })()',
	'(() => { const a = []; a.push(...[R, R]); return a.length; })()',
	'encodeURIComponent(R)',
	'encodeURI(R)',
	"String.fromCharCode(R % 100)",
	'(R - 0).toString(16)',
	'R.toString()',
	'R == R',
	'R == 5',
	'R != null',
	'R == String(R)',
	'R == R.getTime()',
	'i.json.none?.toString()',
	"new Intl.DateTimeFormat('en-US').format(R)",
	"new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(R)",
	'Math.max.apply(null, [R, 5])',
];

/** A small generator with a seed: the same seed gives the same bodies. */
export function generator(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 4294967296;
	};
}

export interface Body {
	code: string;
	holder: string;
	uses: string[];
}

/**
 * One body. With `shared`, the holders and the uses also have the forms of a Date under two
 * names, with setters.
 */
export function makeBody(next: () => number, shared = false): Body {
	const pick = <T>(list: T[]): T => list[Math.floor(next() * list.length)];
	const holders = shared ? [...HOLDERS, ...SHARED_HOLDERS] : HOLDERS;
	const useList = shared ? [...USES, ...SHARED_USES] : USES;
	const [holder, statements, read] = pick(holders);
	const source = pick(SOURCES);
	const uses = [pick(useList), pick(useList), pick(useList)].slice(
		0,
		1 + Math.floor(next() * 3),
	);
	const head =
		'function make(v) { return new Date(v); }\nconst pick = (v) => v;\nconst use = (x, k) => (k === 0 ? U0 : k === 1 ? U1 : U2);\n';
	// `R` as a word is the place of the read: `RegExp` and `encodeURI` keep their letters.
	const text = (template: string, r: string) => template.replace(/\bR\b/g, () => r);
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

/**
 * The module of the native form of `code` as the converter makes it: the first form of the
 * Dates that has a native form, with the traced form for the line of an error. Else the
 * feature that the translation refuses.
 */
export function nativeModule(
	code: string,
	mode: CodeMode,
	dateValues: boolean,
): { data: Parameters<typeof runModule>[0]; helpers: string[] } | { refused: string } {
	const form = translateDateForms({
		code,
		mode,
		kind: 'code',
		hasNode: () => false,
		timezone: 'system',
		dateValues,
	});
	const t = form.result;
	if (!t.ok) return { refused: t.blockers[0].feature };
	const traced = translateCode({ ...form.options, traced: true });
	if (!traced.ok) return { refused: `line of an error: ${traced.blockers[0].feature}` };
	const c = checkTranslation(t.translation, mode, false, traced.translation);
	if (!c.ok) return { refused: c.blockers[0].feature };
	if (!c.compiled.data) return { refused: 'no module' };
	return { data: c.compiled.data, helpers: [...t.translation.helpers, ...traced.translation.helpers] };
}
