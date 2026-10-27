import { describe, it, mock, before } from 'node:test';
import assert from 'node:assert/strict';
import { readPrLabels } from './github-helpers.mjs';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/cleanup-release-branch.test.mjs
 * */

// mock.module must be called before the module under test is imported,
// because static imports are hoisted and resolve before any code runs.
mock.module('./github-helpers.mjs', {
	namedExports: {
		ensureEnvVar: () => {}, // no-op
		readPrLabels: (pr) => {
			return readPrLabels(pr);
		},
	},
});

let pullRequestIsDismissedRelease;
before(async () => {
	({ pullRequestIsDismissedRelease } = await import('./cleanup-release-branch.mjs'));
});

describe('pullRequestIsDismissedRelease', () => {
	it('Recognizes classic dismissed pull request', () => {
		const pullRequest = {
			merged: false,
			labels: ['release'],
			base: {
				ref: 'release/2.9.0',
			},
			head: {
				ref: 'release-pr/2.9.0',
			},
		};

		/** @type { import('./cleanup-release-branch.mjs').PullRequestCheckResult } */
		const result = pullRequestIsDismissedRelease(pullRequest);

		assert.equal(result.pass, true);
		assert.equal(result.reason, undefined);
	});

	it("Doesn't pass PR with malformed head", () => {
		const pullRequest = {
			merged: false,
			labels: ['release'],
			base: {
				ref: 'release/2.9.0',
			},
			head: {
				ref: 'my-fork-release-pr/2.9.0',
			},
		};

		/** @type { import('./cleanup-release-branch.mjs').PullRequestCheckResult } */
		const result = pullRequestIsDismissedRelease(pullRequest);

		assert.equal(result.pass, false);
		assert.equal(result.reason, `Head ref '${pullRequest.head.ref}' is not release-pr/*`);
	});

	it("Doesn't pass PR with malformed base", () => {
		const pullRequest = {
			merged: false,
			labels: ['release'],
			base: {
				ref: 'master',
			},
			head: {
				ref: 'release-pr/2.9.0',
			},
		};

		/** @type { import('./cleanup-release-branch.mjs').PullRequestCheckResult } */
		const result = pullRequestIsDismissedRelease(pullRequest);

		assert.equal(result.pass, false);
		assert.equal(result.reason, `Base ref '${pullRequest.base.ref}' is not release/*`);
	});

	it("Doesn't pass merged PR's", () => {
		const pullRequest = {
			merged: true,
			labels: ['release'],
			base: {
				ref: 'release/2.9.0',
			},
			head: {
				ref: 'release-pr/2.9.0',
			},
		};

		/** @type { import('./cleanup-release-branch.mjs').PullRequestCheckResult } */
		const result = pullRequestIsDismissedRelease(pullRequest);

		assert.equal(result.pass, false);
		assert.equal(result.reason, `PR was merged`);
	});

	it("Doesn't pass on PR version mismatch", () => {
		const pullRequest = {
			merged: false,
			labels: ['release'],
			base: {
				ref: 'release/2.9.0',
			},
			head: {
				ref: 'release-pr/2.9.1',
			},
		};

		/** @type { import('./cleanup-release-branch.mjs').PullRequestCheckResult } */
		const result = pullRequestIsDismissedRelease(pullRequest);

		assert.equal(result.pass, false);
		assert.equal(
			result.reason,
			`Version mismatch: base='${pullRequest.base.ref.replace('release/', '')}' head='${pullRequest.head.ref.replace('release-pr/', '')}'`,
		);
	});

	it("Doesn't pass a PR with missing 'release' label", () => {
		const pullRequest = {
			merged: false,
			labels: ['release-pr', 'core-team'],
			base: {
				ref: 'release/2.9.0',
			},
			head: {
				ref: 'release-pr/2.9.0',
			},
		};

		/** @type { import('./cleanup-release-branch.mjs').PullRequestCheckResult } */
		const result = pullRequestIsDismissedRelease(pullRequest);

		assert.equal(result.pass, false);
		assert.equal(
			result.reason,
			`Missing required label 'release' (labels: ${pullRequest.labels.join(', ')})`,
		);
	});
});
