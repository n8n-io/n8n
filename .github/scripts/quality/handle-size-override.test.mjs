import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { run } from './handle-size-override.mjs';

function setup({
	permission = 'write',
	runs = [{ id: 42, status: 'completed', conclusion: 'failure' }],
} = {}) {
	const octokit = {
		rest: {
			repos: {
				getCollaboratorPermissionLevel: mock.fn(async () => ({ data: { permission } })),
			},
			pulls: { get: mock.fn(async () => ({ data: { head: { sha: 'current-head' } } })) },
			actions: {
				listWorkflowRuns: mock.fn(async () => ({ data: { workflow_runs: runs } })),
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
		assert.deepEqual(octokit.rest.actions.listWorkflowRuns.mock.calls[0].arguments, [
			{
				owner: 'owner',
				repo: 'repo',
				workflow_id: 'ci-pr-quality.yml',
				event: 'pull_request',
				head_sha: 'current-head',
				per_page: 1,
			},
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
			runs: [{ id: 42, status: 'in_progress', conclusion: null }],
		});
		await assert.rejects(invoke, /Wait for the PR quality workflow/);
		assert.equal(octokit.rest.actions.reRunWorkflowFailedJobs.mock.callCount(), 0);
		assert.equal(octokit.rest.reactions.createForIssueComment.mock.callCount(), 0);
	});

	it('acknowledges a workflow that already passed without a re-run', async () => {
		const { octokit, invoke } = setup({
			runs: [{ id: 42, status: 'completed', conclusion: 'success' }],
		});
		await invoke();
		assert.equal(octokit.rest.actions.reRunWorkflowFailedJobs.mock.callCount(), 0);
		assert.equal(octokit.rest.reactions.createForIssueComment.mock.callCount(), 1);
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
