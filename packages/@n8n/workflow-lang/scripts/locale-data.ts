/**
 * Writes `src/convert/code-native/locale-data.generated.ts`: the date and
 * number specs of the locale formatting helpers (`locale-helpers.ts`) for the
 * combinations of `locale-combos.json` (method, locale, options without the
 * time zone, ranked by how often workflows use them).
 *
 * Each spec comes from the ICU data of this Node.js. The script then formats
 * many dates and numbers with the helpers and with Node.js, and keeps a spec
 * only when every result is the same. The output depends only on the ICU
 * version, which the header names.
 *
 * Run: node scripts/locale-data.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

import { LOCALE_HELPERS } from '../src/convert/code-native/locale-helpers.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'convert', 'code-native');

type Options = Record<string, string | number | boolean>;
type Combo = [string, string | null, Options];
type Part = [string, string];

interface DateSpec {
	p: Part[];
	m?: number;
	w?: number;
	ap?: number;
	hc?: string;
	dg?: string;
}

interface NumSpec {
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

// ---- the helpers, as JavaScript -------------------------------------------------

function loadHelpers(): {
	dateParts: (spec: unknown, t: number, offset: number) => Array<{ value: string }>;
	numberParts: (spec: unknown, x: unknown) => Array<{ value: string }>;
} {
	const order = ['localeDigits', 'dateParts', 'decimalDigits', 'numberParts'];
	const source = order.map((n) => LOCALE_HELPERS[n].source).join('\n');
	const js = ts.transpileModule(`type Json = any;\n${source}\nexport { dateParts, numberParts };`, {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
	}).outputText;
	const mod = { exports: {} as Record<string, unknown> };
	runInNewContext(js, { module: mod, exports: mod.exports, Date });
	return mod.exports as never;
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
function effective(method: string, o: Options): Options {
	const required =
		method === 'toLocaleDateString' ? 'date' : method === 'toLocaleTimeString' ? 'time' : 'any';
	const defaults =
		method === 'toLocaleDateString' || method === 'DateTimeFormat'
			? 'date'
			: method === 'toLocaleTimeString'
				? 'time'
				: 'all';
	const out: Options = { ...o };
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

function nameIndex(names: string[][], list: string[]): number {
	const key = JSON.stringify(list);
	const at = names.findIndex((n) => JSON.stringify(n) === key);
	if (at >= 0) return at;
	names.push(list);
	return names.length - 1;
}

function dateSpec(locale: string, o: Options, names: string[][]): DateSpec | null {
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
		spec.m = nameIndex(
			names,
			Array.from(
				{ length: 12 },
				(_, k) =>
					f.formatToParts(Date.UTC(2024, k, 15, 12)).find((x) => x.type === 'month')?.value ?? '',
			),
		);
	}
	if (fields.has('weekday')) {
		// 2024-03-03 is a Sunday.
		spec.w = nameIndex(
			names,
			Array.from(
				{ length: 7 },
				(_, k) =>
					f.formatToParts(Date.UTC(2024, 2, 3 + k, 12)).find((x) => x.type === 'weekday')?.value ??
					'',
			),
		);
	}
	if (fields.has('dayPeriod')) {
		spec.ap = nameIndex(
			names,
			[3, 15].map(
				(h) =>
					f.formatToParts(Date.UTC(2024, 2, 7, h)).find((x) => x.type === 'dayPeriod')?.value ?? '',
			),
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

function numberSpec(locale: string, o: Options): NumSpec | null {
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

let seed = 42;
const rand = () => {
	seed = (seed * 1103515245 + 12345) % 2147483648;
	return seed / 2147483648;
};

function main() {
	const combos: Combo[] = JSON.parse(readFileSync(join(root, 'locale-combos.json'), 'utf8'));
	const h = loadHelpers();
	const names: string[][] = [];
	const table: Record<string, { date?: DateSpec; num?: NumSpec }> = {};
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
	let kept = 0;
	for (const [method, localeIn, options] of combos) {
		const locale = localeIn ?? 'en-US';
		const key = JSON.stringify([method, localeIn, options]);
		const entry: { date?: DateSpec; num?: NumSpec } = {};
		if (method !== 'NumberFormat') {
			const eff = effective(method, options);
			let spec: DateSpec | null = null;
			try {
				spec = dateSpec(locale, eff, names);
			} catch {
				spec = null;
			}
			if (spec) {
				const resolved = {
					...spec,
					m: spec.m === undefined ? undefined : names[spec.m],
					w: spec.w === undefined ? undefined : names[spec.w],
					ap: spec.ap === undefined ? undefined : names[spec.ap],
				};
				const same = times.every((t) => {
					const want =
						method === 'DateTimeFormat'
							? new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(t)
							: new Date(t)[method as 'toLocaleString']?.call(new Date(t), locale, {
									...options,
									timeZone: 'UTC',
								});
					return (
						h
							.dateParts(resolved, t, 0)
							.map((p) => p.value)
							.join('') === want
					);
				});
				if (same) entry.date = spec;
			}
		}
		if (method === 'NumberFormat' || method === 'toLocaleString') {
			const spec = numberSpec(locale, options);
			if (spec) {
				const f = new Intl.NumberFormat(locale, options);
				const same = values.every(
					(v) =>
						h
							.numberParts(spec, v)
							.map((p) => p.value)
							.join('') === f.format(v),
				);
				if (same) entry.num = spec;
			}
		}
		if (entry.date || entry.num) {
			table[key] = entry;
			kept++;
		}
	}
	const out = `/**
 * Generated by \`node scripts/locale-data.ts\` from \`locale-combos.json\`
 * with the ICU data of Node.js ${process.versions.node} (ICU ${process.versions.icu},
 * CLDR ${process.versions.cldr ?? '?'}, Unicode ${process.versions.unicode}). Do not edit.
 *
 * Each key is \`[method, locale, options without timeZone]\` as JSON. \`m\`,
 * \`w\` and \`ap\` of a date spec are indexes in \`LOCALE_NAMES\`.
 */
/* eslint-disable */
export const LOCALE_NAMES: string[][] = ${JSON.stringify(names)};

export const LOCALE_TABLE: Record<string, { date?: Record<string, unknown>; num?: Record<string, unknown> }> = ${JSON.stringify(table)};
`;
	writeFileSync(join(root, 'locale-data.generated.ts'), out);
	console.log(`${kept} of ${combos.length} combinations kept, ${names.length} name lists`);
}

main();
