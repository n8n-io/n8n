import { describe, it, mock, before } from 'node:test';
import assert from 'node:assert/strict';
import { readPrLabels } from './github-helpers.mjs';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/compute-backport-targets.test.mjs
 * */

// mock.module must be called before the module under test is imported,
// because static imports are hoisted and resolve before any code runs.
mock.module('./github-helpers.mjs', {
	namedExports: {
		ensureEnvVar: () => {}, // no-op
		readPrLabels: readPrLabels,
		resolveRcBranchForTrack: mockResolveRcBranchForTrack,
		writeGithubOutput: () => {}, //no-op
		getPullRequestById: () => {
			return {
				labels: ['n8n team', 'Backport to Beta'],
			};
		},
	},
});

function mockResolveRcBranchForTrack(track) {
	switch (track) {
		case 'beta':
			return 'release-candidate/2.10.1';
		case 'stable':
			return 'release-candidate/2.9.4';
	}
	return undefined;
}

let labelsToReleaseCandidateBranches, getLabels;
before(async () => {
	({ labelsToReleaseCandidateBranches, getLabels } = await import(
		'./compute-backport-targets.mjs'
	));
});

describe('Compute backport targets', () => {
	it('Finds backport branches for pointer tag labels', () => {
		const labels = new Set(['Backport to Beta', 'Backport to Stable']);
		/** @type { Set<string> } */
		const result = labelsToReleaseCandidateBranches(labels);

		assert.equal(result.size, 2);
		assert.ok(result.has('release-candidate/2.10.1'));
		assert.ok(result.has('release-candidate/2.9.4'));
	});

	it("Doesn't parse other labes to backport branches", () => {
		const labels = new Set(['n8n team', 'release']);
		/** @type { Set<string> } */
		const result = labelsToReleaseCandidateBranches(labels);

		assert.equal(result.size, 0);
	});

	it("Doesn't parse malformed backport labels", () => {
		const labels = new Set(['Backport to Fork', 'Backport to my Home']);
		/** @type { Set<string> } */
		const result = labelsToReleaseCandidateBranches(labels);

		assert.equal(result.size, 0);
	});

	it('Should parse labels properly in Pull request context', async () => {
		process.env.GITHUB_EVENT_PATH = './fixtures/mock-github-event.json';
		/** @type { Set<string> } */
		const labels = await getLabels();

		assert.equal(labels.size, 2);
		assert.ok(labels.has('release'));
		assert.ok(labels.has('Backport to Stable'));
	});
	it('Should parse labels properly in manual workflow context', async () => {
		process.env.PULL_REQUEST_ID = '123';
		/** @type { Set<string> } */
		const labels = await getLabels();

		assert.equal(labels.size, 2);
		assert.ok(labels.has('n8n team'));
		assert.ok(labels.has('Backport to Beta'));
	});

	it('Should throw when passed pull request id with #', async () => {
		process.env.PULL_REQUEST_ID = '#123';
		await assert.rejects(getLabels);
	});

	it('Should not throw when passed pull request id with just a number', async () => {
		process.env.PULL_REQUEST_ID = '123';
		await assert.doesNotReject(getLabels);
	});

	it('Should throw when passed pull request id with other than numbers included', async () => {
		process.env.PULL_REQUEST_ID = 'abc-123';
		await assert.rejects(getLabels);
	});
});
