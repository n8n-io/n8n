import { describe, it, mock, before } from 'node:test';
import assert from 'node:assert/strict';

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
		readPrLabels: () => {}, // no-op
		resolveRcBranchForTrack: mockResolveRcBranchForTrack,
		writeGithubOutput: () => {}, //no-op
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

let labelsToReleaseCandidateBranches;
before(async () => {
	({ labelsToReleaseCandidateBranches } = await import('./compute-backport-targets.mjs'));
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
});
