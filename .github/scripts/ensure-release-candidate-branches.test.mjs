import { describe, it, mock, before } from 'node:test';
import assert from 'node:assert/strict';
import { RELEASE_CANDIDATE_BRANCH_PREFIX } from './github-helpers.mjs';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/ensure-release-candidate-branches.test.mjs
 * */

let tagVersionInfoToReleaseCandidateBranchName;
before(async () => {
	({ tagVersionInfoToReleaseCandidateBranchName } = await import('./github-helpers.mjs'));
});

// mock.module must be called before the module under test is imported,
// because static imports are hoisted and resolve before any code runs.
mock.module('./github-helpers.mjs', {
	namedExports: {
		RELEASE_TRACKS: ['stable', 'beta', 'v1'],
		RELEASE_PREFIX: 'n8n@',
		RELEASE_CANDIDATE_BRANCH_PREFIX: RELEASE_CANDIDATE_BRANCH_PREFIX,
		tagVersionInfoToReleaseCandidateBranchName,
		resolveReleaseTagForTrack: (track) => {
			// Always return deterministic data
			if (track === 'stable') return { version: '2.9.2', tag: 'n8n@2.9.2' };
			if (track === 'beta') return { version: '2.10.1', tag: 'n8n@2.10.1' };
			return { version: '1.123.33', tag: 'n8n@1.123.33' };
		},
		writeGithubOutput: () => {}, // no-op in tests
		sh: () => {}, // no-op in tests
		getCommitForRef: () => {}, // no-op in tests
		remoteBranchExists: () => {}, // no-op in tests
		localRefExists: () => {}, // no-op in tests
	},
});

let determineBranchChanges;
before(async () => {
	({ determineBranchChanges } = await import('./ensure-release-candidate-branches.mjs'));
});

describe('Determine branch changes', () => {
	it('Correctly determines ensureable branches', () => {
		const output = determineBranchChanges();
		const ensureBranches = output.branchesToEnsure.map(tagVersionInfoToReleaseCandidateBranchName);

		assert.ok(
			ensureBranches.includes('release-candidate/2.10.x'),
			"Beta release-candidate branch doesn't exist",
		);

		assert.ok(
			ensureBranches.includes('release-candidate/2.9.x'),
			"Stable release-candidate branch doesn't exist",
		);
	});

	it('Correctly determines deprecated branches', () => {
		/** @type { import('./ensure-release-candidate-branches.mjs').BranchChanges} */
		const output = determineBranchChanges();

		assert.ok(
			output.branchesToDeprecate.includes('release-candidate/2.7.x'),
			'Existing branch release-candidate/2.7.x should be marked for removal',
		);
	});
});
