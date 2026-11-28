import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { run as handleSizeOverride } from './handle-size-override.mjs';
import { run as preserveSkippedChecks } from './preserve-skipped-checks.mjs';

const actionsRun = (overrides = {}) => ({
	id: 1,
	status: 'completed',
	conclusion: 'success',
	completed_at: '2026-11-25T10:00:00Z',
	app: { id: 15368, slug: 'github-actions' },
	...overrides,
});

function createOctokit({ permission = 'write', headSha = 'abc123', runsByCheckName = {} }) {
	const listForRef = () => {};
	const getCollaboratorPermissionLevel = mock.fn(async () => ({ data: { permission } }));
	const pullsGet = mock.fn(async () => ({ data: { head: { sha: headSha } } }));
	const paginate = mock.fn(async (_method, params, mapFn) => {
		const runs = runsByCheckName[params.check_name] ?? [];
		// Octokit normalizes `{ total_count, check_runs }` so `response.data` is already an array.
		return mapFn ? mapFn({ data: runs }) : runs;
	});
	const rerequestRun = mock.fn(async () => ({}));
	const createForIssueComment = mock.fn(async () => ({}));

	return {
		paginate,
		rest: {
			repos: { getCollaboratorPermissionLevel },
			pulls: { get: pullsGet },
			checks: { listForRef, rerequestRun },
			reactions: { createForIssueComment },
		},
	};
}

describe('handle-size-override run', () => {
	it('re-requests the failed check run instead of a newer skipped label run', async () => {
		const runsByCheckName = {
			'Detect Changes': [actionsRun({ id: 1, conclusion: 'success' })],
			'Static Analysis': [actionsRun({ id: 2, conclusion: 'success' })],
			'Unused Dependencies': [actionsRun({ id: 3, conclusion: 'success' })],
			'PR Size Limit': [
				// Return newest first, matching GitHub's listForRef order.
				actionsRun({ id: 20, conclusion: 'skipped', completed_at: '2026-11-25T10:02:00Z' }),
				actionsRun({ id: 10, conclusion: 'failure', completed_at: '2026-11-25T10:00:00Z' }),
			],
		};
		const octokit = createOctokit({ runsByCheckName });

		// Before override: the unrelated label run preserves the prior size failure.
		await assert.rejects(
			preserveSkippedChecks({ octokit, owner: 'n8n-io', repo: 'n8n', headSha: 'abc123' }),
			/PR Size Limit: failure/,
		);

		octokit.paginate.mock.resetCalls();

		// Maintainer comments /size-limit-override.
		await handleSizeOverride({
			octokit,
			owner: 'n8n-io',
			repo: 'n8n',
			prNumber: 42,
			commenter: 'maintainer',
			commentId: 99,
		});

		assert.equal(octokit.paginate.mock.callCount(), 1);
		assert.deepEqual(octokit.paginate.mock.calls[0].arguments, [
			octokit.rest.checks.listForRef,
			{
				owner: 'n8n-io',
				repo: 'n8n',
				ref: 'abc123',
				check_name: 'PR Size Limit',
				filter: 'all',
				per_page: 100,
			},
		]);
		assert.equal(octokit.rest.checks.rerequestRun.mock.callCount(), 1);
		assert.deepEqual(octokit.rest.checks.rerequestRun.mock.calls[0].arguments[0], {
			owner: 'n8n-io',
			repo: 'n8n',
			check_run_id: 10,
		});
		assert.equal(octokit.rest.reactions.createForIssueComment.mock.callCount(), 1);
		assert.deepEqual(octokit.rest.reactions.createForIssueComment.mock.calls[0].arguments[0], {
			owner: 'n8n-io',
			repo: 'n8n',
			comment_id: 99,
			content: '+1',
		});

		// After the re-requested run passes, a later unrelated label run also passes.
		runsByCheckName['PR Size Limit'].unshift(
			actionsRun({ id: 40, conclusion: 'skipped', completed_at: '2026-11-25T10:06:00Z' }),
			actionsRun({ id: 30, conclusion: 'success', completed_at: '2026-11-25T10:04:00Z' }),
		);
		await preserveSkippedChecks({ octokit, owner: 'n8n-io', repo: 'n8n', headSha: 'abc123' });
	});

	it('re-requests the newest completed GitHub Actions run and ignores in-progress or third-party runs', async () => {
		const octokit = createOctokit({
			runsByCheckName: {
				'PR Size Limit': [
					actionsRun({ id: 10, conclusion: 'failure', completed_at: '2026-11-25T10:00:00Z' }),
					actionsRun({ id: 15, conclusion: 'failure', completed_at: '2026-11-25T10:03:00Z' }),
					actionsRun({ id: 18, status: 'in_progress', conclusion: null, completed_at: null }),
					actionsRun({
						id: 22,
						conclusion: 'failure',
						completed_at: '2026-11-25T10:05:00Z',
						app: { id: 999, slug: 'third-party-app' },
					}),
					actionsRun({ id: 25, conclusion: 'skipped', completed_at: '2026-11-25T10:06:00Z' }),
				],
			},
		});

		await handleSizeOverride({
			octokit,
			owner: 'n8n-io',
			repo: 'n8n',
			prNumber: 42,
			commenter: 'maintainer',
			commentId: 99,
		});

		assert.equal(octokit.rest.checks.rerequestRun.mock.calls[0].arguments[0].check_run_id, 15);
	});

	it('fails without reacting when only skipped check runs exist on the head commit', async () => {
		const octokit = createOctokit({
			runsByCheckName: {
				'PR Size Limit': [
					actionsRun({ id: 20, conclusion: 'skipped', completed_at: '2026-11-25T10:02:00Z' }),
				],
			},
		});

		await assert.rejects(
			handleSizeOverride({
				octokit,
				owner: 'n8n-io',
				repo: 'n8n',
				prNumber: 42,
				commenter: 'maintainer',
				commentId: 99,
			}),
			/No executed 'PR Size Limit' check run found for abc123/,
		);
		assert.equal(octokit.rest.checks.rerequestRun.mock.callCount(), 0);
		assert.equal(octokit.rest.reactions.createForIssueComment.mock.callCount(), 0);
	});

	it('rejects commenters without write permission', async () => {
		const octokit = createOctokit({ permission: 'read' });

		await assert.rejects(
			handleSizeOverride({
				octokit,
				owner: 'n8n-io',
				repo: 'n8n',
				prNumber: 42,
				commenter: 'outsider',
				commentId: 99,
			}),
			/@outsider does not have permission/,
		);
		assert.equal(octokit.rest.pulls.get.mock.callCount(), 0);
		assert.equal(octokit.paginate.mock.callCount(), 0);
		assert.equal(octokit.rest.checks.rerequestRun.mock.callCount(), 0);
		assert.equal(octokit.rest.reactions.createForIssueComment.mock.callCount(), 0);
	});
});
