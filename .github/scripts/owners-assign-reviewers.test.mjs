import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/owners-assign-reviewers.test.mjs
 * */

/** @type {() => string[]} */
let readPrLabelsImpl = () => [];
/** @type {(pullRequestNumber: number) => Promise<Set<string>>} */
let getChangedFilesImpl = async () => new Set();
/** @type {(pullRequestNumber: number, teamSlugs: string[]) => Promise<void>} */
let requestTeamReviewersImpl = async () => {};
/** @type {(pullRequestNumber: number, label: string) => Promise<void>} */
let addLabelImpl = async () => {};
/** @type {(pullRequestNumber: number, label: string) => Promise<void>} */
let removeLabelImpl = async () => {};

mock.module('./github-helpers.mjs', {
	namedExports: {
		ensureEnvVar: () => {}, // no-op in tests
		readPrLabels: () => readPrLabelsImpl(),
		getChangedFiles: (n) => getChangedFilesImpl(n),
		requestTeamReviewers: (pullRequestNumber, teamSlugs) =>
			requestTeamReviewersImpl(pullRequestNumber, teamSlugs),
		addLabel: (pullRequestNumber, label) => addLabelImpl(pullRequestNumber, label),
		removeLabel: (pullRequestNumber, label) => removeLabelImpl(pullRequestNumber, label),
	},
});

/** @type {() => Array<{ filepath: string, team: string }>} */
let parseOwnersFileImpl = () => [];
/** @type {(files: Set<string>, owners: Array<{ filepath: string, team: string }>) => Map<string, string[]>} */
let assignOwnershipImpl = () => new Map();
/** @type {(ownerships: Map<string, string[]>) => Array<{ team: string, fileCount: number }>} */
let ownershipsToAllocationsImpl = () => [];

mock.module('./owners.mjs', {
	namedExports: {
		parseOwnersFile: () => parseOwnersFileImpl(),
		assignOwnership: (files, owners) => assignOwnershipImpl(files, owners),
		ownershipsToAllocations: (ownerships) => ownershipsToAllocationsImpl(ownerships),
	},
});

const {
	AUTO_ASSIGN_LABEL,
	ASSIGNED_LABEL,
	teamHandleToSlug,
	hasAutoAssignLabel,
	resolveOwnerTeamSlugs,
	run,
} = await import('./owners-assign-reviewers.mjs');

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

describe('hasAutoAssignLabel', () => {
	it('returns true when the label is present', () => {
		assert.equal(hasAutoAssignLabel(['bug', AUTO_ASSIGN_LABEL]), true);
	});

	it('returns false when the label is absent', () => {
		assert.equal(hasAutoAssignLabel(['bug', 'enhancement']), false);
	});

	it('returns false for an empty label set', () => {
		assert.equal(hasAutoAssignLabel([]), false);
	});
});

describe('resolveOwnerTeamSlugs', () => {
	beforeEach(() => {
		parseOwnersFileImpl = () => [];
		assignOwnershipImpl = () => new Map();
		ownershipsToAllocationsImpl = () => [];
	});

	it('maps allocations to team slugs in allocation order', () => {
		ownershipsToAllocationsImpl = () => [
			{ team: '@n8n-io/catalysts', fileCount: 3 },
			{ team: '@n8n-io/qa-dx', fileCount: 1 },
		];

		assert.deepEqual(resolveOwnerTeamSlugs(new Set(['a.ts'])), ['catalysts', 'qa-dx']);
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
		readPrLabelsImpl = () => [AUTO_ASSIGN_LABEL];
		getChangedFilesImpl = async () => new Set(['a.ts']);
		parseOwnersFileImpl = () => [];
		assignOwnershipImpl = () => new Map();
		ownershipsToAllocationsImpl = () => [{ team: '@n8n-io/catalysts', fileCount: 1 }];
		requestTeamReviewers = mock.fn(async () => {});
		requestTeamReviewersImpl = requestTeamReviewers;
		addLabel = mock.fn(async () => {});
		addLabelImpl = addLabel;
		removeLabel = mock.fn(async () => {});
		removeLabelImpl = removeLabel;
	});

	it('requests review from the owning team slugs when the label is present', async () => {
		ownershipsToAllocationsImpl = () => [
			{ team: '@n8n-io/catalysts', fileCount: 2 },
			{ team: '@n8n-io/qa-dx', fileCount: 1 },
		];

		await run(42);

		assert.equal(requestTeamReviewers.mock.calls.length, 1);
		assert.equal(requestTeamReviewers.mock.calls[0].arguments[0], 42);
		assert.deepEqual(requestTeamReviewers.mock.calls[0].arguments[1], ['catalysts', 'qa-dx']);
	});

	it('swaps the trigger label for the done-marker after assigning', async () => {
		await run(42);

		assert.deepEqual(addLabel.mock.calls[0].arguments, [42, ASSIGNED_LABEL]);
		assert.deepEqual(removeLabel.mock.calls[0].arguments, [42, AUTO_ASSIGN_LABEL]);
	});

	it('is a no-op when the trigger label is absent', async () => {
		readPrLabelsImpl = () => ['bug'];

		await run(42);

		assert.equal(requestTeamReviewers.mock.calls.length, 0);
		assert.equal(addLabel.mock.calls.length, 0);
		assert.equal(removeLabel.mock.calls.length, 0);
	});

	it('is a no-op when the done-marker label is already present', async () => {
		readPrLabelsImpl = () => [AUTO_ASSIGN_LABEL, ASSIGNED_LABEL];

		await run(42);

		assert.equal(requestTeamReviewers.mock.calls.length, 0);
		assert.equal(addLabel.mock.calls.length, 0);
		assert.equal(removeLabel.mock.calls.length, 0);
	});

	it('does not request reviewers or relabel when no team owns a changed file', async () => {
		ownershipsToAllocationsImpl = () => [];

		await run(42);

		assert.equal(requestTeamReviewers.mock.calls.length, 0);
		assert.equal(addLabel.mock.calls.length, 0);
		assert.equal(removeLabel.mock.calls.length, 0);
	});
});
