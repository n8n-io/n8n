import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Run with:
 * node --test --experimental-test-module-mocks ./.github/scripts/plan-mcp-shards.test.mjs
 */
const { chunkSlugs, packShardsByWeight, planShards, readTierSlugs, readWeights } = await import(
	'./plan-mcp-shards.mjs'
);

describe('chunkSlugs', () => {
	it('splits into balanced contiguous groups, remainder to earlier groups', () => {
		const slugs = Array.from({ length: 23 }, (_, i) => `s${String(i).padStart(2, '0')}`);
		const groups = chunkSlugs(slugs, 4);
		assert.deepEqual(
			groups.map((g) => g.length),
			[6, 6, 6, 5],
		);
		assert.deepEqual(groups.flat(), slugs);
	});

	it('never emits empty groups when shards exceed slugs', () => {
		assert.deepEqual(chunkSlugs(['a', 'b', 'c'], 8), [['a'], ['b'], ['c']]);
	});

	it('clamps shards < 1 to a single group and handles empty input', () => {
		assert.deepEqual(chunkSlugs(['a', 'b'], 0), [['a', 'b']]);
		assert.deepEqual(chunkSlugs([], 4), []);
	});
});

describe('packShardsByWeight (LPT)', () => {
	it('isolates a dominant-cost case instead of splitting by count', () => {
		// Count-based would pair the heavy `a` with `b` (load 110); LPT keeps `a`
		// alone so the slowest shard is 100, not 110.
		const groups = packShardsByWeight(['a', 'b', 'c', 'd'], 2, { a: 100, b: 10, c: 10, d: 10 });
		assert.deepEqual(groups, [['a'], ['b', 'c', 'd']]);
	});

	it('balances equal-weight cases evenly across shards', () => {
		const groups = packShardsByWeight(['a', 'b', 'c', 'd'], 2, { a: 50, b: 50, c: 50, d: 50 });
		assert.deepEqual(
			groups.map((g) => g.length),
			[2, 2],
		);
	});

	it('weights unmeasured slugs as the median (not free) so they are not clustered', () => {
		// b, c are unmeasured -> median of [100] = 100. Treated as typical cost, so
		// c lands with a (=> [[a,c],[b]]); a weight-1 fallback would instead pile the
		// unknowns together as [[a],[b,c]].
		const groups = packShardsByWeight(['a', 'b', 'c'], 2, { a: 100 });
		assert.deepEqual(groups, [['a', 'c'], ['b']]);
	});

	it('spreads all-unmeasured slugs (median falls back to 1, round-robin by count)', () => {
		const groups = packShardsByWeight(['a', 'b', 'c', 'd'], 2, {});
		assert.deepEqual(
			groups.map((g) => g.length),
			[2, 2],
		);
	});
});

describe('planShards', () => {
	it('emits an include-only matrix with stringified indices and csv slugs (count-based)', () => {
		assert.deepEqual(planShards(['a', 'b', 'c', 'd', 'e'], 2), {
			include: [
				{ shard: '1', slugs: 'a,b,c' },
				{ shard: '2', slugs: 'd,e' },
			],
		});
	});

	it('uses LPT when weights are provided', () => {
		assert.deepEqual(planShards(['a', 'b', 'c', 'd'], 2, { a: 100, b: 10, c: 10, d: 10 }), {
			include: [
				{ shard: '1', slugs: 'a' },
				{ shard: '2', slugs: 'b,c,d' },
			],
		});
	});

	it('ignores an empty weights map (falls back to count-based)', () => {
		assert.deepEqual(planShards(['a', 'b', 'c', 'd', 'e'], 2, {}), {
			include: [
				{ shard: '1', slugs: 'a,b,c' },
				{ shard: '2', slugs: 'd,e' },
			],
		});
	});

	it('covers every slug exactly once across shards', () => {
		const slugs = Array.from({ length: 23 }, (_, i) => `slug-${i}`);
		const recombined = planShards(slugs, 4).include.flatMap((s) => s.slugs.split(','));
		assert.deepEqual([...recombined].sort(), [...slugs].sort());
		assert.equal(new Set(recombined).size, slugs.length);
	});
});

describe('readWeights', () => {
	function writeJson(body) {
		const dir = mkdtempSync(join(tmpdir(), 'weights-'));
		const path = join(dir, 'w.json');
		writeFileSync(path, typeof body === 'string' ? body : JSON.stringify(body));
		return path;
	}

	it('returns {} for a missing file', () => {
		assert.deepEqual(readWeights('/no/such/weights.json'), {});
	});

	it('keeps only finite positive numeric weights', () => {
		const path = writeJson({ a: 12, b: 0, c: -3, d: 'x', e: 4.5 });
		assert.deepEqual(readWeights(path), { a: 12, e: 4.5 });
	});

	it('returns {} for malformed JSON', () => {
		assert.deepEqual(readWeights(writeJson('{not json')), {});
	});
});

describe('readTierSlugs', () => {
	function fixtureDir() {
		const dir = mkdtempSync(join(tmpdir(), 'plan-shards-'));
		writeFileSync(join(dir, 'alpha.json'), JSON.stringify({ datasets: ['mcp', 'full'] }));
		writeFileSync(join(dir, 'beta.json'), JSON.stringify({ datasets: ['mcp'] }));
		writeFileSync(join(dir, 'gamma.json'), JSON.stringify({ datasets: ['full'] }));
		writeFileSync(join(dir, 'delta.json'), JSON.stringify({})); // no datasets -> defaults to ['full']
		writeFileSync(join(dir, 'notes.txt'), 'ignored');
		return dir;
	}

	it('returns sorted slugs whose datasets include the tier', () => {
		assert.deepEqual(readTierSlugs(fixtureDir(), 'mcp'), ['alpha', 'beta']);
	});

	it('treats a missing datasets field as ["full"]', () => {
		assert.deepEqual(readTierSlugs(fixtureDir(), 'full'), ['alpha', 'delta', 'gamma']);
	});

	it('applies the substring filter before the tier', () => {
		assert.deepEqual(readTierSlugs(fixtureDir(), 'mcp', 'alph'), ['alpha']);
	});

	it('returns everything when no tier is given', () => {
		assert.deepEqual(readTierSlugs(fixtureDir(), undefined), ['alpha', 'beta', 'delta', 'gamma']);
	});
});
