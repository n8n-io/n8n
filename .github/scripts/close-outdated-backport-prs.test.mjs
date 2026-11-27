import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { setOctokit } from './github-helpers.mjs';
import {
	closeOutdatedBackportPrs,
	commentBody,
	isOlderThan,
	originalPrNumber,
	parseReleaseCandidateBranch,
	parseReleaseLine,
	resolveStableLine,
} from './close-outdated-backport-prs.mjs';

/**
 * Run these tests by running
 *
 * node --test ./.github/scripts/close-outdated-backport-prs.test.mjs
 * */

describe('parseReleaseLine', () => {
	it('parses a plain version and a release tag', () => {
		assert.deepEqual(parseReleaseLine('2.49.8'), { major: 2, minor: 49 });
		assert.deepEqual(parseReleaseLine('n8n@2.50.0'), { major: 2, minor: 50 });
	});

	it('returns null for other values', () => {
		assert.equal(parseReleaseLine('stable'), null);
		assert.equal(parseReleaseLine('2.49'), null);
		assert.equal(parseReleaseLine('2.49.0-rc.1'), null);
	});
});

describe('parseReleaseCandidateBranch', () => {
	it('parses a release-candidate branch', () => {
		assert.deepEqual(parseReleaseCandidateBranch('release-candidate/2.47.x'), {
			major: 2,
			minor: 47,
		});
	});

	it('returns null for other branches', () => {
		assert.equal(parseReleaseCandidateBranch('1.x'), null);
		assert.equal(parseReleaseCandidateBranch('master'), null);
		assert.equal(parseReleaseCandidateBranch('release/2.47.1'), null);
		assert.equal(parseReleaseCandidateBranch('release-candidate/2.47.1'), null);
	});
});

describe('isOlderThan', () => {
	const stable = { major: 2, minor: 49 };

	it('compares the minor in the same major', () => {
		assert.equal(isOlderThan({ major: 2, minor: 48 }, stable), true);
		assert.equal(isOlderThan({ major: 2, minor: 49 }, stable), false);
		assert.equal(isOlderThan({ major: 2, minor: 50 }, stable), false);
	});

	it('compares the major first', () => {
		assert.equal(isOlderThan({ major: 1, minor: 120 }, stable), true);
		assert.equal(isOlderThan({ major: 3, minor: 0 }, stable), false);
	});
});

describe('resolveStableLine', () => {
	it('returns the line of the release tag on the stable commit', () => {
		const tagToSha = new Map([
			['stable', 'aaa'],
			['beta', 'bbb'],
			['n8n@2.49.8', 'aaa'],
			['n8n@2.50.3', 'bbb'],
			['n8n@2.49.7', 'ccc'],
		]);
		assert.deepEqual(resolveStableLine(tagToSha), { major: 2, minor: 49 });
	});

	it('returns null without a stable tag or a release tag on its commit', () => {
		assert.equal(resolveStableLine(new Map([['n8n@2.49.8', 'aaa']])), null);
		assert.equal(resolveStableLine(new Map([['stable', 'aaa']])), null);
	});
});

describe('originalPrNumber', () => {
	it('reads the original PR from a backport head branch', () => {
		assert.equal(originalPrNumber('backport-43890-to-release-candidate/2.47.x'), 43890);
	});

	it('returns null for other branches', () => {
		assert.equal(originalPrNumber('fix/something'), null);
	});
});

describe('commentBody', () => {
	const stable = { major: 2, minor: 49 };

	it('points to the original PR', () => {
		const body = commentBody({
			baseRef: 'release-candidate/2.47.x',
			headRef: 'backport-43890-to-release-candidate/2.47.x',
			stable,
		});
		assert.match(body, /targets `release-candidate\/2\.47\.x`/);
		assert.match(body, /`Backport to Stable` label to #43890/);
	});

	it('names the stable branch when the original PR is unknown', () => {
		const body = commentBody({ baseRef: 'release-candidate/2.47.x', headRef: 'manual', stable });
		assert.match(body, /backport it to `release-candidate\/2\.49\.x`/);
	});
});

describe('closeOutdatedBackportPrs', () => {
	/** @type {Record<number, { base: string, head: string }>} */
	const prs = {
		1: { base: 'release-candidate/2.47.x', head: 'backport-11-to-release-candidate/2.47.x' },
		2: { base: 'release-candidate/2.49.x', head: 'backport-12-to-release-candidate/2.49.x' },
		3: { base: 'release-candidate/2.50.x', head: 'backport-13-to-release-candidate/2.50.x' },
		4: { base: '1.x', head: 'backport-14-to-1.x' },
	};

	/** @type {{ comments: number[], closed: number[] }} */
	let calls;
	/** @type {string | undefined} */
	let previousRepository;

	beforeEach(() => {
		calls = { comments: [], closed: [] };
		previousRepository = process.env.GITHUB_REPOSITORY;
		process.env.GITHUB_REPOSITORY = 'n8n-io/n8n';

		const octokit = {
			paginate: async () => [
				...Object.keys(prs).map((n) => ({ number: Number(n), pull_request: {} })),
				{ number: 99 }, // a plain issue with the label
			],
			rest: {
				issues: {
					listForRepo: () => {},
					createComment: async ({ issue_number }) => calls.comments.push(issue_number),
				},
				pulls: {
					get: async ({ pull_number }) => ({
						data: {
							number: pull_number,
							base: { ref: prs[pull_number].base },
							head: { ref: prs[pull_number].head },
						},
					}),
					update: async ({ pull_number, state }) => {
						assert.equal(state, 'closed');
						calls.closed.push(pull_number);
					},
				},
			},
		};
		setOctokit(/** @type {any} */ (octokit));
	});

	afterEach(() => {
		setOctokit(null);
		if (previousRepository === undefined) delete process.env.GITHUB_REPOSITORY;
		else process.env.GITHUB_REPOSITORY = previousRepository;
	});

	it('comments on and closes only PRs into lines older than stable', async () => {
		const closed = await closeOutdatedBackportPrs({ stable: { major: 2, minor: 49 } });

		assert.deepEqual(closed, [1]);
		assert.deepEqual(calls.comments, [1]);
		assert.deepEqual(calls.closed, [1]);
	});

	it('changes nothing in dry-run mode', async () => {
		const closed = await closeOutdatedBackportPrs({
			stable: { major: 2, minor: 50 },
			dryRun: true,
		});

		assert.deepEqual(closed, [1, 2]);
		assert.deepEqual(calls.comments, []);
		assert.deepEqual(calls.closed, []);
	});
});
