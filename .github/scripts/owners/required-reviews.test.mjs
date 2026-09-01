import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/owners/required-reviews.test.mjs
 * */

/** @type {() => any} */
let eventImpl = () => ({});
/** @type {(pullRequestNumber: number) => Promise<any>} */
let getPullRequestByIdImpl = async () => ({});
/** @type {(pullRequestNumber: number) => Promise<Set<string>>} */
let getChangedFilesImpl = async () => new Set();
/** @type {(pullRequestNumber: number) => Promise<any[]>} */
let getPrReviewsImpl = async () => [];
/** @type {(teamSlug: string, username: string) => Promise<boolean>} */
let isTeamMemberImpl = async () => false;
/** @type {(sha: string, status: any) => Promise<void>} */
let setCommitStatusImpl = async () => {};

mock.module('../github-helpers.mjs', {
	namedExports: {
		getEventFromGithubEventPath: () => eventImpl(),
		getPullRequestById: (n) => getPullRequestByIdImpl(n),
		getChangedFiles: (n) => getChangedFilesImpl(n),
		getPrReviews: (n) => getPrReviewsImpl(n),
		isTeamMember: (slug, username) => isTeamMemberImpl(slug, username),
		setCommitStatus: (sha, status) => setCommitStatusImpl(sha, status),
	},
});

/** @type {() => Array<import('./owners.mjs').OwnersEntry>} */
let parseOwnersFileImpl = () => [];
/** @type {(files: Set<string>, entries: any[]) => Map<string, string[]>} */
let resolveRequiredTeamsImpl = () => new Map();

