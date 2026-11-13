/**
 * Runs each Code node that compiles natively both ways, natively (the
 * bytecode VM of `src/testing/vm.ts`, optionally also `wfrt run`) and in the
 * fallback host (`runCodeStep` of the built host), on the same input items,
 * and compares the results. It prints aggregates only; it never prints code.
 *
 * Input: a directory of bundles, each with `workflow.json` and an optional
 * `expected.json` (`{ nodes: { <name>: { keys, outputs } } }`) that gives the
 * keys and item counts of the reference run. The script makes synthetic items
 * with these keys: the bundles have no item data. Each node runs with several
 * input variants (typed values, text values, missing keys).
 *
 * Run: node scripts/code-node-equivalence.ts <bundles dir> [--wfrt <path>]
 *        [--only <bundle>] [--details out.json]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { encodeModule } from '../src/compiler/module.ts';
import { sha256 } from '../src/compiler/sha256.ts';
import { checkTranslation } from '../src/convert/code-native/check.ts';
import { codeOf } from '../src/convert/code-native/index.ts';
import { translateCode } from '../src/convert/code-native/translate.ts';
import { allItemsCode, eachItemCode } from '../src/convert/code-node.ts';
import { hostRunners } from '../src/convert/__tests__/behaviour/compare.ts';
import { useUtc } from '../src/reference/runner.ts';
import { runModule } from '../src/testing/vm.ts';

const NOW = 1_700_000_000_000;

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(name);
	return i >= 0 ? process.argv[i + 1] : undefined;
}

interface NodeInfo {
	keys: string[];
	count: number;
}

/** A value for a key, by the name of the key. Variant 0 is typed, 1 is text, 2 leaves keys out. */
function valueFor(key: string, i: number, variant: number): unknown {
	const k = key.toLowerCase();
	if (variant === 2 && i % 2 === 1 && !k.includes('id')) return undefined;
	if (variant === 1) return `${key} ${i}`;
	if (/date|time|_at$|at$|created|updated|day|start|end|deadline/.test(k))
		return new Date(NOW - i * 86_400_000 * 3).toISOString();
	if (/email|mail/.test(k)) return `user${i}@example.test`;
	if (/phone|tel/.test(k)) return `+4915100000${i}`;
	if (/url|link|href/.test(k)) return `https://example.test/p/${i}`;
	if (/^(is|has)|enabled|active|valid|success|ok$/.test(k)) return i % 2 === 0;
	if (/count|amount|price|total|qty|quantity|number|num|score|age|size|value|sum|rate|cost/.test(k))
		return 10 * (i + 1) + 0.5 * i;
	if (/^id$|_id$|id$/.test(k)) return `${1000 + i}`;
	if (/json|data|body|payload|response|result|output/.test(k))
		return { text: `text ${i}`, id: i, items: [{ name: `n${i}` }] };
	if (/items|list|rows|tags|array|records/.test(k)) return [`a${i}`, `b${i}`];
	if (/name|title|subject/.test(k)) return `Name ${i}`;
	if (/text|message|content|description|note|comment|summary|prompt/.test(k))
		return `Line one ${i}\nLine two, with words.`;
	if (/status|state|type|category|kind/.test(k)) return i % 2 === 0 ? 'active' : 'done';
	return `${key}-${i}`;
}

function itemsFor(info: NodeInfo, variant: number): Array<Record<string, unknown>> {
	const n = Math.max(1, Math.min(info.count, 4));
	return Array.from({ length: n }, (_, i) => {
		const o: Record<string, unknown> = {};
		for (const key of info.keys) {
			const v = valueFor(key, i, variant);
			if (v !== undefined) o[key] = v;
		}
		return o;
	});
}

/** Code that fixes the clock of the host context, as the native fixture does. */
const FIXED_CLOCK = `{
	const R = Date;
	const D = function (...a) {
		if (!new.target) return new R(${NOW}).toString();
		return a.length === 0 ? new R(${NOW}) : new R(...a);
	};
	D.prototype = R.prototype;
	D.now = () => ${NOW};
	D.UTC = R.UTC;
	D.parse = R.parse;
	globalThis.Date = D;
	// Luxon's $now and $today were made before this code ran, with the real clock.
	if (typeof DateTime !== 'undefined') {
		globalThis.$now = DateTime.now();
		globalThis.$today = DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
	}
}
`;

type Outcome = { ok: true; value: unknown } | { ok: false; error: string };

