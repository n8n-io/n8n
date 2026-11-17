/**
 * The date and number specs of the locale formatting helpers (`locale-helpers.ts`) from the
 * ICU data of this Node.js, for one combination of a method, a locale and options.
 *
 * `scripts/locale-data.ts` writes the table of the most used combinations with these
 * functions (`locale-data.generated.ts`). The translator of native code asks for a
 * combination that the table does not have (`derivedLocaleEntry`), so each locale and each
 * set of options that the helpers can format has a native form.
 *
 * A spec is kept only when the helpers give the text of Node.js for many dates and numbers.
 * A spec is the behaviour of one Node.js build (`node-identity.ts`): its ICU data and its
 * V8. So `localeEntry` (`locale-entry.ts`) takes a spec of the table only when the table has the locale identity
 * of the target, and derives a spec only when the target is this process. Each other case
 * keeps the call in the fallback host.
 */
import ts from 'typescript';

import { targetIsProcess } from '../node-identity.ts';
import { LOCALE_HELPERS } from './locale-helpers.ts';

export type LocaleOptions = Record<string, string | number | boolean>;
type Part = [string, string];

export interface DateSpec {
	p: Part[];
	m?: string[];
	w?: string[];
	ap?: string[];
	hc?: string;
	dg?: string;
}

export interface NumSpec {
	min: number;
	max: number;
	int: number;
	g: [number, number, number] | null;
	dec: string;
	grp: string;
	pre: [Part[], Part[]];
	suf: [Part[], Part[]];
	pct: boolean;
	dg: string | null;
	nan: string;
	inf: string;
}

export interface LocaleEntry {
	date?: DateSpec;
	num?: NumSpec;
	/**
	 * True when `formatToParts` of this Node.js does not give the parts of the helpers, while
	 * `format` gives their text. V8 before 14 writes a space for U+202F in the text of a date
	 * and keeps U+202F in the parts.
	 */
	split?: true;
}

interface HelperPart {
	type: string;
	value: string;
}

interface Helpers {
	dateParts: (spec: unknown, t: number, offset: number) => HelperPart[];
	numberParts: (spec: unknown, x: unknown) => HelperPart[];
}

const partsText = (parts: HelperPart[]): string => parts.map((p) => p.value).join('');

function sameParts(ours: HelperPart[], theirs: Array<{ type: string; value: string }>): boolean {
	return (
		ours.length === theirs.length &&
		ours.every((p, k) => p.type === theirs[k].type && p.value === theirs[k].value)
	);
}

let helpers: Helpers | undefined;

/** The helpers as JavaScript: the subset source of `LOCALE_HELPERS` without its types. */
function loadHelpers(): Helpers {
	if (helpers) return helpers;
	const order = ['localeDigits', 'dateParts', 'decimalDigits', 'numberParts'];
	const source = order.map((n) => LOCALE_HELPERS[n].source).join('\n');
	const js = ts.transpileModule(`type Json = any;\n${source}\nreturn { dateParts, numberParts };`, {
		compilerOptions: { target: ts.ScriptTarget.ES2022 },
	}).outputText;
	// The text is the helper source of this package, not text of a workflow.
	// oxlint-disable-next-line typescript/no-implied-eval, no-new-func
	const make = new Function('Date', js) as (date: DateConstructor) => Helpers;
	helpers = make(Date);
	return helpers;
}

// ---- dates ------------------------------------------------------------------------

const DATE_FIELDS = [
	'weekday',
	'era',
	'year',
	'month',
	'day',
	'dayPeriod',
	'hour',
	'minute',
	'second',
	'fractionalSecondDigits',
];

