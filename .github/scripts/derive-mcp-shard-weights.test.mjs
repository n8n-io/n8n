import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
