import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Run with:
 * node --test --experimental-test-module-mocks ./.github/scripts/derive-mcp-shard-weights.test.mjs
 */
const { findManifestStats, weightsFromStats, mergeWeights } = await import(
	'./derive-mcp-shard-weights.mjs'
);

describe('weightsFromStats', () => {
	it('averages per-slug build duration across iterations, in whole seconds', () => {
		const weights = weightsFromStats([
			{
				builds: [
					{ slug: 'a', durationMs: 2000 },
					{ slug: 'a', durationMs: 4000 },
					{ slug: 'b', durationMs: 10000 },
				],
			},
		]);
		assert.deepEqual(weights, { a: 3, b: 10 });
	});

	it('unions builds across multiple (per-shard) stats objects', () => {
		const weights = weightsFromStats([
			{ builds: [{ slug: 'a', durationMs: 3000 }] },
			{ builds: [{ slug: 'b', durationMs: 6000 }] },
		]);
		assert.deepEqual(weights, { a: 3, b: 6 });
	});

	it('floors weights at 1s and skips malformed build records', () => {
		const weights = weightsFromStats([
			{
				builds: [
					{ slug: 'fast', durationMs: 200 }, // 0.2s -> floored to 1
					{ slug: 'nobuild' }, // no durationMs -> skipped
					{ durationMs: 5000 }, // no slug -> skipped
				],
			},
			{}, // no builds array -> skipped
		]);
		assert.deepEqual(weights, { fast: 1 });
	});
});

describe('mergeWeights', () => {
	it('lets measured weights win and preserves untouched base slugs, sorted', () => {
		const merged = mergeWeights({ a: 99, x: 5 }, { a: 3, b: 10 });
		assert.deepEqual(merged, { a: 3, b: 10, x: 5 });
		assert.deepEqual(Object.keys(merged), ['a', 'b', 'x']); // sorted for stable diffs
	});
});

describe('findManifestStats', () => {
	it('recursively finds manifest-stats.json under shard artifact dirs', () => {
		const root = mkdtempSync(join(tmpdir(), 'derive-'));
		for (const shard of ['shard-1', 'shard-2']) {
			const cohort = join(root, `mcp-workflow-eval-results-${shard}`, 'eval-mcp-cohort');
			mkdirSync(cohort, { recursive: true });
			writeFileSync(join(cohort, 'manifest-stats.json'), JSON.stringify({ builds: [] }));
			writeFileSync(join(cohort, 'manifest.json'), '{}'); // not a stats file
		}
		const found = findManifestStats(root);
		assert.equal(found.length, 2);
		assert.ok(found.every((f) => f.endsWith('manifest-stats.json')));
	});
});

// End-to-end via the CLI: the reviewer's ask is that a run with no stats files
// (rebalancing silently defeated) surfaces visibly instead of a buried log line.
describe('main (zero-stats visibility)', () => {
	const SCRIPT = fileURLToPath(new URL('./derive-mcp-shard-weights.mjs', import.meta.url));

	function run(inputDir, base, out, env) {
		return spawnSync(
			process.execPath,
			[SCRIPT, '--input-dir', inputDir, '--base', base, '--out', out],
			{ encoding: 'utf8', env: { ...process.env, ...env } },
		);
	}

	function fixture(prefix) {
		const root = mkdtempSync(join(tmpdir(), prefix));
		const base = join(root, 'base.json');
		const out = join(root, 'out.json');
		writeFileSync(base, JSON.stringify({ a: 42, b: 5 }));
		return { root, base, out };
	}

	it('emits a GitHub warning annotation and keeps base weights when no stats exist (in CI)', () => {
		const { root, base, out } = fixture('derive-empty-ci-');
		const res = run(root, base, out, { GITHUB_ACTIONS: 'true' });
		assert.equal(res.status, 0); // non-fatal: weights are only a balancing hint
		assert.match(res.stdout, /::warning[^\n]*manifest-stats\.json/);
		assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), { a: 42, b: 5 }); // unchanged
	});

	it('does not emit a workflow command outside GitHub Actions (plain stderr only)', () => {
		const { root, base, out } = fixture('derive-empty-local-');
		const res = run(root, base, out, { GITHUB_ACTIONS: '' });
		assert.equal(res.status, 0);
		assert.doesNotMatch(res.stdout, /::warning/);
		assert.match(res.stderr, /No manifest-stats\.json found/);
	});

	it('does not warn when stats are present, refreshing measured slugs over base', () => {
		const { root, base, out } = fixture('derive-stats-');
		const cohort = join(root, 'mcp-workflow-eval-results-1', 'eval-mcp-cohort');
		mkdirSync(cohort, { recursive: true });
		writeFileSync(
			join(cohort, 'manifest-stats.json'),
			JSON.stringify({ builds: [{ slug: 'a', durationMs: 8000 }] }),
		);
		const res = run(root, base, out, { GITHUB_ACTIONS: 'true' });
		assert.equal(res.status, 0);
		assert.doesNotMatch(res.stdout, /::warning/);
		// `a` refreshed to 8s from stats; untouched `b` preserved from base.
		assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), { a: 8, b: 5 });
	});
});