/** ToDateTimeOptions of ECMA-402: the defaults of each Date method. */
function effective(method: string, o: LocaleOptions): LocaleOptions {
	const required =
		method === 'toLocaleDateString' ? 'date' : method === 'toLocaleTimeString' ? 'time' : 'any';
	const defaults =
		method === 'toLocaleDateString' || method === 'DateTimeFormat'
			? 'date'
			: method === 'toLocaleTimeString'
				? 'time'
				: 'all';
	const out: LocaleOptions = { ...o };
	let need = true;
	if (
		(required === 'date' || required === 'any') &&
		['weekday', 'year', 'month', 'day'].some((k) => k in o)
	)
		need = false;
	if (
		(required === 'time' || required === 'any') &&
		['dayPeriod', 'hour', 'minute', 'second', 'fractionalSecondDigits'].some((k) => k in o)
	)
		need = false;
	if ('dateStyle' in o || 'timeStyle' in o) need = false;
	if (need && (defaults === 'date' || defaults === 'all'))
		Object.assign(out, { year: 'numeric', month: 'numeric', day: 'numeric' });
	if (need && (defaults === 'time' || defaults === 'all'))
		Object.assign(out, { hour: 'numeric', minute: 'numeric', second: 'numeric' });
	return out;
}

const DATE_OPTIONS = new Set([
	...DATE_FIELDS,
	'hour12',
	'hourCycle',
	'dateStyle',
	'timeStyle',
	'timeZone',
]);

function dateSpec(locale: string, o: LocaleOptions): DateSpec | null {
	for (const k of Object.keys(o)) if (!DATE_OPTIONS.has(k) || k === 'era') return null;
	const f = new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' });
	const ro = f.resolvedOptions();
	if (ro.calendar !== 'gregory') return null;
	const probe = Date.UTC(2024, 2, 7, 15, 4, 5, 678);
	const parts = f.formatToParts(probe);
	const spec: DateSpec = { p: [] };
	const fields = new Map<string, string>();
	for (const p of parts) {
		if (p.type === 'literal') {
			spec.p.push(['literal', p.value]);
			continue;
		}
		let style = '';
		switch (p.type) {
			case 'year':
				style = p.value.length === 2 ? '2' : 'n';
				break;
			case 'month':
				style =
					/^\d+$/.test(p.value) || ro.numberingSystem !== 'latn'
						? p.value.length === 2
							? '2'
							: 'n'
						: 't';
				break;
			case 'day':
			case 'hour':
			case 'minute':
			case 'second':
				style = p.value.length === 2 && !p.value.startsWith('1') ? '2' : 'n';
				break;
			case 'fractionalSecond':
				style = String(p.value.length);
				break;
			case 'weekday':
			case 'dayPeriod':
				style = 't';
				break;
			default:
				return null;
		}
		fields.set(p.type, style);
		spec.p.push([p.type, style]);
	}
	// Two-digit fields: a value below 10 shows the difference.
	const small = f.formatToParts(Date.UTC(2024, 0, 5, 3, 4, 5, 6));
	for (const part of spec.p) {
		if (!['day', 'hour', 'minute', 'second', 'month'].includes(part[0]) || part[1] === 't')
			continue;
		const v = small.find((x) => x.type === part[0])?.value ?? '';
		part[1] = v.length === 2 ? '2' : 'n';
	}
	if (fields.get('month') === 't') {
		spec.m = Array.from(
			{ length: 12 },
			(_, k) =>
				f.formatToParts(Date.UTC(2024, k, 15, 12)).find((x) => x.type === 'month')?.value ?? '',
		);
	}
	if (fields.has('weekday')) {
		// 2024-03-03 is a Sunday.
		spec.w = Array.from(
			{ length: 7 },
			(_, k) =>
				f.formatToParts(Date.UTC(2024, 2, 3 + k, 12)).find((x) => x.type === 'weekday')?.value ??
				'',
		);
	}
	if (fields.has('dayPeriod')) {
		spec.ap = [3, 15].map(
			(h) =>
				f.formatToParts(Date.UTC(2024, 2, 7, h)).find((x) => x.type === 'dayPeriod')?.value ?? '',
		);
	}
	if (fields.has('hour')) spec.hc = ro.hourCycle ?? 'h23';
	if (ro.numberingSystem !== 'latn') {
		spec.dg = new Intl.NumberFormat(`${locale}-u-nu-${ro.numberingSystem}`, { useGrouping: false })
			.format(1234567890)
			.replace(/(.)(.*)/u, '$2$1');
	}
	return spec;
}

// ---- numbers ----------------------------------------------------------------------

const NUMBER_OPTIONS = new Set([
	'style',
	'currency',
	'currencyDisplay',
	'minimumFractionDigits',
	'maximumFractionDigits',
	'minimumIntegerDigits',
	'useGrouping',
]);

