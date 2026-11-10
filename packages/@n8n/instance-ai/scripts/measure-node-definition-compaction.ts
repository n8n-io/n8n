/**
 * Runs `compactNodeDefinition` over every generated node definition and
 * reports the size saving. It also checks that compaction keeps every field
 * name, literal value and meaningful tag, so a new rule cannot drop
 * information for some node that nobody looked at.
 *
 * Usage: pnpm --filter @n8n/instance-ai exec tsx scripts/measure-node-definition-compaction.ts [definitionsDir]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { compactNodeDefinition } from '../src/tools/compact-node-definition';

const root = resolve(
	process.argv[2] ?? join(__dirname, '../../../nodes-base/dist/node-definitions/nodes'),
);

function* walk(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) yield* walk(full);
		else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) yield full;
	}
}

const codeLines = (content: string) =>
	content
		.replace(/\/\*\*[\s\S]*?\*\//g, '')
		.split('\n')
		.filter((l) => !/^\s*\/\//.test(l))
		.join('\n');

// Count occurrences per name, so a name dropped from one node still fails
// when the same name appears elsewhere in the file.
const countBy = (values: string[]) => {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return counts;
};
const fieldNames = (content: string) =>
	countBy([...codeLines(content).matchAll(/([A-Za-z_$][\w$]*)\??\s*:/g)].map((m) => m[1]));
const literals = (content: string) =>
	countBy([...codeLines(content).matchAll(/'([^'\n]*)'/g)].map((m) => m[1]));
const KEPT_TAGS = ['@default', '@loadOptionsMethod', '@searchListMethod', '@builderHint', '@hint'];
const tagCount = (content: string, tag: string) => content.split(tag).length - 1;

let before = 0;
let after = 0;
let files = 0;
const failures: string[] = [];
const perNode = new Map<string, { before: number; after: number }>();

for (const file of walk(root)) {
	const original = readFileSync(file, 'utf-8');
	const compact = compactNodeDefinition(original);
	files++;
	before += original.length;
	after += compact.length;
	const node = relative(root, file).split('/').slice(0, 2).join('/');
	const entry = perNode.get(node) ?? { before: 0, after: 0 };
	entry.before += original.length;
	entry.after += compact.length;
	perNode.set(node, entry);

	const name = relative(root, file);
	const compactFields = fieldNames(compact);
	for (const [field, count] of fieldNames(original)) {
		if ((compactFields.get(field) ?? 0) < count) failures.push(`${name}: lost field ${field}`);
	}
	const compactLiterals = literals(compact);
	for (const [literal, count] of literals(original)) {
		if ((compactLiterals.get(literal) ?? 0) < count)
			failures.push(`${name}: lost literal '${literal}'`);
	}
	for (const tag of KEPT_TAGS) {
		if (tagCount(original, tag) !== tagCount(compact, tag))
			failures.push(`${name}: ${tag} count changed`);
	}
	const shows = tagCount(original, '@displayOptions.show');
	if (shows !== tagCount(compact, '@show')) failures.push(`${name}: @show count changed`);
}

const pct = (a: number, b: number) => `${(100 * (1 - b / a)).toFixed(1)}%`;
console.log(`files: ${files}`);
console.log(`chars: ${before} -> ${after} (${pct(before, after)} smaller)`);
const biggest = [...perNode.entries()].sort((a, b) => b[1].before - a[1].before).slice(0, 10);
for (const [node, size] of biggest) {
	console.log(`  ${node}: ${size.before} -> ${size.after} (${pct(size.before, size.after)})`);
}
console.log(`invariant failures: ${failures.length}`);
for (const failure of failures.slice(0, 20)) console.log(`  ${failure}`);
process.exitCode = failures.length > 0 ? 1 : 0;
