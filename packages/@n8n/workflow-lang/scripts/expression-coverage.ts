/**
 * Measures how many v1 `{{ }}` expressions in the workflow JSON files of this
 * repository compile with the workflow compiler. It writes
 * `docs/expression-coverage.md`.
 *
 * Run: node scripts/expression-coverage.ts
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/compiler/index.ts';
import type { LegacyIssue } from '../src/legacy/index.ts';
import {
	compileLegacyExpression,
	extractExpressions,
	issueOf,
	parsesAsExpression,
	withoutTypeNoise,
	rewriteLegacy,
	stringParameters,
	wrapExpressions,
} from '../src/legacy/index.ts';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(packageRoot, '..', '..', '..');

interface Found {
	file: string;
	body: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Finds workflow objects (with a `nodes` array of typed nodes) anywhere in a JSON document. */
function workflows(doc: unknown, out: Array<Array<Record<string, unknown>>> = []) {
	if (Array.isArray(doc)) {
		for (const d of doc) workflows(d, out);
	} else if (isRecord(doc)) {
		const nodes = doc.nodes;
		if (
			Array.isArray(nodes) &&
			nodes.length > 0 &&
			nodes.every((n) => isRecord(n) && typeof n.type === 'string')
		) {
			out.push(nodes.filter(isRecord));
		} else {
			for (const v of Object.values(doc)) workflows(v, out);
		}
	}
	return out;
}

function collect(): { files: number; found: Found[] } {
	const list = execFileSync('git', ['ls-files', '--', 'packages/**/*.json'], {
		cwd: repoRoot,
		encoding: 'utf8',
	})
		.split('\n')
		.filter((f) => f && !f.includes('node_modules') && !f.includes('/dist/'));
	const found: Found[] = [];
	let files = 0;
	for (const file of list) {
		let text: string;
		try {
			text = readFileSync(join(repoRoot, file), 'utf8');
		} catch {
			continue;
		}
		if (!text.includes('{{') || !text.includes('"nodes"')) continue;
		let doc: unknown;
		try {
			doc = JSON.parse(text);
		} catch {
			continue;
		}
		const wfs = workflows(doc);
		if (wfs.length === 0) continue;
		files++;
		for (const nodes of wfs) {
			for (const node of nodes) {
				for (const [, value] of stringParameters(node.parameters ?? {}, '')) {
					for (const body of extractExpressions(value)) found.push({ file, body });
				}
			}
		}
	}
	return { files, found };
}

type Outcome = { ok: true } | { ok: false; issues: LegacyIssue[] };

/** Compiles many bodies in batches. A batch with a lowering error falls back to one at a time. */
function compileAll(bodies: string[]): Map<string, Outcome> {
	const outcome = new Map<string, Outcome>();
	const pending: Array<{ body: string; code: string; nodes: Map<string, string> }> = [];
	for (const body of bodies) {
		if (outcome.has(body)) continue;
		const r = rewriteLegacy(body);
		if (!parsesAsExpression(r.code)) {
			outcome.set(body, {
				ok: false,
				issues: [{ feature: 'syntax', message: 'not one expression', code: 'WL100' }],
			});
		} else if (r.unsupported.length > 0) {
			outcome.set(body, {
				ok: false,
				issues: r.unsupported.map((v) => ({
					feature: v,
					message: `${v} has no mapping`,
					code: 'WL101',
				})),
			});
		} else {
			outcome.set(body, { ok: true });
			pending.push({ body, code: r.code, nodes: r.nodes });
		}
	}
	const BATCH = 150;
	for (let i = 0; i < pending.length; i += BATCH) {
		const batch = pending.slice(i, i + BATCH);
		const nodeVars = new Map<string, string>();
		for (const b of batch) for (const [k, v] of b.nodes) nodeVars.set(k, v);
		const { source, ranges } = wrapExpressions(
			batch.map((b) => b.code),
			nodeVars,
		);
		const result = compile(source, { nodes: {}, looseTypes: true });
		if (result.ok) continue;
		if (result.diagnostics.some((d) => d.code === 'WL090')) {
			for (const b of batch) {
				const r = compileLegacyExpression(b.body);
				outcome.set(b.body, r.ok ? { ok: true } : { ok: false, issues: r.issues });
			}
			continue;
		}
		for (const d of result.diagnostics) {
			const index = ranges.findIndex(([s, e]) => d.start >= s && d.start <= e);
			if (index < 0) continue;
			const body = batch[index].body;
			const prev = outcome.get(body);
			const issues = prev && !prev.ok ? prev.issues : [];
			outcome.set(body, { ok: false, issues: [...issues, issueOf(d)] });
		}
	}
	for (const [body, o] of outcome) {
		if (!o.ok) outcome.set(body, { ok: false, issues: withoutTypeNoise(o.issues) });
	}
	return outcome;
}

