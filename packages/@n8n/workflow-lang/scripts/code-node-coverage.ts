/**
 * Measures which Code, Function and Function Item nodes run natively
 * (`src/convert/code-native/`) and which ones stay in the fallback host, and
 * why. It prints Markdown tables with aggregates only; it never prints code.
 *
 * Input: JSON Lines files of code nodes, one object per line:
 * `{ type, mode, lang, code, count? , runs? }`. `count` weights a node by the
 * number of nodes with the same code (a corpus), `runs` by its runs in a
 * reference execution. Extract them from your workflow data first.
 *
 * Run: node scripts/code-node-coverage.ts <nodes.jsonl> [--weight count|runs]
 *        [--sample N] [--seed S] [--json out.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { attemptNative } from '../src/convert/code-native/index.ts';
import { FEATURE_GROUPS, features } from './code-node-features.ts';

interface Row {
	type: string;
	mode: string;
	lang: string;
	code: string;
	count?: number;
	runs?: number;
}

/** Blockers that only the host can give: native code never has them. */
const HOST_ONLY = new Set([
	'require',
	'Buffer',
	'crypto',
	'fetch',
	'process',
	'this (this.helpers)',
	'binary data',
	'$getWorkflowStaticData',
	'$env',
	'$secrets',
	'$evaluateExpression',
	'$fromAI',
	'timers',
	'syntax error',
	'$() of a node that has not run',
	'host pragma',
	'language',
]);

/** Blockers that need a large extension (a regex engine, Luxon). */
const LARGE = new Set(['regular expression', 'Luxon ($now, $today, DateTime)', '$jmespath']);

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(name);
	return i >= 0 ? process.argv[i + 1] : undefined;
}