function affixes(parts: Intl.NumberFormatPart[]): [Part[], Part[]] {
	const isNum = (t: string) =>
		['integer', 'group', 'decimal', 'fraction', 'nan', 'infinity'].includes(t);
	const first = parts.findIndex((p) => isNum(p.type));
	let last = parts.length - 1;
	while (last >= 0 && !isNum(parts[last].type)) last--;
	const toPart = (p: Intl.NumberFormatPart): Part => [p.type, p.value];
	return [parts.slice(0, first).map(toPart), parts.slice(last + 1).map(toPart)];
}

function numberSpec(locale: string, o: LocaleOptions): NumSpec | null {
	for (const k of Object.keys(o)) if (!NUMBER_OPTIONS.has(k)) return null;
	let f: Intl.NumberFormat;
	try {
		f = new Intl.NumberFormat(locale, o);
	} catch {
		return null;
	}
	const ro = f.resolvedOptions();
	if (ro.notation !== 'standard' || ro.minimumSignificantDigits !== undefined) return null;
	const pos = affixes(f.formatToParts(1234567.891));
	const neg = affixes(f.formatToParts(-1234567.891));
	const ints = f
		.formatToParts(1234567890123)
		.filter((p) => p.type === 'integer')
		.map((p) => p.value);
	let g: [number, number, number] | null = null;
	if (ints.length > 1) {
		const g1 = ints[ints.length - 1].length;
		const g2 = ints[ints.length - 2].length;
		const small = f.formatToParts(10 ** g1).filter((p) => p.type === 'group').length;
		g = [g1, g2, small > 0 ? 1 : 2];
	}
	const dec =
		new Intl.NumberFormat(locale, { ...o, minimumFractionDigits: 1, maximumFractionDigits: 1 })
			.formatToParts(1.5)
			.find((p) => p.type === 'decimal')?.value ?? '.';
	const grp = f.formatToParts(1234567890123).find((p) => p.type === 'group')?.value ?? ',';
	const digits = new Intl.NumberFormat(locale, { useGrouping: false }).format(1234567890);
	return {
		min: ro.minimumFractionDigits ?? 0,
		max: ro.maximumFractionDigits ?? 3,
		int: ro.minimumIntegerDigits ?? 1,
		g,
		dec,
		grp,
		pre: [pos[0], neg[0]],
		suf: [pos[1], neg[1]],
		pct: ro.style === 'percent',
		dg: digits === '1234567890' ? null : digits.slice(-1) + digits.slice(0, -1),
		nan: f.formatToParts(NaN).find((p) => p.type === 'nan')?.value ?? 'NaN',
		inf: f.formatToParts(Infinity).find((p) => p.type === 'infinity')?.value ?? '∞',
	};
}

// ---- checks against Node.js ---------------------------------------------------------

let samples: { times: number[]; values: number[] } | undefined;

/** The dates and numbers of the check: fixed ones and a fixed pseudo-random list. */
function checkSamples(): { times: number[]; values: number[] } {
	if (samples) return samples;
	let seed = 42;
	const rand = () => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed / 2147483648;
	};
	const times: number[] = [
		Date.UTC(2024, 0, 1),
		Date.UTC(2024, 11, 31, 23, 59, 59, 999),
		Date.UTC(2000, 1, 29, 12),
	];
	for (let k = 0; k < 600; k++) times.push(Math.floor(rand() * 3_155_760_000_000));
	const values: number[] = [
		0,
		-0,
		1,
		-1,
		0.5,
		1.005,
		2.675,
		0.125,
		1234.5,
		-1234.565,
		1e21,
		1e-7,
		123456789.987654,
		NaN,
		Infinity,
		-Infinity,
		0.07,
		99.995,
	];
	for (let k = 0; k < 600; k++) {
		const scale = 10 ** Math.floor(rand() * 9 - 2);
		const v = (rand() - 0.3) * scale;
		values.push(k % 3 === 0 ? Math.round(v * 1000) / 1000 : k % 3 === 1 ? Math.round(v) : v);
	}
	samples = { times, values };
	return samples;
}

