/**
 * Run these tests with:
 *
 * node --test ./.github/scripts/prepare-rerelease.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	assertRereleaseTarget,
	computeRereleaseVersion,
	isPublished,
	assertRereleaseIsWarranted,
	buildChangelogEntry,
} from './prepare-rerelease.mjs';

/** @param {Record<string, number>} statusByVersion */
function fakeFetch(statusByVersion) {
	return async (/** @type {string} */ url) => {
		const version = url.split('/').pop();
		const status = statusByVersion[version];
		if (status === undefined) throw new Error(`unexpected version requested: ${version}`);
		return { status };
	};
}

describe('assertRereleaseTarget', () => {
	it('accepts a tree that sits exactly on the failed version', () => {
		assert.doesNotThrow(() => assertRereleaseTarget('2.27.2', '2.27.2', '2.27.2'));
	});

	it('rejects an invalid FAILED_VERSION', () => {
		assert.throws(() => assertRereleaseTarget('2.27.2', '2.27.2', 'release/2.27.2'), {
			message: /not a valid semver/,
		});
	});

	it('rejects a prerelease, which would not increment to a free version', () => {
		assert.throws(() => assertRereleaseTarget('2.28.0-rc.1', '2.28.0-rc.1', '2.28.0-rc.1'), {
			message: /prerelease is not supported/,
		});
	});

	it('rejects a root/cli version mismatch', () => {
		assert.throws(() => assertRereleaseTarget('2.27.2', '2.27.1', '2.27.2'), {
			message: /disagree/,
		});
	});

	it('rejects a tree that is not on the failed version', () => {
		assert.throws(() => assertRereleaseTarget('2.28.0', '2.28.0', '2.27.2'), {
			message: /Checked-out tree is at 2\.28\.0, expected 2\.27\.2/,
		});
	});
});

describe('computeRereleaseVersion', () => {
	it('increments the patch', () => {
		assert.equal(computeRereleaseVersion('2.27.2'), '2.27.3');
	});

	it('increments a .0 patch', () => {
		assert.equal(computeRereleaseVersion('2.28.0'), '2.28.1');
	});

	it('handles multi-digit versions', () => {
		assert.equal(computeRereleaseVersion('10.20.30'), '10.20.31');
	});
});

describe('isPublished', () => {
	it('reports 200 as published', async () => {
		assert.equal(await isPublished('n8n', '2.27.2', fakeFetch({ '2.27.2': 200 })), true);
	});

	it('reports 404 as not published', async () => {
		assert.equal(await isPublished('n8n', '2.27.3', fakeFetch({ '2.27.3': 404 })), false);
	});

	it('returns null on an unexpected status', async () => {
		assert.equal(await isPublished('n8n', '2.27.3', fakeFetch({ '2.27.3': 500 })), null);
	});

	it('returns null when the registry is unreachable', async () => {
		const failing = async () => {
			throw new Error('ENOTFOUND');
		};
		assert.equal(await isPublished('n8n', '2.27.3', failing), null);
	});

	it('encodes a scoped package name', async () => {
		let requested;
		await isPublished('@n8n/db', '1.0.0', async (url) => {
			requested = url;
			return { status: 200 };
		});
		assert.equal(requested, 'https://registry.npmjs.org/@n8n%2fdb/1.0.0');
	});
});

describe('assertRereleaseIsWarranted', () => {
	it('passes when the failed version is burned and the next one is free', async () => {
		await assert.doesNotReject(
			assertRereleaseIsWarranted('2.27.2', '2.27.3', fakeFetch({ '2.27.2': 200, '2.27.3': 404 })),
		);
	});

	it('rejects when the failed version was never published', async () => {
		await assert.rejects(
			assertRereleaseIsWarranted('2.27.2', '2.27.3', fakeFetch({ '2.27.2': 404, '2.27.3': 404 })),
			{ message: /is not on npm/ },
		);
	});

	it('rejects when the next version is already taken', async () => {
		await assert.rejects(
			assertRereleaseIsWarranted('2.27.2', '2.27.3', fakeFetch({ '2.27.2': 200, '2.27.3': 200 })),
			{ message: /2\.27\.3 is already on npm/ },
		);
	});

	it('fails closed when the registry is unreachable', async () => {
		const failing = async () => {
			throw new Error('ENOTFOUND');
		};
		await assert.rejects(assertRereleaseIsWarranted('2.27.2', '2.27.3', failing), {
			message: /Could not determine what is published/,
		});
	});

	it('fails closed on an unexpected registry status', async () => {
		await assert.rejects(
			assertRereleaseIsWarranted('2.27.2', '2.27.3', fakeFetch({ '2.27.2': 200, '2.27.3': 500 })),
			{ message: /Could not determine what is published/ },
		);
	});
});

describe('buildChangelogEntry', () => {
	it('renders a patch-level heading with a compare link', () => {
		const entry = buildChangelogEntry('2.27.2', '2.27.3', '2026-08-27');
		assert.equal(
			entry.split('\n')[0],
			'## [2.27.3](https://github.com/n8n-io/n8n/compare/n8n@2.27.2...n8n@2.27.3) (2026-08-27)',
		);
		assert.match(entry, /Re-release of 2\.27\.2/);
		assert.ok(entry.endsWith('\n'));
	});
});
