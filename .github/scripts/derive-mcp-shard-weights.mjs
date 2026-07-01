#!/usr/bin/env node
/**
 * Derive per-slug shard weights from a run's build stats (CI Phase 2 balancing).
 *
 * Each MCP eval shard uploads `eval-mcp-cohort/manifest-stats.json` with a
 * per-(slug, iteration) build record. This unions those across a run's shard
 * artifacts into a slug -> seconds map (mean build duration per iteration, so
 * it's independent of the iteration count and robust to a failed iteration),
 * then MERGES it into an existing weights file: slugs seen this run are updated,
 * all others are preserved. So a filtered/partial run only refreshes its own
 * slugs and never wipes coverage.
 *
 * Build time is the dominant, most-variable cost (the Claude build phase), so it
 * is the weight; the mock-exec verifier time isn't captured here.
 *
 * Zero dependencies (node builtins only).
 *
 * Usage:
 *   node .github/scripts/derive-mcp-shard-weights.mjs --input-dir <dir> \
 *     [--base <weights.json>] [--out <weights.json>]
 *
 * With no --out, prints the merged map to stdout.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readWeights } from './plan-mcp-shards.mjs';

/** Recursively collect files named `manifest-stats.json` under `dir`. */
export function findManifestStats(dir) {
	const found = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) found.push(...findManifestStats(full));
		else if (entry.name === 'manifest-stats.json') found.push(full);
	}
	return found;
}

/**
 * Union build durations from a set of manifest-stats objects into a
 * slug -> seconds map (mean per-iteration build seconds, rounded).
 */
export function weightsFromStats(statsObjects) {
	const durationsBySlug = new Map();
	for (const stats of statsObjects) {
		for (const build of stats?.builds ?? []) {
			if (typeof build?.slug !== 'string' || typeof build?.durationMs !== 'number') continue;
			if (!durationsBySlug.has(build.slug)) durationsBySlug.set(build.slug, []);
			durationsBySlug.get(build.slug).push(build.durationMs);
		}
	}
	const weights = {};
	for (const [slug, durations] of durationsBySlug) {
		const meanMs = durations.reduce((sum, d) => sum + d, 0) / durations.length;
		weights[slug] = Math.max(1, Math.round(meanMs / 1000));
	}
	return weights;
}

/** Merge freshly-measured weights over a base map (measured win; base preserved otherwise). */
export function mergeWeights(base, measured) {
	const merged = { ...base, ...measured };
	// Sort keys for a stable, review-friendly diff.
	return Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]]));
}

function parseArgs(argv) {
	const args = { inputDir: undefined, base: undefined, out: undefined };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = () => {
			const value = argv[i + 1];
			if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
			i++;
			return value;
		};
		switch (arg) {
			case '--input-dir':
				args.inputDir = resolve(next());
				break;
			case '--base':
				args.base = resolve(next());
				break;
			case '--out':
				args.out = resolve(next());
				break;
			default:
				throw new Error(`Unknown flag: ${arg.split('=', 1)[0]}`);
		}
	}
	if (!args.inputDir) throw new Error('--input-dir is required');
	return args;
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const statsFiles = findManifestStats(args.inputDir);
	if (statsFiles.length === 0) {
		process.stderr.write(`No manifest-stats.json found under ${args.inputDir}\n`);
	}
	const statsObjects = statsFiles.map((f) => JSON.parse(readFileSync(f, 'utf8')));
	const measured = weightsFromStats(statsObjects);
	const base = args.base ? readWeights(args.base) : {};
	const merged = mergeWeights(base, measured);

	const json = `${JSON.stringify(merged, null, 2)}\n`;
	if (args.out) {
		writeFileSync(args.out, json);
		process.stderr.write(
			`Wrote ${Object.keys(merged).length} slug weight(s) to ${args.out} ` +
				`(${Object.keys(measured).length} refreshed from ${statsFiles.length} stats file(s)).\n`,
		);
	} else {
		process.stdout.write(json);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		main();
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