function pct(n: number, d: number): string {
	return d === 0 ? '0%' : `${((100 * n) / d).toFixed(1)}%`;
}

function main() {
	const { files, found } = collect();
	const outcome = compileAll(found.map((f) => f.body));
	const unique = [...outcome.keys()];
	const okUnique = unique.filter((b) => outcome.get(b)?.ok).length;
	const okAll = found.filter((f) => outcome.get(f.body)?.ok).length;

	// Rank features by the number of expressions (all occurrences) that they block.
	const blocking = new Map<string, number>();
	const onlyBlocker = new Map<string, number>();
	for (const f of found) {
		const o = outcome.get(f.body);
		if (!o || o.ok) continue;
		const features = new Set(o.issues.map((i) => i.feature));
		for (const feat of features) blocking.set(feat, (blocking.get(feat) ?? 0) + 1);
		if (features.size === 1) {
			const [only] = features;
			onlyBlocker.set(only, (onlyBlocker.get(only) ?? 0) + 1);
		}
	}
	const ranked = [...blocking.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	const examples = new Map<string, string>();
	for (const f of found) {
		const o = outcome.get(f.body);
		if (!o || o.ok) continue;
		for (const i of o.issues) {
			const short = f.body.length < 90;
			if (!examples.has(i.feature) || (short && (examples.get(i.feature) ?? '').length >= 90)) {
				examples.set(i.feature, short ? f.body : `${f.body.slice(0, 85)}…`);
			}
		}
	}

	const lines: string[] = [];
	lines.push('# Legacy expression coverage');
	lines.push('');
	lines.push('Generated by `node scripts/expression-coverage.ts`. Do not edit.');
	lines.push('');
	lines.push(
		'The sample is every `{{ }}` expression in the workflow JSON files that git tracks under `packages/`',
	);
	lines.push('(test fixtures, node test workflows, templates). The script rewrites `$json`,');
	lines.push(
		'`$(\'Node\').item.json`, `$node["Node"].json` and `$input.item.json` to variables, and compiles',
	);
	lines.push(
		'each body with the workflow compiler (`src/legacy/`). It also rewrites `$now.toISO()`,',
	);
	lines.push(
		'`$now.toMillis()` and `$today.toISO()` to Date forms. Dates follow the UTC policy of spec section 4.5.',
	);
	lines.push('');
	lines.push('| Measure | Value |');
	lines.push('|---|---|');
	lines.push(`| Workflow files | ${files} |`);
	lines.push(`| Expressions (all occurrences) | ${found.length} |`);
	lines.push(`| Expressions that compile | ${okAll} (${pct(okAll, found.length)}) |`);
	lines.push(`| Distinct expressions | ${unique.length} |`);
	lines.push(
		`| Distinct expressions that compile | ${okUnique} (${pct(okUnique, unique.length)}) |`,
	);
	lines.push('');
	lines.push('## Missing features, ranked');
	lines.push('');
	lines.push(
		'"Blocks" counts the expressions (all occurrences) that the feature stops. "Only blocker" counts',
	);
	lines.push('the expressions that would compile if only this feature were added.');
	lines.push('');
	lines.push('| # | Feature | Blocks | Only blocker | Example |');
	lines.push('|---|---|---|---|---|');
	ranked.slice(0, 40).forEach(([feat, n], i) => {
		const ex = (examples.get(feat) ?? '')
			.replace(/\s+/g, ' ')
			.replace(/\|/g, '\\|')
			.replace(/`/g, "'");
		lines.push(
			`| ${i + 1} | \`${feat.replace(/\|/g, '\\|')}\` | ${n} | ${onlyBlocker.get(feat) ?? 0} | \`${ex}\` |`,
		);
	});
	lines.push('');
	writeFileSync(join(packageRoot, 'docs', 'expression-coverage.md'), lines.join('\n'));
	console.log(
		`files ${files}, expressions ${found.length}, compile ${okAll} (${pct(okAll, found.length)}); distinct ${unique.length}, compile ${okUnique}`,
	);
}

main();
