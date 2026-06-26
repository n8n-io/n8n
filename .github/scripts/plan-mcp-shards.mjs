#!/usr/bin/env node
/**
 * Plan the MCP workflow-eval shard matrix (CI Phase 2).
 *
 * Splits a tier's test-case slugs into N balanced groups and emits a GitHub
 * Actions matrix (`{ include: [{ shard, slugs }] }`). Each shard then runs the
 * whole build+eval pipeline for its slice on its own n8n instance.
 *
 * Zero dependencies (node builtins only) so it can gate the matrix fan-out with
 * just `node` — no install, no build. A "tier" is membership in a test case's
 * `datasets` array (absent => ['full']); a "slug" is the JSON filename without
 * its extension — mirroring loadWorkflowTestCasesWithFiles in @n8n/instance-ai.
 *
 * Usage:
 *   node .github/scripts/plan-mcp-shards.mjs --tier mcp --shards 4 [--filter a,b]
 *   [--workflow-dir <path>]
 *
 * Writes `matrix=<json>` to $GITHUB_OUTPUT when set; always prints the plan to
 * stderr and the compact JSON to stdout.
 */

import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SHARDS = 4;
const DEFAULT_DATASETS = ['full'];

// Default to the eval test-case directory, resolved from this script's location
// so the planner works regardless of the caller's cwd.
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_WORKFLOW_DIR = resolve(
	SCRIPT_DIR,
	'../../packages/@n8n/instance-ai/evaluations/data/workflows',
);

/** Comma-separated, lowercased, OR-semantics substring filter (mirrors the eval CLI). */
function parseSubstringList(value) {
	return value
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter((s) => s.length > 0);
}

/** Read the tier's slugs from the workflow JSON dir, sorted for deterministic sharding. */
export function readTierSlugs(workflowDir, tier, filter) {
	const filterTokens = filter ? parseSubstringList(filter) : [];
	const slugs = [];
	for (const file of readdirSync(workflowDir)) {
		if (!file.endsWith('.json')) continue;
		const slug = basename(file, '.json');
		if (filterTokens.length > 0 && !filterTokens.some((t) => slug.toLowerCase().includes(t))) {
			continue;
		}
		let parsed;
		try {
			parsed = JSON.parse(readFileSync(join(workflowDir, file), 'utf8'));
		} catch (error) {
			throw new Error(`Failed to parse ${file}: ${error instanceof Error ? error.message : error}`);
		}
		const datasets = Array.isArray(parsed.datasets) ? parsed.datasets : DEFAULT_DATASETS;
		if (!tier || datasets.includes(tier)) slugs.push(slug);
	}
	return slugs.sort((a, b) => a.localeCompare(b));
}

/**
 * Split `slugs` into at most `count` balanced, contiguous groups. The first
 * `slugs.length % count` groups get one extra slug (sizes differ by <= 1).
 * Never emits an empty group.
 */
export function chunkSlugs(slugs, count) {
	if (slugs.length === 0) return [];
	const groupCount = Math.min(Math.max(1, count), slugs.length);
	const base = Math.floor(slugs.length / groupCount);
	const remainder = slugs.length % groupCount;
	const groups = [];
	let cursor = 0;
	for (let i = 0; i < groupCount; i++) {
		const size = base + (i < remainder ? 1 : 0);
		groups.push(slugs.slice(cursor, cursor + size));
		cursor += size;
	}
	return groups;
}

/** Build the GitHub Actions matrix payload from a (pre-sorted) slug list. */
export function planShards(slugs, shards) {
	return {
		include: chunkSlugs(slugs, shards).map((group, idx) => ({
			shard: String(idx + 1),
			slugs: group.join(','),
		})),
	};
}

function parseArgs(argv) {
	const args = { tier: undefined, shards: DEFAULT_SHARDS, filter: undefined, workflowDir: DEFAULT_WORKFLOW_DIR };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = () => {
			const value = argv[i + 1];
			if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
			i++;
			return value;
		};
		switch (arg) {
			case '--tier':
				args.tier = next();
				break;
			case '--shards': {
				const parsed = Number.parseInt(next(), 10);
				if (Number.isNaN(parsed) || parsed < 1) throw new Error('--shards must be a positive integer');
				args.shards = parsed;
				break;
			}
			case '--filter':
				args.filter = next();
				break;
			case '--workflow-dir':
				args.workflowDir = resolve(next());
				break;
			default:
				throw new Error(`Unknown flag: ${arg.split('=', 1)[0]}`);
		}
	}
	return args;
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const slugs = readTierSlugs(args.workflowDir, args.tier, args.filter);
	if (slugs.length === 0) {
		throw new Error(`No test cases matched${args.tier ? ` --tier "${args.tier}"` : ''} — nothing to shard.`);
	}
	const matrix = planShards(slugs, args.shards);
	const compact = JSON.stringify(matrix);

	process.stderr.write(
		`Planned ${matrix.include.length} shard(s) over ${slugs.length} slug(s):\n` +
			matrix.include.map((s) => `  shard ${s.shard}: ${s.slugs}`).join('\n') +
			'\n',
	);
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${compact}\n`);
	}
	process.stdout.write(`${compact}\n`);
}

// Only run as a CLI, not when imported by the test.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		main();
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
