/**
 * Run these tests by running
 *
 * node --test .github/scripts/split-jscpd-report.test.mjs
 * */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitDuplicates, writeBuckets } from './split-jscpd-report.mjs';

describe('splitDuplicates', () => {
	it('distributes entries round-robin across buckets', () => {
		const duplicates = [1, 2, 3, 4, 5, 6];
		const buckets = splitDuplicates(duplicates, 3);
		assert.deepEqual(buckets, [
			[1, 4],
			[2, 5],
			[3, 6],
		]);
	});

	it('leaves later buckets empty when there are fewer entries than buckets', () => {
		const buckets = splitDuplicates([1, 2], 5);
		assert.equal(buckets.length, 5);
		assert.deepEqual(buckets[0], [1]);
		assert.deepEqual(buckets[1], [2]);
		assert.deepEqual(buckets[2], []);
	});

	it('returns bucketCount empty arrays for an empty report', () => {
		const buckets = splitDuplicates([], 4);
		assert.deepEqual(buckets, [[], [], [], []]);
	});
});

describe('writeBuckets', () => {
	it('writes one JSON file per bucket, named by index', () => {
		const written = [];
		const paths = writeBuckets([[{ a: 1 }], [{ b: 2 }]], '/tmp/buckets', {
			mkdir: () => {},
			write: (path, contents) => written.push({ path, contents }),
		});
		assert.deepEqual(paths, ['/tmp/buckets/bucket-0.json', '/tmp/buckets/bucket-1.json']);
		assert.deepEqual(JSON.parse(written[0].contents), { duplicates: [{ a: 1 }] });
		assert.deepEqual(JSON.parse(written[1].contents), { duplicates: [{ b: 2 }] });
	});

	it('creates the output directory before writing', () => {
		let mkdirCalledWith = null;
		writeBuckets([[]], '/tmp/buckets', {
			mkdir: (dir, opts) => {
				mkdirCalledWith = { dir, opts };
			},
			write: () => {},
		});
		assert.deepEqual(mkdirCalledWith, { dir: '/tmp/buckets', opts: { recursive: true } });
	});
});
