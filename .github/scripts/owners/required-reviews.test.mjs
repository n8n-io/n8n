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
/** @type {(headOwner: string, headBranch: string) => Promise<any[]>} */
let listOpenPullRequestsByHeadImpl = async () => [];

mock.module('../github-helpers.mjs', {
	namedExports: {
		getEventFromGithubEventPath: () => eventImpl(),
		getPullRequestById: (n) => getPullRequestByIdImpl(n),
		getChangedFiles: (n) => getChangedFilesImpl(n),
		getPrReviews: (n) => getPrReviewsImpl(n),
		isTeamMember: (slug, username) => isTeamMemberImpl(slug, username),
		setCommitStatus: (sha, status) => setCommitStatusImpl(sha, status),
		listOpenPullRequestsByHead: (headOwner, headBranch) =>
			listOpenPullRequestsByHeadImpl(headOwner, headBranch),
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
	REQUIRED_REVIEW_EXEMPTIONS,
	STATUS_CONTEXT,
	buildStatus,
	collectApprovers,
	findExemption,
	latestReviewStates,
	matchesBranchPattern,
	parseExemption,
	resolvePullRequestNumber,
	run,
} = await import('./required-reviews.mjs');

const REPO = 'n8n-io/n8n';

/** @param {string} head @param {string} base @param {string} [headRepo] */
function pullRequestFor(head, base, headRepo = REPO) {
	return {
		head: { ref: head, sha: 'head-sha', repo: { full_name: headRepo } },
		base: { ref: base, repo: { full_name: REPO } },
	};
}

describe('parseExemption', () => {
	it('splits a "<head> -> <base>" route', () => {
		assert.deepEqual(parseExemption('sync/master-to-3x -> 3.x'), {
			head: 'sync/master-to-3x',
			base: '3.x',
			source: 'sync/master-to-3x -> 3.x',
		});
	});

	it('treats a bare "<base>" as any head', () => {
		assert.deepEqual(parseExemption('release/*'), { head: '*', base: 'release/*', source: 'release/*' });
	});

	it('rejects malformed routes', () => {
		assert.throws(() => parseExemption('a -> b -> c'), /Invalid exemption/);
		assert.throws(() => parseExemption(' -> 3.x'), /Invalid exemption/);
		assert.throws(() => parseExemption('3.x -> '), /Invalid exemption/);
	});

	it('accepts every configured exemption', () => {
		for (const entry of REQUIRED_REVIEW_EXEMPTIONS) parseExemption(entry);
	});
});

describe('matchesBranchPattern', () => {
	it('matches whole branch names', () => {
		assert.equal(matchesBranchPattern('3.x', '3.x'), true);
		assert.equal(matchesBranchPattern('3.xy', '3.x'), false);
		assert.equal(matchesBranchPattern('v3.x', '3.x'), false);
	});

	it('treats "." as a literal', () => {
		assert.equal(matchesBranchPattern('3ax', '3.x'), false);
	});

	it('expands "*" across path separators', () => {
		assert.equal(matchesBranchPattern('release/2.39.5', 'release/*'), true);
		assert.equal(matchesBranchPattern('release/2.39.5/hotfix', 'release/*'), true);
		assert.equal(matchesBranchPattern('anything', '*'), true);
		assert.equal(matchesBranchPattern('release-candidate/2.40.0', 'release/*'), false);
	});
});

describe('findExemption', () => {
	const exemptions = ['sync/master-to-3x -> 3.x', 'release/*'];

	it('finds the route for a matching head and base', () => {
		const route = findExemption(pullRequestFor('sync/master-to-3x', '3.x'), exemptions);
		assert.equal(route?.source, 'sync/master-to-3x -> 3.x');
	});

	it('returns nothing when only the base matches', () => {
		assert.equal(findExemption(pullRequestFor('feature/x', '3.x'), exemptions), undefined);
	});

	it('returns nothing when only the head matches', () => {
		assert.equal(findExemption(pullRequestFor('sync/master-to-3x', 'master'), exemptions), undefined);
	});

	it('matches a bare base route for any head', () => {
		const route = findExemption(pullRequestFor('feature/x', 'release/2.39.5'), exemptions);
		assert.equal(route?.source, 'release/*');
	});

	it('ignores heads from another repository', () => {
		const fromFork = pullRequestFor('sync/master-to-3x', '3.x', 'someone/n8n');
		assert.equal(findExemption(fromFork, exemptions), undefined);
	});

	it('ignores heads whose repository is gone', () => {
		const pullRequest = pullRequestFor('sync/master-to-3x', '3.x');
		pullRequest.head.repo = null;
		assert.equal(findExemption(pullRequest, exemptions), undefined);
	});
});

describe('resolvePullRequestNumber', () => {
	/** A workflow_run payload for a run on `owner/branch` at `sha`. */
	function workflowRunEvent(owner, branch, sha) {
		return { workflow_run: { head_sha: sha, head_branch: branch, head_repository: { owner: { login: owner } } } };
	}

	beforeEach(() => {
		listOpenPullRequestsByHeadImpl = async () => [];
	});

	it('reads the PR number from pull_request payloads', async () => {
		assert.equal(
			await resolvePullRequestNumber('pull_request_target', { pull_request: { number: 42 } }, undefined),
			42,
		);
	});

	it('falls back to the PULL_REQUEST_NUMBER env value for workflow_dispatch', async () => {
		assert.equal(await resolvePullRequestNumber('workflow_dispatch', {}, '7'), 7);
	});

	it('rejects when no source yields a PR number', async () => {
		await assert.rejects(resolvePullRequestNumber('workflow_dispatch', {}, undefined), /Cannot resolve/);
	});

	it('looks up the open PR for a workflow_run head', async () => {
		const listOpenPullRequestsByHead = mock.fn(async () => [
			{ number: 11, head: { sha: 'old-sha' } },
			{ number: 12, head: { sha: 'run-sha' } },
		]);
		listOpenPullRequestsByHeadImpl = listOpenPullRequestsByHead;

		assert.equal(
			await resolvePullRequestNumber('workflow_run', workflowRunEvent('forker', 'fix/x', 'run-sha'), undefined),
			12,
		);
		assert.deepEqual(listOpenPullRequestsByHead.mock.calls[0].arguments, ['forker', 'fix/x']);
	});

	it('returns undefined when no open PR has the workflow_run head SHA', async () => {
		listOpenPullRequestsByHeadImpl = async () => [{ number: 11, head: { sha: 'old-sha' } }];

		assert.equal(
			await resolvePullRequestNumber('workflow_run', workflowRunEvent('forker', 'fix/x', 'run-sha'), undefined),
			undefined,
		);
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

	it('stays pending with the missing team slugs', () => {
		const status = buildStatus(['@n8n-io/qa-dx', '@n8n-io/migrations-review'], 2);

		assert.equal(status.state, 'pending');
		assert.equal(status.description, 'Waiting for approval from: qa-dx, migrations-review');
	});
});

describe('run', () => {
	let setCommitStatus;

	beforeEach(() => {
		process.env.GITHUB_EVENT_NAME = 'pull_request';
		delete process.env.PULL_REQUEST_NUMBER;

		eventImpl = () => ({ pull_request: { number: 42 } });
		getPullRequestByIdImpl = async () => ({
			...pullRequestFor('feature/x', 'master'),
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

	it('sets a pending status when a required team has not approved', async () => {
		resolveRequiredTeamsImpl = () => new Map([['@n8n-io/qa-dx', ['a.ts']]]);
		getPrReviewsImpl = async () => [
			{ user: { login: 'outsider' }, state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' },
		];
		isTeamMemberImpl = async () => false;

		await run();

		const [, status] = setCommitStatus.mock.calls.at(-1).arguments;
		assert.equal(status.state, 'pending');
		assert.match(status.description, /Waiting for approval from: qa-dx/);
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
		assert.equal(status.state, 'pending');
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
		assert.equal(status.state, 'pending');
	});

	it('writes no status for a workflow_run head without an open PR', async () => {
		process.env.GITHUB_EVENT_NAME = 'workflow_run';
		eventImpl = () => ({
			workflow_run: { head_sha: 'gone-sha', head_branch: 'fix/x', head_repository: { owner: { login: 'forker' } } },
		});
		listOpenPullRequestsByHeadImpl = async () => [];

		await run();

		assert.equal(setCommitStatus.mock.calls.length, 0);
	});

	it('evaluates PRs into branches other than master', async () => {
		getPullRequestByIdImpl = async () => pullRequestFor('feature/x', 'release-candidate/2.9.x');
		resolveRequiredTeamsImpl = () => new Map([['@n8n-io/qa-dx', ['a.ts']]]);

		await run();

		const [, status] = setCommitStatus.mock.calls.at(-1).arguments;
		assert.equal(status.state, 'pending');
		assert.match(status.description, /Waiting for approval from: qa-dx/);
	});

	it('reports success without evaluating a PR on an exempt route', async () => {
		getPullRequestByIdImpl = async () => pullRequestFor('sync/master-to-3x', '3.x');
		const getChangedFiles = mock.fn(async () => new Set(['a.ts']));
		getChangedFilesImpl = getChangedFiles;
		resolveRequiredTeamsImpl = () => new Map([['@n8n-io/qa-dx', ['a.ts']]]);

		await run();

		assert.equal(getChangedFiles.mock.calls.length, 0);
		assert.equal(setCommitStatus.mock.calls.length, 2);
		assert.equal(setCommitStatus.mock.calls[0].arguments[1].state, 'pending');
		const [, status] = setCommitStatus.mock.calls[1].arguments;
		assert.equal(status.state, 'success');
		assert.equal(status.description, 'Exempt route: sync/master-to-3x -> 3.x');
	});

	it('does not exempt a fork branch that is named like an exempt route', async () => {
		getPullRequestByIdImpl = async () => pullRequestFor('sync/master-to-3x', '3.x', 'someone/n8n');
		resolveRequiredTeamsImpl = () => new Map([['@n8n-io/qa-dx', ['a.ts']]]);

		await run();

		const [, status] = setCommitStatus.mock.calls.at(-1).arguments;
		assert.equal(status.state, 'pending');
	});

});
