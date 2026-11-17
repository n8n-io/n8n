import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { run } from './handle-size-override.mjs';

function workflowRun(overrides = {}) {
	return {
		id: 42,
		status: 'completed',
		conclusion: 'failure',
		pull_requests: [{ number: 7 }],
		...overrides,
	};
}

function setup({
	permission = 'write',
	runs = [workflowRun()],
	runPages = [runs],
	jobsByRun = { 42: [{ name: 'PR Size Limit', conclusion: 'failure' }] },
} = {}) {
	const octokit = {
		paginate: Object.assign(
			mock.fn(async (method, params) => (await method(params)).data.jobs),
			{
				iterator: mock.fn(async function* (_method, _params) {
					for (const page of runPages) yield { data: page };
				}),
			},
		),
		rest: {
			repos: {
				getCollaboratorPermissionLevel: mock.fn(async () => ({ data: { permission } })),
			},
			pulls: { get: mock.fn(async () => ({ data: { head: { sha: 'current-head' } } })) },
			actions: {
				listWorkflowRuns: mock.fn(async () => ({ data: { workflow_runs: runs } })),
				listJobsForWorkflowRun: mock.fn(async ({ run_id }) => ({
					data: { jobs: jobsByRun[run_id] ?? [] },
				})),
				reRunWorkflowFailedJobs: mock.fn(async () => {}),
			},
			reactions: { createForIssueComment: mock.fn(async () => {}) },
		},
	};
	return {
		octokit,
		invoke: () =>
			run({
				octokit,
				owner: 'owner',
				repo: 'repo',
				prNumber: 7,
				commenter: 'maintainer',
				commentId: 9,
			}),
	};
}

