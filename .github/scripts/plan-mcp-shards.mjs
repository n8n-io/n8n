#!/usr/bin/env node
/**
 * Plan the MCP workflow-eval shard matrix (CI Phase 2).
 *
 * Splits a tier's test-case slugs into N groups and emits a GitHub Actions
 * matrix (`{ include: [{ shard, slugs }] }`). Each shard then runs the whole
 * build+eval pipeline for its slice on its own n8n instance.
 *
 * Balancing:
 *   - With a weights file (slug -> seconds, see derive-mcp-shard-weights.mjs),
 *     groups are packed by cost using greedy longest-processing-time-first (LPT)
 *     so the slowest shard is minimized. Unmeasured slugs fall back to the
 *     MEDIAN measured weight and are spread across shards (equal-weight ties go
 *     to the shard with the fewest cases), so a new case is never treated as
 *     free and several new cases don't pile onto one shard.
 *   - Without weights, falls back to a balanced-by-count contiguous split.
 *
 * The weights file is an optional cost HINT — tier membership always comes from
 * the JSON files on disk, so new/edited/removed cases are handled with no weights
 * change; a missing or stale weight only affects balance, never coverage.
 *
 * Zero dependencies (node builtins only) so it can gate the matrix fan-out with
 * just `node` — no install, no build.
 *
 * Usage:
 *   node .github/scripts/plan-mcp-shards.mjs --tier mcp --shards 4 [--filter a,b]
 *   [--weights <file>] [--workflow-dir <path>]
 *
 * Writes `matrix=<json>` to $GITHUB_OUTPUT when set; always prints the plan to
 * stderr and the compact JSON to stdout.
 */

import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SHARDS = 4;
const DEFAULT_DATASETS = ['full'];

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
// Default to the eval test-case directory + committed weights file, resolved
// from this script's location so the planner works regardless of the caller cwd.
const DEFAULT_WORKFLOW_DIR = resolve(
	SCRIPT_DIR,
	'../../packages/@n8n/instance-ai/evaluations/data/workflows',
);
const DEFAULT_WEIGHTS_FILE = resolve(
	SCRIPT_DIR,
	'../../packages/@n8n/instance-ai/mcp-shard-weights.json',
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

/** Load a slug -> weight(seconds) map. Returns {} on a missing/unreadable/invalid file. */
export function readWeights(path) {
	if (!path || !existsSync(path)) return {};
	let parsed;
	try {
		parsed = JSON.parse(readFileSync(path, 'utf8'));
	} catch {
		process.stderr.write(`  ! ignoring weights file ${path}: not valid JSON\n`);
		return {};
	}
	// Accept a flat { slug: seconds } map, keeping only finite positive numbers.
	const weights = {};
	for (const [slug, value] of Object.entries(parsed ?? {})) {
		if (typeof value === 'number' && Number.isFinite(value) && value > 0) weights[slug] = value;
	}
	return weights;
}

function median(nums) {
	if (nums.length === 0) return undefined;
	const sorted = [...nums].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Split `slugs` into at most `count` balanced, contiguous groups (count-based
 * fallback when there are no weights). First `slugs.length % count` groups get
 * one extra slug. Never emits an empty group.
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

/**
 * Cost-balanced partition via greedy LPT: assign the heaviest slug to the
 * currently-lightest shard. Unmeasured slugs use the median measured weight so
 * they're treated as "typical" (never free); equal-weight ties go to the shard
 * with the fewest slugs, which round-robins new cases across shards.
 */
export function packShardsByWeight(slugs, count, weights) {
	if (slugs.length === 0) return [];
	const known = slugs.map((s) => weights[s]).filter((w) => typeof w === 'number');
	const fallback = median(known) ?? 1;
	const weightOf = (slug) => weights[slug] ?? fallback;

	const groupCount = Math.min(Math.max(1, count), slugs.length);
	const bins = Array.from({ length: groupCount }, () => ({ slugs: [], load: 0 }));

	// Heaviest first; tiebreak by slug name so the plan is deterministic.
	const ordered = [...slugs].sort((a, b) => weightOf(b) - weightOf(a) || a.localeCompare(b));
	for (const slug of ordered) {
		let best = 0;
		for (let i = 1; i < bins.length; i++) {
			const b = bins[i];
			const cur = bins[best];
			if (
				b.load < cur.load ||
				(b.load === cur.load && b.slugs.length < cur.slugs.length)
			) {
				best = i;
			}
		}
		bins[best].slugs.push(slug);
		bins[best].load += weightOf(slug);
	}

	// Sort within each shard for a stable, readable slug list.
	return bins.map((b) => b.slugs.sort((a, c) => a.localeCompare(c)));
}

/** Build the GitHub Actions matrix payload. Uses LPT when `weights` is non-empty. */
export function planShards(slugs, shards, weights) {
	const hasWeights = weights && Object.keys(weights).length > 0;
	const groups = hasWeights
		? packShardsByWeight(slugs, shards, weights)
		: chunkSlugs(slugs, shards);
	return {
		include: groups.map((group, idx) => ({
			shard: String(idx + 1),
			slugs: group.join(','),
		})),
	};
}

function parseArgs(argv) {
	const args = {
		tier: undefined,
		shards: DEFAULT_SHARDS,
		filter: undefined,
		workflowDir: DEFAULT_WORKFLOW_DIR,
		weights: undefined,
	};
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
			case '--weights':
				args.weights = resolve(next());
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

	// Explicit --weights wins; otherwise auto-use the committed file when present.
	const weightsPath = args.weights ?? DEFAULT_WEIGHTS_FILE;
	const weights = readWeights(weightsPath);
	const measured = slugs.filter((s) => weights[s] !== undefined).length;
	process.stderr.write(
		Object.keys(weights).length > 0
			? `Balancing by weights (${weightsPath}): ${measured}/${slugs.length} slugs measured, rest use median.\n`
			: 'No weights file — balancing by case count.\n',
	);

	const matrix = planShards(slugs, args.shards, weights);
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
