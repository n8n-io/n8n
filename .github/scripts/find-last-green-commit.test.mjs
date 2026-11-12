import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import { readPrLabels } from './github-helpers.mjs';

let event;
let commits;
let runs;
let labels;
const listCommits = () => {};
const listWorkflowRuns = () => {};
const paginate = mock.fn(async (method) => (method === listCommits ? commits : runs));
const octokit = { paginate, rest: { pulls: { listCommits }, actions: { listWorkflowRuns } } };

mock.module('./github-helpers.mjs', {
	namedExports: {
		ensureEnvVar: (name) => {
			if (!process.env[name]) throw new Error(`Missing required env var: ${name}`);
			return process.env[name];
		},
		getEventFromGithubEventPath: () => event,
		getPullRequestById: async () => ({ labels }),
		readPrLabels,
		initGithub: () => ({ octokit, owner: 'n8n-io', repo: 'n8n' }),
	},
});

const { main, pickLastGreenCommit, workflowFileFromRef } = await import(
	'./find-last-green-commit.mjs'
);

const run = (sha, repo = 'n8n-io/n8n') => ({ head_sha: sha, head_repository: { full_name: repo } });

describe('pickLastGreenCommit', () => {
	it('picks the newest green commit before the head', () => {
		assert.equal(
			pickLastGreenCommit(['a', 'b', 'c'], [run('a'), run('b')], 'c', 'n8n-io/n8n'),
			'b',
		);
	});

	it('skips commits without a successful run', () => {
		assert.equal(pickLastGreenCommit(['a', 'b', 'c'], [run('a')], 'c', 'n8n-io/n8n'), 'a');
	});

	it('never picks the head itself', () => {
		assert.equal(pickLastGreenCommit(['a', 'b'], [run('b')], 'b', 'n8n-io/n8n'), '');
	});

	it('ignores runs from another repository with the same branch name', () => {
		assert.equal(pickLastGreenCommit(['a', 'b'], [run('a', 'someone/n8n')], 'b', 'n8n-io/n8n'), '');
	});

	it('ignores runs for commits that are not in the PR', () => {
		assert.equal(pickLastGreenCommit(['a', 'b'], [run('x')], 'b', 'n8n-io/n8n'), '');
	});
});

describe('workflowFileFromRef', () => {
	it('reads the workflow file name', () => {
		assert.equal(
			workflowFileFromRef('n8n-io/n8n/.github/workflows/ci-pull-requests.yml@refs/pull/1/merge'),
			'ci-pull-requests.yml',
		);
	});

	it('throws on an unexpected value', () => {
		assert.throws(() => workflowFileFromRef('nonsense'), /Cannot read the workflow file/);
	});
});

describe('main', () => {
	beforeEach(() => {
		process.env.GITHUB_WORKFLOW_REF =
			'n8n-io/n8n/.github/workflows/ci-pull-requests.yml@refs/pull/7/merge';
		event = {
			pull_request: {
				number: 7,
				created_at: '2026-11-01T10:00:00Z',
				head: { sha: 'c', ref: 'feature', repo: { full_name: 'n8n-io/n8n' } },
			},
		};
		commits = [{ sha: 'a' }, { sha: 'b' }, { sha: 'c' }];
		runs = [run('a')];
		labels = [];
		paginate.mock.resetCalls();
		paginate.mock.restore();
	});

	it('returns the last green commit', async () => {
		assert.equal(await main(), 'a');
		const runsCall = paginate.mock.calls.find((call) => call.arguments[0] === listWorkflowRuns);
		assert.deepEqual(runsCall?.arguments[1], {
			owner: 'n8n-io',
			repo: 'n8n',
			workflow_id: 'ci-pull-requests.yml',
			event: 'pull_request',
			branch: 'feature',
			status: 'success',
			created: '>=2026-11-01T10:00:00Z',
			per_page: 100,
		});
	});

	it('returns an empty string when the PR has the force-full-ci label', async () => {
		labels = [{ name: 'force-full-ci' }];
		assert.equal(await main(), '');
		assert.equal(paginate.mock.callCount(), 0);
	});

	it('returns an empty string when the lookup fails', async () => {
		paginate.mock.mockImplementation(async (method) => {
			if (method === listWorkflowRuns) throw new Error('Resource not accessible by integration');
			return commits;
		});
		assert.equal(await main(), '');
	});

	it('returns an empty string when the PR head repository is gone', async () => {
		event.pull_request.head.repo = null;
		assert.equal(await main(), '');
	});
});