describe('size override', () => {
	it('re-runs failed jobs and their dependents in the current PR workflow', async () => {
		const { octokit, invoke } = setup();
		await invoke();
		assert.deepEqual(octokit.paginate.iterator.mock.calls[0].arguments, [
			octokit.rest.actions.listWorkflowRuns,
			{
				owner: 'owner',
				repo: 'repo',
				workflow_id: 'ci-pr-quality.yml',
				event: 'pull_request',
				head_sha: 'current-head',
				per_page: 100,
			},
		]);
		assert.deepEqual(octokit.paginate.mock.calls[0].arguments, [
			octokit.rest.actions.listJobsForWorkflowRun,
			{ owner: 'owner', repo: 'repo', run_id: 42, per_page: 100 },
		]);
		assert.deepEqual(octokit.rest.actions.reRunWorkflowFailedJobs.mock.calls[0].arguments, [
			{
				owner: 'owner',
				repo: 'repo',
				run_id: 42,
			},
		]);
		assert.equal(octokit.rest.reactions.createForIssueComment.mock.callCount(), 1);
	});

	it('skips newer label runs where the size check was skipped', async () => {
		const { octokit, invoke } = setup({
			runs: [
				workflowRun({ id: 44, conclusion: 'success' }),
				workflowRun({ id: 43 }),
				workflowRun(),
			],
			jobsByRun: {
				44: [{ name: 'PR Size Limit', conclusion: 'skipped' }],
				43: [{ name: 'PR Size Limit', conclusion: 'failure' }],
				42: [{ name: 'PR Size Limit', conclusion: 'failure' }],
			},
		});
		await invoke();
		assert.deepEqual(octokit.rest.actions.reRunWorkflowFailedJobs.mock.calls[0]?.arguments, [
			{ owner: 'owner', repo: 'repo', run_id: 43 },
		]);
		assert.equal(octokit.rest.actions.listJobsForWorkflowRun.mock.callCount(), 2);
	});

	it('ignores runs for other PRs and runs without the size check', async () => {
		const { octokit, invoke } = setup({
			runs: [
				workflowRun({ id: 44, pull_requests: [{ number: 8 }] }),
				workflowRun({ id: 43, conclusion: 'success' }),
				workflowRun(),
			],
		});
		await invoke();
		assert.deepEqual(octokit.rest.actions.reRunWorkflowFailedJobs.mock.calls[0]?.arguments, [
			{ owner: 'owner', repo: 'repo', run_id: 42 },
		]);
		assert.deepEqual(
			octokit.rest.actions.listJobsForWorkflowRun.mock.calls.map(
				(call) => call.arguments[0].run_id,
			),
			[43, 42],
		);
	});

	it('continues to older workflow pages when all newer size checks were skipped', async () => {
		const { octokit, invoke } = setup({
			runPages: [[workflowRun({ id: 43, conclusion: 'success' })], [workflowRun()]],
			jobsByRun: {
				43: [{ name: 'PR Size Limit', conclusion: 'skipped' }],
				42: [{ name: 'PR Size Limit', conclusion: 'failure' }],
			},
		});
		await invoke();
		assert.deepEqual(octokit.rest.actions.reRunWorkflowFailedJobs.mock.calls[0]?.arguments, [
			{ owner: 'owner', repo: 'repo', run_id: 42 },
		]);
	});

	it('does not acknowledge workflows where the size check never ran', async () => {
		const { octokit, invoke } = setup({
			runs: [workflowRun({ conclusion: 'success' })],
			jobsByRun: { 42: [{ name: 'PR Size Limit', conclusion: 'skipped' }] },
		});
		await assert.rejects(invoke, /No PR quality workflow found/);
		assert.equal(octokit.rest.actions.reRunWorkflowFailedJobs.mock.callCount(), 0);
		assert.equal(octokit.rest.reactions.createForIssueComment.mock.callCount(), 0);
	});

	it('checks write access before it reads or re-runs a workflow', async () => {
		const { octokit, invoke } = setup({ permission: 'read' });
		await assert.rejects(invoke, /requires write access/);
		assert.equal(octokit.rest.pulls.get.mock.callCount(), 0);
		assert.equal(octokit.rest.actions.reRunWorkflowFailedJobs.mock.callCount(), 0);
	});

	it('reports when no PR workflow exists for the current HEAD', async () => {
		const { octokit, invoke } = setup({ runs: [] });
		await assert.rejects(invoke, /No PR quality workflow found/);
		assert.equal(octokit.rest.actions.reRunWorkflowFailedJobs.mock.callCount(), 0);
	});

	it('asks the maintainer to wait when the workflow still runs', async () => {
		const { octokit, invoke } = setup({
			runs: [workflowRun({ status: 'in_progress', conclusion: null }), workflowRun({ id: 41 })],
			jobsByRun: {
				42: [{ name: 'PR Size Limit', conclusion: null }],
				41: [{ name: 'PR Size Limit', conclusion: 'failure' }],
			},
		});
		await assert.rejects(invoke, /Wait for the PR quality workflow/);
		assert.equal(octokit.rest.actions.reRunWorkflowFailedJobs.mock.callCount(), 0);
		assert.equal(octokit.rest.reactions.createForIssueComment.mock.callCount(), 0);
	});

	it('acknowledges a workflow that already passed without a re-run', async () => {
		const { octokit, invoke } = setup({
			runs: [workflowRun({ conclusion: 'success' })],
			jobsByRun: { 42: [{ name: 'PR Size Limit', conclusion: 'success' }] },
		});
		await invoke();
		assert.equal(octokit.rest.actions.reRunWorkflowFailedJobs.mock.callCount(), 0);
		assert.equal(octokit.rest.reactions.createForIssueComment.mock.callCount(), 1);
	});

	it('does not acknowledge a failed job lookup', async () => {
		const { octokit, invoke } = setup();
		octokit.rest.actions.listJobsForWorkflowRun.mock.mockImplementation(async () => {
			throw new Error('Job lookup failed');
		});
		await assert.rejects(invoke, /Job lookup failed/);
		assert.equal(octokit.rest.actions.reRunWorkflowFailedJobs.mock.callCount(), 0);
		assert.equal(octokit.rest.reactions.createForIssueComment.mock.callCount(), 0);
	});

	it('does not acknowledge a failed re-run request', async () => {
		const { octokit, invoke } = setup();
		octokit.rest.actions.reRunWorkflowFailedJobs.mock.mockImplementation(async () => {
			throw new Error('Request failed');
		});
		await assert.rejects(invoke, /Request failed/);
		assert.equal(octokit.rest.reactions.createForIssueComment.mock.callCount(), 0);
	});
});