function rng(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function parametersOf(r: Row): Record<string, unknown> {
	if (r.type === 'n8n-nodes-base.code') {
		return {
			language: r.lang,
			mode: r.mode,
			jsCode: r.lang === 'javaScript' ? r.code : undefined,
			pythonCode: r.lang === 'javaScript' ? undefined : r.code,
		};
	}
	return { functionCode: r.code };
}

/**
 * Families of blockers: the compiler reports the methods of a missing class
 * (`.has()` of a Set, `.toFormat()` of Luxon) besides the class itself. A
 * family unlocks a node when all its blockers are in the family.
 */
const FAMILIES: Array<[string, RegExp]> = [
	[
		'regular expressions',
		/^regular expression|^\.(test|match|matchAll|exec|search)\(\)$|^replace with a callback$|^RegExp|without a regular expression$|^match properties/,
	],
	['Set / Map', /^Set \/ Map$|^\.(has|add|set|get|delete|keys|values|entries|size|clear)\(\)$/],
	[
		'Luxon',
		/^Luxon|^\.(toFormat|setZone|plus|minus|toISO|toISODate|startOf|endOf|diff|toMillis|toJSDate|setLocale|fromISO|fromFormat|toRelative|weekday|toSQL|toUnixInteger)\(\)$|^DateTime/,
	],
	[
		'locale formatting (Intl, toLocale*, localeCompare)',
		/^Intl$|^Date: locale|^localeCompare with|^\.(toLocaleString|toLocaleDateString|toLocaleTimeString|format|formatToParts|localeCompare|resolvedOptions)\(\)$/,
	],
	[
		'crypto / Buffer / require',
		/^require$|^Buffer$|^crypto$|^\.(update|digest|createHash|createHmac|randomUUID|toString\(\)|from)\(\)$/,
	],
	[
		'this.helpers / binary data',
		/^this|^binary data$|^\.(httpRequest|getBinaryDataBuffer|prepareBinaryData|call|httpRequestWithAuthentication|binaryToString)\(\)$/,
	],
	[
		"$('Node') forms",
		/^\$\(\)|^\$ as a value|^\$items|^\$\('…'\)|^\$node|^\.(all|first|last|itemMatching)\(\)$|^\$$/,
	],
	[
		'Date values in untyped places',
		/^Date: |^\.(getTime|toISOString|getMonth|getDate|getFullYear|getDay|getHours|getMinutes|getSeconds|getUTCFullYear|getUTCMonth|getUTCDate|getUTCHours|setDate|setHours|setMonth|setFullYear|toDateString|getTimezoneOffset|setMinutes|setSeconds|valueOf|setTime|getUTCDay|toUTCString|setUTCHours|getMilliseconds)\(\)$|^type error TS236[23]$/,
	],
	['Promise / async', /^Promise$|^timers$|^WL010$/],
];

function familyOf(b: string): string {
	for (const [name, re] of FAMILIES) if (re.test(b)) return name;
	return b;
}

/** A short key for a blocker, so method names group well. */
function blockerKey(feature: string): string {
	const m = /^WL020 The method `([^`]+)` is not in the workflow library\.$/.exec(feature);
	if (m) return `.${m[1]}()`;
	const g = /^WL020 `([^`]+)` is not in the workflow library\.$/.exec(feature);
	if (g) return g[1];
	return feature;
}

export interface Outcome {
	weight: number;
	native: boolean;
	blockers: string[];
	tier: 'native' | 'small' | 'large' | 'host';
	features: string[];
	mode: string;
	lang: string;
	type: string;
	length: number;
}

function tierOf(native: boolean, blockers: string[]): Outcome['tier'] {
	if (native) return 'native';
	if (blockers.some((b) => HOST_ONLY.has(b))) return 'host';
	if (blockers.some((b) => LARGE.has(b))) return 'large';
	return 'small';
}

function main() {
	const file = process.argv[2];
	if (!file) throw new Error('usage: code-node-coverage.ts <nodes.jsonl>');
	const weightBy = arg('--weight') ?? 'count';
	const sample = Number(arg('--sample') ?? '0');
	const random = rng(Number(arg('--seed') ?? '1'));
	let rows: Row[] = readFileSync(file, 'utf8')
		.split('\n')
		.filter((l) => l.trim() !== '')
		.map((l): Row => JSON.parse(l));
	const weightOf = (r: Row) => (weightBy === 'runs' ? (r.runs ?? 0) : (r.count ?? 1));
	if (sample > 0) {
		// Sample node instances, so the sample keeps the weights of the corpus.
		const cumulative: number[] = [];
		let total = 0;
		for (const r of rows) {
			total += weightOf(r);
			cumulative.push(total);
		}
		const picked = new Map<number, number>();
		for (let k = 0; k < sample; k++) {
			const x = random() * total;
			let lo = 0;
			let hi = cumulative.length - 1;
			while (lo < hi) {
				const mid = (lo + hi) >> 1;
				if (cumulative[mid] > x) hi = mid;
				else lo = mid + 1;
			}
			picked.set(lo, (picked.get(lo) ?? 0) + 1);
		}
		rows = [...picked].map(([i, n]) => ({ ...rows[i], count: n, runs: n }));
	}
	const outcomes: Outcome[] = [];
	const started = Date.now();
	rows.forEach((r, k) => {
		const weight = weightOf(r);
		const isJs = r.lang === 'javaScript';
		const f = isJs ? features(r.code) : { features: new Set<string>(), methods: new Set<string>() };
		let native = false;
		let blockers: string[] = [];
		if (!isJs) blockers = ['language'];
		else {
			const a = attemptNative(r.type, parametersOf(r), () => true, true);
			native = a.ok;
			if (!a.ok) blockers = [...new Set(a.blockers.map((b) => blockerKey(b.feature)))];
		}
		outcomes.push({
			weight,
			native,
			blockers,
			tier: tierOf(native, blockers),
			features: [...f.features],
			mode: r.mode,
			lang: r.lang,
			type: r.type,
			length: r.code.length,
		});
		if (k % 500 === 0) {
			process.stderr.write(`${k}/${rows.length} ${Math.round((Date.now() - started) / 1000)}s\n`);
		}
	});
	const json = arg('--json');
	if (json) writeFileSync(json, JSON.stringify(outcomes));
	process.stdout.write(report(outcomes));
}

function pct(n: number, d: number): string {
	return d === 0 ? '0.0%' : `${((100 * n) / d).toFixed(1)}%`;
}

/** The Markdown tables of a list of outcomes. */
export function report(outcomes: Outcome[]): string {
	const total = outcomes.reduce((s, o) => s + o.weight, 0);
	const sum = (pred: (o: Outcome) => boolean) =>
		outcomes.filter(pred).reduce((s, o) => s + o.weight, 0);
	const lines: string[] = [];
	lines.push(`Total weight: ${total} (${outcomes.length} distinct codes)`, '');
	lines.push('| Group | Value | Share |', '|---|---|---|');
	for (const [label, pred] of [
		['type code', (o: Outcome) => o.type === 'n8n-nodes-base.code'],
		['type function', (o: Outcome) => o.type === 'n8n-nodes-base.function'],
		['type functionItem', (o: Outcome) => o.type === 'n8n-nodes-base.functionItem'],
		['JavaScript', (o: Outcome) => o.lang === 'javaScript'],
		['Python', (o: Outcome) => o.lang !== 'javaScript'],
		['all items', (o: Outcome) => o.mode !== 'runOnceForEachItem'],
		['each item', (o: Outcome) => o.mode === 'runOnceForEachItem'],
	] as const) {
		lines.push(`| ${label} | ${sum(pred)} | ${pct(sum(pred), total)} |`);
	}
	const lengths = outcomes
		.flatMap((o) => Array.from({ length: Math.min(o.weight, 50) }, () => o.length))
		.sort((a, b) => a - b);
	const q = (p: number) => lengths[Math.floor(p * (lengths.length - 1))] ?? 0;
	lines.push('', `Length (characters): median ${q(0.5)}, p75 ${q(0.75)}, p90 ${q(0.9)}`, '');

	lines.push('| Tier | Weight | Share |', '|---|---|---|');
	for (const t of ['native', 'small', 'large', 'host'] as const) {
		lines.push(
			`| ${t} | ${sum((o) => o.tier === t)} | ${pct(
				sum((o) => o.tier === t),
				total,
			)} |`,
		);
	}
	lines.push('');

	for (const [group, list] of Object.entries(FEATURE_GROUPS)) {
		lines.push(`| ${group} | Weight | Share |`, '|---|---|---|');
		for (const f of list) {
			const w = sum((o) => o.features.includes(f));
			lines.push(`| ${f} | ${w} | ${pct(w, total)} |`);
		}
		lines.push('');
	}

	const blocked = new Map<string, { blocks: number; only: number }>();
	for (const o of outcomes) {
		for (const b of o.blockers) {
			const e = blocked.get(b) ?? { blocks: 0, only: 0 };
			e.blocks += o.weight;
			if (o.blockers.length === 1) e.only += o.weight;
			blocked.set(b, e);
		}
	}
	const fam = new Map<string, { blocks: number; only: number }>();
	for (const o of outcomes) {
		const fs = new Set(o.blockers.filter((b) => b !== 'new').map(familyOf));
		for (const f of fs) {
			const e = fam.get(f) ?? { blocks: 0, only: 0 };
			e.blocks += o.weight;
			if (fs.size === 1) e.only += o.weight;
			fam.set(f, e);
		}
	}
	lines.push('| Blocker family | Blocks | Only family (unlocks) |', '|---|---|---|');
	for (const [b, e] of [...fam].sort(
		(x, y) => y[1].only - x[1].only || y[1].blocks - x[1].blocks,
	)) {
		if (e.blocks < total * 0.002) continue;
		lines.push(
			`| ${b} | ${e.blocks} (${pct(e.blocks, total)}) | ${e.only} (${pct(e.only, total)}) |`,
		);
	}
	lines.push('');
	lines.push('| Blocker | Blocks | Only blocker (unlocks) |', '|---|---|---|');
	for (const [b, e] of [...blocked].sort(
		(x, y) => y[1].only - x[1].only || y[1].blocks - x[1].blocks,
	)) {
		if (e.blocks < total * 0.002) continue;
		lines.push(
			`| ${b} | ${e.blocks} (${pct(e.blocks, total)}) | ${e.only} (${pct(e.only, total)}) |`,
		);
	}
	lines.push('');
	return lines.join('\n');
}

if (process.argv[1]?.endsWith('code-node-coverage.ts')) main();