function hostRun(
	code: string,
	mode: 'all' | 'each',
	kind: string,
	input: unknown[],
	nodes: Record<string, unknown[]>,
): Outcome {
	const refs = Object.keys(nodes).length > 0;
	const body =
		mode === 'each' ? eachItemCode(code, refs, kind === 'functionItem') : allItemsCode(code, refs);
	const items = refs ? [...input, { $nodes: nodes }] : input;
	try {
		const value = hostRunners().code({ name: 'code', code: FIXED_CLOCK + body, items });
		return { ok: true, value };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

function nativeRun(data: Parameters<typeof runModule>[0], body: unknown): Outcome {
	const out = runModule(data, { trigger: { body }, now: NOW, seed: 1, effects: {} });
	if (out.status === 'ok') return { ok: true, value: out.result };
	const r = out.result;
	return { ok: false, error: isRecord(r) ? String(r.message) : String(r) };
}

function wfrtRun(bin: string, dir: string, module: Uint8Array, body: unknown): Outcome {
	const m = join(dir, 'm.wfm');
	const f = join(dir, 'f.json');
	writeFileSync(m, module);
	writeFileSync(f, JSON.stringify({ trigger: { body }, now: NOW, seed: 1, effects: {} }));
	const text = execFileSync(bin, ['run', m, f], { encoding: 'utf8' });
	const out: unknown = JSON.parse(text);
	if (!isRecord(out)) return { ok: false, error: 'bad output' };
	if (out.status === 'ok') return { ok: true, value: out.result };
	const r = out.result;
	return { ok: false, error: isRecord(r) ? String(r.message) : String(r) };
}

/** Keys and counts of the result, for code that uses `Math.random()`. */
function shape(o: Outcome): unknown {
	if (!o.ok) return 'error';
	return Array.isArray(o.value)
		? o.value.map((x) => (isRecord(x) ? Object.keys(x) : typeof x))
		: typeof o.value;
}

interface Result {
	bundle: string;
	node: string;
	runs: number;
	verdict:
		| 'same'
		| 'same error'
		| 'different error'
		| 'differ'
		| 'native only fails'
		| 'host only fails';
	random: boolean;
	wfrt?: 'same' | 'differ';
	detail?: string;
}

function main() {
	useUtc();
	const root = process.argv[2];
	if (!root) throw new Error('usage: code-node-equivalence.ts <bundles dir>');
	const only = arg('--only');
	const wfrt = arg('--wfrt');
	const tmp = mkdtempSync(join(tmpdir(), 'code-eq-'));
	const results: Result[] = [];
	for (const bundle of readdirSync(root).sort()) {
		if (only && !bundle.includes(only)) continue;
		const dir = join(root, bundle);
		if (!existsSync(join(dir, 'workflow.json'))) continue;
		const wf: unknown = JSON.parse(readFileSync(join(dir, 'workflow.json'), 'utf8'));
		const expected: unknown = existsSync(join(dir, 'expected.json'))
			? JSON.parse(readFileSync(join(dir, 'expected.json'), 'utf8'))
			: {};
		if (!isRecord(wf) || !Array.isArray(wf.nodes)) continue;
		const exp = isRecord(expected) && isRecord(expected.nodes) ? expected.nodes : {};
		const info = (name: string): NodeInfo => {
			const e = exp[name];
			if (!isRecord(e)) return { keys: [], count: 1 };
			const keys = Array.isArray(e.keys) ? e.keys.filter((k) => typeof k === 'string') : [];
			const outs = Array.isArray(e.outputs) ? e.outputs : [];
			const count = typeof outs[0] === 'number' ? outs[0] : 1;
			return { keys, count };
		};
		const conns = isRecord(wf.connections) ? wf.connections : {};
		const parentOf = (name: string): string | null => {
			for (const [from, types] of Object.entries(conns)) {
				if (!isRecord(types) || !Array.isArray(types.main)) continue;
				for (const list of types.main) {
					if (!Array.isArray(list)) continue;
					for (const c of list) if (isRecord(c) && c.node === name && c.index === 0) return from;
				}
			}
			return null;
		};
		const names = new Set(
			wf.nodes.filter(isRecord).map((n) => (typeof n.name === 'string' ? n.name : '')),
		);
		for (const n of wf.nodes) {
			if (!isRecord(n) || typeof n.type !== 'string' || typeof n.name !== 'string') continue;
			if (n.disabled === true) continue;
			const params = isRecord(n.parameters) ? n.parameters : {};
			const src = codeOf(n.type, params);
			if (!src) continue;
			const others = [...names].filter((x) => x !== n.name && x !== '');
			// The host runs Luxon in the zone of the process (UTC), so the native side does too.
			const tr = translateCode({
				...src,
				hasNode: (x) => names.has(x),
				allNodes: others,
				timezone: 'system',
			});
			if (!tr.ok) continue;
			const checked = checkTranslation(tr.translation, src.mode);
			if (!checked.ok || !checked.compiled.data) continue;
			const data = checked.compiled.data;
			const module = wfrt ? encodeModule(data, sha256) : undefined;
			const e = exp[n.name];
			const runs = isRecord(e) && typeof e.runs === 'number' ? e.runs : 0;
			const parent = parentOf(n.name);
			const inputInfo = parent ? info(parent) : { keys: [], count: 1 };
			const random = /\bMath\s*\.\s*random\b/.test(src.code);
			let verdict: Result['verdict'] = 'same';
			let detail: string | undefined;
			let wfrtVerdict: Result['wfrt'];
			for (let variant = 0; variant < 3; variant++) {
				const input = itemsFor(inputInfo, variant);
				const lists = tr.translation.nodes.map((x) => itemsFor(info(x), variant));
				const all = tr.translation.allNodes.map((x) => itemsFor(info(x), variant));
				const nodes: Record<string, unknown[]> = {};
				tr.translation.nodes.forEach((x, k) => {
					nodes[x] = lists[k];
				});
				tr.translation.allNodes.forEach((x, k) => {
					nodes[x] = all[k];
				});
				const host = hostRun(src.code, src.mode, src.kind, input, nodes);
				const native = nativeRun(data, { input, nodes: lists, all });
				if (wfrt && module) {
					const w = wfrtRun(wfrt, tmp, module, { input, nodes: lists, all });
					const same = isDeepStrictEqual(w, native);
					if (!same && process.argv.includes('--show')) {
						process.stderr.write(
							`${bundle} / ${n.name} wfrt: ${JSON.stringify(w).slice(0, 400)}\n vm: ${JSON.stringify(native).slice(0, 400)}\n`,
						);
					}
					if (!same) wfrtVerdict = 'differ';
					else wfrtVerdict ??= 'same';
				}
				let v: Result['verdict'];
				if (host.ok && native.ok) {
					v = (
						random
							? isDeepStrictEqual(shape(host), shape(native))
							: JSON.stringify(host.value) === JSON.stringify(native.value)
					)
						? 'same'
						: 'differ';
				} else if (!host.ok && !native.ok) {
					v = host.error === native.error ? 'same error' : 'different error';
				} else v = host.ok ? 'native only fails' : 'host only fails';
				if (process.argv.includes('--show') && v !== 'same' && v !== 'same error') {
					process.stderr.write(
						`${bundle} / ${n.name} variant ${variant}\n host:   ${JSON.stringify(host).slice(0, 600)}\n native: ${JSON.stringify(native).slice(0, 600)}\n`,
					);
				}
				const rank = [
					'same',
					'same error',
					'different error',
					'host only fails',
					'native only fails',
					'differ',
				];
				if (rank.indexOf(v) > rank.indexOf(verdict)) {
					verdict = v;
					detail = `variant ${variant}: host ${host.ok ? 'ok' : host.error.slice(0, 160)} / native ${native.ok ? 'ok' : native.error.slice(0, 160)}`;
				}
			}
			results.push({ bundle, node: n.name, runs, verdict, random, wfrt: wfrtVerdict, detail });
		}
	}
	const details = arg('--details');
	if (details) writeFileSync(details, JSON.stringify(results, null, 1));
	const by = new Map<string, { nodes: number; runs: number }>();
	for (const r of results) {
		const e = by.get(r.verdict) ?? { nodes: 0, runs: 0 };
		e.nodes++;
		e.runs += r.runs;
		by.set(r.verdict, e);
	}
	process.stdout.write('| Verdict | Nodes | Runs |\n|---|---|---|\n');
	for (const [v, e] of by) process.stdout.write(`| ${v} | ${e.nodes} | ${e.runs} |\n`);
	if (wfrt) {
		const differ = results.filter((r) => r.wfrt === 'differ').length;
		process.stdout.write(`\nwfrt run vs VM: ${results.length - differ} same, ${differ} differ\n`);
	}
}

main();
