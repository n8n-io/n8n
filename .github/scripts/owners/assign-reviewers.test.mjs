import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import * as owners from './owners.mjs';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/owners/assign-reviewers.test.mjs
 * */

/** @type {string[]} */
let labels = [];
/** @type {(pullRequestNumber: number) => Promise<Set<string>>} */
let getChangedFilesImpl = async () => new Set();
/** @type {(pullRequestNumber: number, teamSlugs: string[]) => Promise<void>} */
let requestTeamReviewersImpl = async () => {};
/** @type {(pullRequestNumber: number, label: string) => Promise<void>} */
let addLabelImpl = async () => {};
/** @type {(pullRequestNumber: number, label: string) => Promise<void>} */
let removeLabelImpl = async () => {};

mock.module('../github-helpers.mjs', {
	namedExports: {
		ensureEnvVar: () => {}, // no-op in tests
		getPullRequestById: async () => ({ labels }),
		readPrLabels: (pr) => pr.labels,
		getChangedFiles: (n) => getChangedFilesImpl(n),
		requestTeamReviewers: (pullRequestNumber, teamSlugs) =>
			requestTeamReviewersImpl(pullRequestNumber, teamSlugs),
		addLabel: (pullRequestNumber, label) => addLabelImpl(pullRequestNumber, label),
		removeLabel: (pullRequestNumber, label) => removeLabelImpl(pullRequestNumber, label),
	},
});

const ownersContent = `
src/ @n8n-io/catalysts required
src/optional/ @n8n-io/qa-dx
tests/ @n8n-io/test-owners required
`;
const changedFiles = new Set(['src/a.ts', 'src/b.ts', 'src/optional/a.ts', 'tests/a.test.ts']);
const allTeamSlugs = ['catalysts', 'qa-dx', 'test-owners'];

mock.module('./owners.mjs', {
	namedExports: {
		...owners,
		parseOwnersFile: () => owners.parseOwnersContent(ownersContent),
	},
});

const {
	AUTO_ASSIGN_LABEL,
	AUTO_ASSIGN_REQUIRED_LABEL,
	ASSIGNED_LABEL,
	teamHandleToSlug,
	resolveOwnerTeamSlugs,
	run,
} = await import('./assign-reviewers.mjs');

describe('teamHandleToSlug', () => {
	it('strips the org prefix from an OWNERS team handle', () => {
		assert.equal(teamHandleToSlug('@n8n-io/catalysts'), 'catalysts');
	});

	it('leaves a bare slug untouched', () => {
		assert.equal(teamHandleToSlug('catalysts'), 'catalysts');
	});

	it('only strips the first segment', () => {
		assert.equal(teamHandleToSlug('@n8n-io/migrations-review'), 'migrations-review');
	});
});

describe('resolveOwnerTeamSlugs', () => {
	it('returns each owning team once', () => {
		assert.deepEqual(resolveOwnerTeamSlugs(changedFiles), allTeamSlugs);
	});

	it('returns an empty array when no team owns a file', () => {
		assert.deepEqual(resolveOwnerTeamSlugs(new Set(['a.ts'])), []);
	});
});

describe('run', () => {
	let requestTeamReviewers;
	let addLabel;
	let removeLabel;

	beforeEach(() => {
		labels = [AUTO_ASSIGN_LABEL];
		getChangedFilesImpl = async () => changedFiles;
		requestTeamReviewers = mock.fn(async () => {});
		requestTeamReviewersImpl = requestTeamReviewers;
		addLabel = mock.fn(async () => {});
		addLabelImpl = addLabel;
		removeLabel = mock.fn(async () => {});
		removeLabelImpl = removeLabel;
	});

	it('requests review from the owning team slugs when the label is present', async () => {
		await run(42);

		assert.equal(requestTeamReviewers.mock.calls.length, 1);
		assert.deepEqual(requestTeamReviewers.mock.calls[0].arguments, [42, allTeamSlugs]);
	});

	it('requests only required teams for changed non-test files', async () => {
		labels = [AUTO_ASSIGN_REQUIRED_LABEL];

		await run(42);

		assert.equal(requestTeamReviewers.mock.calls.length, 1);
		assert.deepEqual(requestTeamReviewers.mock.calls[0].arguments, [42, ['catalysts']]);
		assert.deepEqual(addLabel.mock.calls[0].arguments, [42, ASSIGNED_LABEL]);
		assert.deepEqual(removeLabel.mock.calls[0].arguments, [42, AUTO_ASSIGN_REQUIRED_LABEL]);
	});

	it('requests all owning teams once when both trigger labels are present', async () => {
		labels = [AUTO_ASSIGN_REQUIRED_LABEL, AUTO_ASSIGN_LABEL];

		await run(42);

		assert.equal(requestTeamReviewers.mock.calls.length, 1);
		assert.deepEqual(requestTeamReviewers.mock.calls[0].arguments, [42, allTeamSlugs]);
		assert.deepEqual(
			removeLabel.mock.calls.map(({ arguments: args }) => args),
			[
				[42, AUTO_ASSIGN_LABEL],
				[42, AUTO_ASSIGN_REQUIRED_LABEL],
			],
		);
	});

	it('swaps the trigger label for the done-marker after assigning', async () => {
		await run(42);

		assert.deepEqual(addLabel.mock.calls[0].arguments, [42, ASSIGNED_LABEL]);
		assert.deepEqual(removeLabel.mock.calls[0].arguments, [42, AUTO_ASSIGN_LABEL]);
	});

	it('is a no-op when the trigger label is absent', async () => {
		labels = ['bug'];

		await run(42);

		assert.equal(requestTeamReviewers.mock.calls.length, 0);
		assert.equal(addLabel.mock.calls.length, 0);
		assert.equal(removeLabel.mock.calls.length, 0);
	});

	it('clears a trigger added during assignment without requesting reviews again', async () => {
		labels = [AUTO_ASSIGN_REQUIRED_LABEL];
		requestTeamReviewersImpl = async (...args) => {
			await requestTeamReviewers(...args);
			labels.push(AUTO_ASSIGN_LABEL);
		};
		addLabelImpl = async (pr, label) => {
			await addLabel(pr, label);
			labels.push(label);
		};
		removeLabelImpl = async (pr, label) => {
			await removeLabel(pr, label);
			labels = labels.filter((current) => current !== label);
		};

		await run(42);
		assert.deepEqual(labels, [AUTO_ASSIGN_LABEL, ASSIGNED_LABEL]);
		await run(42);

		assert.equal(requestTeamReviewers.mock.calls.length, 1);
		assert.deepEqual(requestTeamReviewers.mock.calls[0].arguments, [42, ['catalysts']]);
		assert.equal(addLabel.mock.calls.length, 1);
		assert.deepEqual(labels, [ASSIGNED_LABEL]);
	});

	it('does not request reviewers or relabel when no team owns a changed file', async () => {
		getChangedFilesImpl = async () => new Set(['a.ts']);

		await run(42);

		assert.equal(requestTeamReviewers.mock.calls.length, 0);
		assert.equal(addLabel.mock.calls.length, 0);
		assert.equal(removeLabel.mock.calls.length, 0);
	});

	it('keeps the required-only trigger label when no changed file needs approval', async () => {
		labels = [AUTO_ASSIGN_REQUIRED_LABEL];
		getChangedFilesImpl = async () => new Set(['src/optional/a.ts', 'tests/a.test.ts']);

		await run(42);

		assert.equal(requestTeamReviewers.mock.calls.length, 0);
		assert.equal(addLabel.mock.calls.length, 0);
		assert.equal(removeLabel.mock.calls.length, 0);
	});
});