/**
 * The specs of one combination: `method` is `toLocaleString`, `toLocaleDateString`,
 * `toLocaleTimeString`, `DateTimeFormat` or `NumberFormat`; `locale` null is the default
 * locale (`en-US`); `options` has no time zone. A spec that does not give the text of
 * Node.js for each sample is left out.
 */
export function deriveLocaleEntry(
	method: string,
	localeIn: string | null,
	options: LocaleOptions,
): LocaleEntry {
	const locale = localeIn ?? 'en-US';
	const h = loadHelpers();
	const { times, values } = checkSamples();
	const entry: LocaleEntry = {};
	if (method !== 'NumberFormat') {
		const eff = effective(method, options);
		let spec: DateSpec | null = null;
		try {
			spec = dateSpec(locale, eff);
		} catch {
			spec = null;
		}
		if (spec) {
			const zoned = { ...options, timeZone: 'UTC' };
			const format = new Intl.DateTimeFormat(locale, zoned);
			const want = (t: number): string | undefined =>
				method === 'DateTimeFormat'
					? format.format(t)
					: new Date(t)[method as 'toLocaleString']?.call(new Date(t), locale, zoned);
			const gives = (candidate: DateSpec) =>
				times.every((t) => partsText(h.dateParts(candidate, t, 0)) === want(t));
			// V8 writes a space for U+202F in the text of a date. Before V8 14 the parts keep
			// U+202F, so a spec from the parts needs the same change to give the text.
			const spaced: DateSpec = {
				...spec,
				p: spec.p.map(
					([type, value]): Part => [type, type === 'literal' ? value.replaceAll(' ', ' ') : value],
				),
			};
			const found = gives(spec) ? spec : gives(spaced) ? spaced : null;
			if (found) {
				entry.date = found;
				if (
					method === 'DateTimeFormat' &&
					!times.every((t) => sameParts(h.dateParts(found, t, 0), format.formatToParts(t)))
				) {
					entry.split = true;
				}
			}
		}
	}
	if (method === 'NumberFormat' || method === 'toLocaleString') {
		const spec = numberSpec(locale, options);
		if (spec) {
			const f = new Intl.NumberFormat(locale, options);
			if (values.every((v) => partsText(h.numberParts(spec, v)) === f.format(v))) {
				entry.num = spec;
				if (
					method === 'NumberFormat' &&
					!values.every((v) => sameParts(h.numberParts(spec, v), f.formatToParts(v)))
				) {
					entry.split = true;
				}
			}
		}
	}
	return entry;
}

/** An entry as the table has it (`LOCALE_TABLE`), with the name lists in the date spec. */
export interface TableEntry {
	date?: Record<string, unknown>;
	num?: Record<string, unknown>;
	split?: true;
}

/** The largest number of combinations that `derivedLocaleEntry` keeps. */
const MAX_DERIVED = 4096;
const derived = new Map<string, TableEntry | undefined>();

/**
 * The specs of a combination from this process, or undefined: the helpers cannot format it,
 * the locale or an option is not valid, or the target is not this process (`node-identity.ts`).
 *
 * A derivation formats about 600 dates or numbers with Node.js and with the helpers. The
 * result stays for the life of the process, for at most `MAX_DERIVED` combinations.
 */
export function derivedLocaleEntry(
	method: string,
	locale: string | null,
	options: Record<string, unknown>,
): TableEntry | undefined {
	if (!targetIsProcess()) return undefined;
	const key = JSON.stringify([method, locale, options]);
	if (derived.has(key)) return derived.get(key);
	const plain: LocaleOptions = {};
	let fits = true;
	for (const [k, v] of Object.entries(options)) {
		if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') plain[k] = v;
		else fits = false;
	}
	let entry: TableEntry | undefined;
	try {
		const found = fits ? deriveLocaleEntry(method, locale, plain) : {};
		if (found.date !== undefined || found.num !== undefined) {
			entry = {
				...(found.date ? { date: { ...found.date } } : {}),
				...(found.num ? { num: { ...found.num } } : {}),
				...(found.split ? { split: true as const } : {}),
			};
		}
	} catch {
		// A locale or an option that Node.js refuses: v1 fails there, in the host.
		entry = undefined;
	}
	if (derived.size >= MAX_DERIVED) derived.clear();
	derived.set(key, entry);
	return entry;
}
