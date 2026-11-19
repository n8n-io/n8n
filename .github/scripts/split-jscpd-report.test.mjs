/**
 * Run these tests by running
 *
 * node --test .github/scripts/split-jscpd-report.test.mjs
 * */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitDuplicates, writeBuckets, parseBucketCount, loadDuplicates } from './split-jscpd-report.mjs';

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

describe('parseBucketCount', () => {
	it('parses a numeric string', () => {
		assert.equal(parseBucketCount('20'), 20);
	});

	it('defaults to 20 when unset', () => {
		assert.equal(parseBucketCount(undefined), 20);
	});

	it('rejects zero', () => {
		assert.throws(() => parseBucketCount('0'), /positive integer/);
	});

	it('rejects a negative count', () => {
		assert.throws(() => parseBucketCount('-1'), /positive integer/);
	});

	it('rejects a non-integer', () => {
		assert.throws(() => parseBucketCount('1.5'), /positive integer/);
	});

	it('rejects a non-numeric value', () => {
		assert.throws(() => parseBucketCount('abc'), /positive integer/);
	});
});

describe('loadDuplicates', () => {
	it('returns the duplicates array from a valid report', () => {
		const duplicates = loadDuplicates('/tmp/report.json', {
			read: () => JSON.stringify({ duplicates: [{ a: 1 }] }),
		});
		assert.deepEqual(duplicates, [{ a: 1 }]);
	});

	it('rejects a report missing the duplicates array', () => {
		assert.throws(
			() => loadDuplicates('/tmp/report.json', { read: () => JSON.stringify({}) }),
			/duplicates must be an array/,
		);
	});

	it('rejects a report whose duplicates field is not an array', () => {
		assert.throws(
			() => loadDuplicates('/tmp/report.json', { read: () => JSON.stringify({ duplicates: 'x' }) }),
			/duplicates must be an array/,
		);
	});

	it('propagates a JSON parse failure', () => {
		assert.throws(() => loadDuplicates('/tmp/report.json', { read: () => 'not json' }), SyntaxError);
	});
});