mock.module('./owners.mjs', {
	namedExports: {
		parseOwnersFile: () => parseOwnersFileImpl(),
		resolveRequiredTeams: (files, entries) => resolveRequiredTeamsImpl(files, entries),
		// Mirrors the real implementation; the mock replaces the whole module.
		teamHandleToSlug: (team) => team.replace(/^@[^/]+\//, ''),
	},
});

const {
	STATUS_CONTEXT,
	buildStatus,
	collectApprovers,
	latestReviewStates,
	resolvePullRequestNumber,
	run,
} = await import('./required-reviews.mjs');

describe('resolvePullRequestNumber', () => {
	it('reads the PR number from pull_request payloads', () => {
		assert.equal(
			resolvePullRequestNumber('pull_request', { pull_request: { number: 42 } }, undefined),
			42,
		);
	});

	it('falls back to the PULL_REQUEST_NUMBER env value for workflow_dispatch', () => {
		assert.equal(resolvePullRequestNumber('workflow_dispatch', {}, '7'), 7);
	});

	it('throws when no source yields a PR number', () => {
		assert.throws(() => resolvePullRequestNumber('workflow_dispatch', {}, undefined), /Cannot resolve/);
	});
});

describe('latestReviewStates', () => {
	it('keeps only the latest meaningful state per reviewer', () => {
		const states = latestReviewStates([
			{ user: { login: 'ana' }, state: 'CHANGES_REQUESTED', submitted_at: '2026-01-01T00:00:00Z' },
			{ user: { login: 'ana' }, state: 'APPROVED', submitted_at: '2026-01-02T00:00:00Z' },
			{ user: { login: 'ben' }, state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' },
			{ user: { login: 'ben' }, state: 'DISMISSED', submitted_at: '2026-01-03T00:00:00Z' },
		]);

		assert.equal(states.get('ana'), 'APPROVED');
		assert.equal(states.get('ben'), 'DISMISSED');
	});

	it('ignores COMMENTED and PENDING reviews', () => {
		const states = latestReviewStates([
			{ user: { login: 'ana' }, state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' },
			{ user: { login: 'ana' }, state: 'COMMENTED', submitted_at: '2026-01-02T00:00:00Z' },
			{ user: { login: 'ben' }, state: 'PENDING' },
		]);

		assert.equal(states.get('ana'), 'APPROVED');
		assert.equal(states.has('ben'), false);
	});

	it('sorts by submission time, not input order', () => {
		const states = latestReviewStates([
			{ user: { login: 'ana' }, state: 'APPROVED', submitted_at: '2026-01-02T00:00:00Z' },
			{ user: { login: 'ana' }, state: 'CHANGES_REQUESTED', submitted_at: '2026-01-01T00:00:00Z' },
		]);

		assert.equal(states.get('ana'), 'APPROVED');
	});

	it('skips reviews without a user', () => {
		assert.equal(latestReviewStates([{ user: null, state: 'APPROVED' }]).size, 0);
	});
});

describe('collectApprovers', () => {
	it('returns reviewers whose latest state is APPROVED', () => {
		const approvers = collectApprovers([
			{ user: { login: 'ana' }, state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' },
			{ user: { login: 'ben' }, state: 'CHANGES_REQUESTED', submitted_at: '2026-01-01T00:00:00Z' },
		]);

		assert.deepEqual([...approvers], ['ana']);
	});
});

describe('buildStatus', () => {
	it('succeeds when nothing is required', () => {
		const status = buildStatus([], 0);

		assert.equal(status.state, 'success');
		assert.match(status.description, /No team approval is required/);
	});

	it('succeeds when all required teams approved', () => {
		const status = buildStatus([], 2);

		assert.equal(status.state, 'success');
		assert.match(status.description, /2 teams/);
	});

	it('fails with the missing team slugs', () => {
		const status = buildStatus(['@n8n-io/qa-dx', '@n8n-io/migrations-review'], 2);

		assert.equal(status.state, 'failure');
		assert.equal(status.description, 'Missing approval from: qa-dx, migrations-review');
	});
});

describe('run', () => {
	let setCommitStatus;

	beforeEach(() => {
		process.env.GITHUB_EVENT_NAME = 'pull_request';
		delete process.env.PULL_REQUEST_NUMBER;

		eventImpl = () => ({ pull_request: { number: 42 } });
		getPullRequestByIdImpl = async () => ({
			base: { ref: 'master' },
			head: { sha: 'head-sha' },
			user: { login: 'author' },
		});
		getChangedFilesImpl = async () => new Set(['a.ts']);
		getPrReviewsImpl = async () => [];
		isTeamMemberImpl = async () => false;
		parseOwnersFileImpl = () => [];
		resolveRequiredTeamsImpl = () => new Map();
		setCommitStatus = mock.fn(async () => {});
		setCommitStatusImpl = setCommitStatus;
	});

	it('sets a pending status first, then a success status when nothing is required', async () => {
		await run();

		assert.equal(setCommitStatus.mock.calls.length, 2);

		const [pendingSha, pendingStatus] = setCommitStatus.mock.calls[0].arguments;
		assert.equal(pendingSha, 'head-sha');
		assert.equal(pendingStatus.context, STATUS_CONTEXT);
		assert.equal(pendingStatus.state, 'pending');

		const [sha, status] = setCommitStatus.mock.calls[1].arguments;
		assert.equal(sha, 'head-sha');
		assert.equal(status.context, STATUS_CONTEXT);
		assert.equal(status.state, 'success');
	});

	it('sets a failure status when a required team has not approved', async () => {
		resolveRequiredTeamsImpl = () => new Map([['@n8n-io/qa-dx', ['a.ts']]]);
		getPrReviewsImpl = async () => [
			{ user: { login: 'outsider' }, state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' },
		];
		isTeamMemberImpl = async () => false;

		await run();

		const [, status] = setCommitStatus.mock.calls.at(-1).arguments;
		assert.equal(status.state, 'failure');
		assert.match(status.description, /Missing approval from: qa-dx/);
	});

	it('sets an error status and rethrows when the evaluation fails', async () => {
		getChangedFilesImpl = async () => {
			throw new Error('API unavailable');
		};

		await assert.rejects(run(), /API unavailable/);

		assert.equal(setCommitStatus.mock.calls.length, 2);
		assert.equal(setCommitStatus.mock.calls[0].arguments[1].state, 'pending');
		assert.equal(setCommitStatus.mock.calls[1].arguments[1].state, 'error');
	});

	it('sets a success status when a member of each required team approved', async () => {
		resolveRequiredTeamsImpl = () =>
			new Map([
				['@n8n-io/qa-dx', ['a.ts']],
				['@n8n-io/migrations-review', ['m.ts']],
			]);
		getPrReviewsImpl = async () => [
			{ user: { login: 'poly' }, state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' },
		];
		// `poly` is a member of both required teams.
		isTeamMemberImpl = async (slug, username) => username === 'poly';

		await run();

		const [, status] = setCommitStatus.mock.calls.at(-1).arguments;
		assert.equal(status.state, 'success');
	});

	it('checks membership per approver and required team', async () => {
		resolveRequiredTeamsImpl = () => new Map([['@n8n-io/qa-dx', ['a.ts']]]);
		getPrReviewsImpl = async () => [
			{ user: { login: 'poly' }, state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' },
		];
		const isTeamMember = mock.fn(async () => true);
		isTeamMemberImpl = isTeamMember;

		await run();

		assert.deepEqual(
			isTeamMember.mock.calls.map((call) => call.arguments),
			[['qa-dx', 'poly']],
		);
	});

	it('does not check membership when there is no approval', async () => {
		resolveRequiredTeamsImpl = () => new Map([['@n8n-io/qa-dx', ['a.ts']]]);
		const isTeamMember = mock.fn(async () => true);
		isTeamMemberImpl = isTeamMember;

		await run();

		assert.equal(isTeamMember.mock.calls.length, 0);
		const [, status] = setCommitStatus.mock.calls.at(-1).arguments;
		assert.equal(status.state, 'failure');
	});

	it('does not count an approval that was later dismissed', async () => {
		resolveRequiredTeamsImpl = () => new Map([['@n8n-io/qa-dx', ['a.ts']]]);
		getPrReviewsImpl = async () => [
			{ user: { login: 'poly' }, state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' },
			{ user: { login: 'poly' }, state: 'DISMISSED', submitted_at: '2026-01-02T00:00:00Z' },
		];
		isTeamMemberImpl = async (slug, username) => username === 'poly';

		await run();

		const [, status] = setCommitStatus.mock.calls.at(-1).arguments;
		assert.equal(status.state, 'failure');
	});

	it('skips PRs that do not target master without setting a status', async () => {
		getPullRequestByIdImpl = async () => ({
			base: { ref: 'release-candidate/2.9.x' },
			head: { sha: 'head-sha' },
		});

		await run();

		assert.equal(setCommitStatus.mock.calls.length, 0);
	});

});
