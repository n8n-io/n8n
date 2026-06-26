import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Run with:
 * node --test --experimental-test-module-mocks ./.github/scripts/plan-mcp-shards.test.mjs
 */
const { chunkSlugs, planShards, readTierSlugs } = await import('./plan-mcp-shards.mjs');

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

describe('planShards', () => {
	it('emits an include-only matrix with stringified indices and csv slugs', () => {
		assert.deepEqual(planShards(['a', 'b', 'c', 'd', 'e'], 2), {
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
