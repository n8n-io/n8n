/**
 * Locale formatting with a locale and options outside the table of
 * `locale-data.generated.ts`: the translator derives the specs from the ICU data
 * (`locale-derive.ts`). Each case runs natively, and the texts must be the texts of Node.js.
 */
import { describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { runModule } from '../../../testing/vm.ts';
import { checkTranslation } from '../check.ts';
import { LOCALE_TABLE } from '../locale-data.generated.ts';
import { deriveLocaleEntry, derivedLocaleEntry, LOCALE_ICU } from '../locale-derive.ts';
import { translateCode } from '../translate.ts';

useUtc();

const TIMES = [
	Date.UTC(2024, 2, 7, 15, 4, 5, 678),
	Date.UTC(2023, 11, 31, 23, 59, 59),
	Date.UTC(2025, 0, 5, 3, 4, 5, 6),
];
const NUMBERS = [0, 1234567.891, -42.5, 0.125, 99.995, 1e7];

function run(code: string): unknown {
	const t = translateCode({
		code,
		mode: 'all',
		kind: 'code',
		hasNode: () => false,
		timezone: 'system',
	});
	if (!t.ok) throw new Error(`blocked: ${t.blockers.map((b) => b.feature).join(', ')}`);
	const c = checkTranslation(t.translation, 'all');
	if (!c.ok) throw new Error(`does not compile: ${c.blockers.map((b) => b.message).join('; ')}`);
	if (!c.compiled.data) throw new Error('no module');
	const out = runModule(c.compiled.data, {
		trigger: { body: { input: [{}], nodes: [] } },
		now: 1_700_000_000_000,
		seed: 1,
		effects: {},
	});
	expect(out.status).toBe('ok');
	return out.result;
}

type Options = Record<string, string | number | boolean>;

/** Date cases: a method, a locale, options and a time zone. None is in the table. */
const DATES: Array<[string, string, Options, string | null]> = [
	['toLocaleDateString', 'nb-NO', { weekday: 'long', day: 'numeric', month: 'long' }, null],
	['toLocaleDateString', 'fi-FI', { year: 'numeric', month: 'short', day: '2-digit' }, null],
	['toLocaleString', 'el-GR', { dateStyle: 'full', timeStyle: 'short' }, null],
	[
		'toLocaleString',
		'ro-RO',
		{ hour: '2-digit', minute: '2-digit', hour12: false },
		'Europe/Bucharest',
	],
	[
		'toLocaleTimeString',
		'en-NZ',
		{ hour: 'numeric', minute: '2-digit', second: '2-digit' },
		'Pacific/Auckland',
	],
	['toLocaleDateString', 'vi-VN', { year: 'numeric', month: 'long' }, null],
	['toLocaleString', 'tr-TR', { dateStyle: 'medium' }, null],
	[
		'toLocaleDateString',
		'hi-IN',
		{ weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' },
		'Asia/Kolkata',
	],
	[
		'toLocaleString',
		'lt-LT',
		{ month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' },
		null,
	],
	['toLocaleDateString', 'sk-SK', { dateStyle: 'long' }, null],
];

const INTL_DATES: Array<[string, Options, string | null]> = [
	[
		'en-IE',
		{ weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
		'Europe/Dublin',
	],
	['bg-BG', { year: 'numeric', month: 'long', day: 'numeric' }, null],
	['ms-MY', { dateStyle: 'full' }, 'Asia/Kuala_Lumpur'],
	['ca-ES', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, null],
];

const INTL_NUMBERS: Array<[string, Options]> = [
	['nb-NO', { style: 'currency', currency: 'NOK' }],
	['en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }],
	['de-AT', { minimumFractionDigits: 1, maximumFractionDigits: 3 }],
	['fr-CH', { style: 'percent', maximumFractionDigits: 1 }],
	['sv-SE', { style: 'currency', currency: 'SEK' }],
];

const withZone = (options: Options, zone: string | null): Options =>
	zone === null ? options : { ...options, timeZone: zone };

describe('locale formatting outside the table', () => {
	it('uses cases that the table does not have', () => {
		for (const [method, locale, options] of DATES) {
			expect(Object.hasOwn(LOCALE_TABLE, JSON.stringify([method, locale, options]))).toBe(false);
		}
		expect(process.versions.icu).toBe(LOCALE_ICU);
	});

	it.each(DATES)('%s %s %j %s', (method, locale, options, zone) => {
		const all = withZone(options, zone);
		const code = `const out = [];
for (const t of ${JSON.stringify(TIMES)}) out.push(new Date(t).${method}(${JSON.stringify(locale)}, ${JSON.stringify(all)}));
return [{ json: { out } }];`;
		const want = TIMES.map((t) =>
			new Date(t)[method as 'toLocaleString'](locale, { timeZone: 'UTC', ...all }),
		);
		expect(run(code)).toEqual([{ out: want }]);
	});

	it.each(INTL_DATES)('Intl.DateTimeFormat %s %j %s', (locale, options, zone) => {
		const all = withZone(options, zone);
		const code = `const f = new Intl.DateTimeFormat(${JSON.stringify(locale)}, ${JSON.stringify(all)});
return [{ json: { out: ${JSON.stringify(TIMES)}.map((t) => f.format(new Date(t))), parts: f.formatToParts(new Date(${TIMES[0]})).map((p) => p.value).join('') } }];`;
		const f = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...all });
		expect(run(code)).toEqual([{ out: TIMES.map((t) => f.format(t)), parts: f.format(TIMES[0]) }]);
	});

	it.each(INTL_NUMBERS)('Intl.NumberFormat %s %j', (locale, options) => {
		const code = `const f = new Intl.NumberFormat(${JSON.stringify(locale)}, ${JSON.stringify(options)});
return [{ json: { out: ${JSON.stringify(NUMBERS)}.map((n) => f.format(n)), text: (1234.5).toLocaleString(${JSON.stringify(locale)}, ${JSON.stringify(options)}) } }];`;
		const f = new Intl.NumberFormat(locale, options);
		expect(run(code)).toEqual([{ out: NUMBERS.map((n) => f.format(n)), text: f.format(1234.5) }]);
	});

	it('gives the specs of the table for a combination of the table', () => {
		const key = '["toLocaleDateString","en-US",{"day":"numeric","month":"long","year":"numeric"}]';
		const table = LOCALE_TABLE[key];
		const derived = deriveLocaleEntry('toLocaleDateString', 'en-US', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
		expect(derived.date?.p).toEqual(table.date?.p);
	});

	it.each([
		['an option that the helpers do not have', 'en-US', { timeZoneName: 'short' }],
		['an era', 'en-US', { era: 'long', year: 'numeric' }],
		['a calendar that is not Gregorian', 'th-TH-u-ca-buddhist', {}],
		['a locale that Node.js refuses', 'not a locale', {}],
		['a value that is no text, number or boolean', 'en-US', { month: null }],
	])('has no specs for %s', (_name, locale, options) => {
		expect(derivedLocaleEntry('toLocaleDateString', locale, options)).toBeUndefined();
	});

	it('has no specs when the helpers do not give the text of Node.js', () => {
		// Arabic text has marks and digits that the date helper does not write.
		expect(derivedLocaleEntry('toLocaleString', 'ar-EG', { dateStyle: 'medium' })).toBeUndefined();
		expect(
			derivedLocaleEntry('NumberFormat', 'ja-JP', {
				style: 'currency',
				currency: 'JPY',
				currencyDisplay: 'code',
			}),
		).toBeUndefined();
	});

	it('formats a value that is no Date for certain in code that makes dates', () => {
		const code = `const stamp = new Date(1700000000000).toISOString();
let total = 0;
var count;
count = 3;
for (const n of [1200.5, 30, 4]) total += n;
total = total * 2;
const rate = count > 2 ? 0.25 : 1;
const fallback = Number('x') || 1234567;
let label = 'a';
label = label + 'b';
return [{ json: { stamp, total: total.toLocaleString('en-US'), rate: rate.toLocaleString('de-DE'), fallback: fallback.toLocaleString('en-GB'), count: count.toLocaleString(), label: label.toLocaleString() } }];`;
		expect(run(code)).toEqual([
			{
				stamp: '2023-11-14T22:13:20.000Z',
				total: (2469).toLocaleString('en-US'),
				rate: (0.25).toLocaleString('de-DE'),
				fallback: (1234567).toLocaleString('en-GB'),
				count: (3).toLocaleString(),
				label: 'ab',
			},
		]);
	});

	it.each([
		[
			'a variable that gets a Date later',
			'let v = 1; v = new Date(0); return [{ json: { t: v.toLocaleString() } }];',
		],
		[
			'a variable from a pattern',
			'let v = 1; [v] = [new Date(0)]; return [{ json: { t: v.toLocaleString() } }];',
		],
		[
			'one of two values of unknown kind',
			'const f = (x) => x; const v = f(1) || 2; const d = new Date(0); return [{ json: { t: v.toLocaleString(), d } }];',
		],
	])('keeps %s in the host', (_name, code) => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(t.ok ? [] : t.blockers.map((b) => b.feature)).toContain(
			'Date: toLocaleString of a value of unknown kind',
		);
	});

	it('reads the options of a constant that only formatting calls get', () => {
		const code = `const zone = 'Europe/Berlin';
const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: zone };
const short = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone };
const money = { style: 'currency', currency: 'EUR' };
const when = new Date(${TIMES[0]});
const f = new Intl.DateTimeFormat('de-DE', short);
return [{ json: { day: when.toLocaleDateString('de-DE', options), again: new Date(${TIMES[1]}).toLocaleDateString('de-DE', options), time: f.format(when), sum: new Intl.NumberFormat('de-DE', money).format(1234.5) } }];`;
		const options = {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'Europe/Berlin',
		} as const;
		expect(run(code)).toEqual([
			{
				day: new Date(TIMES[0]).toLocaleDateString('de-DE', options),
				again: new Date(TIMES[1]).toLocaleDateString('de-DE', options),
				time: new Intl.DateTimeFormat('de-DE', {
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
					timeZone: 'Europe/Berlin',
				}).format(TIMES[0]),
				sum: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5),
			},
		]);
	});

	it.each([
		[
			'options that the code changes',
			"const o = { month: 'long' }; o.year = 'numeric'; return [{ json: { t: new Date(0).toLocaleDateString('en-US', o) } }];",
		],
		[
			'options that another function gets',
			"const o = { month: 'long' }; const f = (x) => x; f(o); return [{ json: { t: new Date(0).toLocaleDateString('en-US', o) } }];",
		],
		[
			'options in a variable that can change',
			"let o = { month: 'long' }; return [{ json: { t: new Date(0).toLocaleDateString('en-US', o) } }];",
		],
		[
			'options with a spread',
			"const base = { month: 'long' }; return [{ json: { t: new Date(0).toLocaleDateString('en-US', { ...base }) } }];",
		],
	])('keeps %s in the host', (_name, code) => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(t.ok ? [] : t.blockers.map((b) => b.feature)).toContain(
			'locale formatting with computed options',
		);
	});

	it('keeps a call that the helpers cannot format in the host', () => {
		const t = translateCode({
			code: "return [{ json: { t: new Date(0).toLocaleString('en-US', { timeZoneName: 'short' }) } }];",
			mode: 'all',
			kind: 'code',
			hasNode: () => false,
		});
		expect(t.ok ? [] : t.blockers.map((b) => b.feature)).toEqual([
			'locale formatting outside the table',
		]);
	});
});
