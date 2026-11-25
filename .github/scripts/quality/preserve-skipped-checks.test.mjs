import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { GATED_CHECK_NAMES, run, selectLatestExecutedRun } from './preserve-skipped-checks.mjs';

const actionsRun = (overrides = {}) => ({
	id: 1,
	status: 'completed',
	conclusion: 'success',
	completed_at: '2026-11-25T10:00:00Z',
	app: { id: 15368, slug: 'github-actions' },
	...overrides,
});

function createOctokit(runsByCheckName) {
	const listForRef = () => {};
	const paginate = mock.fn(async (_method, params, mapFn) => {
		const runs = runsByCheckName[params.check_name] ?? [];
		return mapFn ? mapFn({ data: { check_runs: runs } }) : runs;
	});
	return { paginate, rest: { checks: { listForRef } } };
}

describe('selectLatestExecutedRun', () => {
	it('ignores skipped runs and returns the newest completed GitHub Actions run', () => {
		const latest = selectLatestExecutedRun([
			actionsRun({ id: 10, conclusion: 'failure', completed_at: '2026-11-25T10:00:00Z' }),
			actionsRun({ id: 20, conclusion: 'skipped', completed_at: '2026-11-25T10:05:00Z' }),
		]);
		assert.equal(latest?.id, 10);
		assert.equal(latest?.conclusion, 'failure');
	});

	it('ignores in-progress runs and third-party check runs', () => {
		const latest = selectLatestExecutedRun([
			actionsRun({ id: 10, conclusion: 'failure', completed_at: '2026-11-25T10:00:00Z' }),
			actionsRun({ id: 15, status: 'in_progress', conclusion: null, completed_at: null }),
			actionsRun({
				id: 20,
				conclusion: 'success',
				completed_at: '2026-11-25T10:05:00Z',
				app: { id: 999, slug: 'third-party-app' },
			}),
		]);
		assert.equal(latest?.id, 10);
		assert.equal(latest?.conclusion, 'failure');
	});

	it('prefers a newer successful rerun over an earlier failure', () => {
		const latest = selectLatestExecutedRun([
			actionsRun({ id: 10, conclusion: 'failure', completed_at: '2026-11-25T10:00:00Z' }),
			actionsRun({ id: 25, conclusion: 'success', completed_at: '2026-11-25T10:10:00Z' }),
		]);
		assert.equal(latest?.id, 25);
		assert.equal(latest?.conclusion, 'success');
	});
});

describe('preserve-skipped-checks run', () => {
	it('fails when Unused Dependencies failed earlier on the same head commit', async () => {
		const octokit = createOctokit({
			'Detect Changes': [actionsRun({ id: 1, conclusion: 'success' })],
			'PR Size Limit': [actionsRun({ id: 2, conclusion: 'success' })],
			'Static Analysis': [actionsRun({ id: 3, conclusion: 'success' })],
			'Unused Dependencies': [
				actionsRun({ id: 4, conclusion: 'failure', completed_at: '2026-11-25T10:00:00Z' }),
				actionsRun({ id: 5, conclusion: 'skipped', completed_at: '2026-11-25T10:02:00Z' }),
			],
		});

		await assert.rejects(
			run({ octokit, owner: 'n8n-io', repo: 'n8n', headSha: 'abc123' }),
			/Unused Dependencies: failure/,
		);
		assert.equal(octokit.paginate.mock.callCount(), GATED_CHECK_NAMES.length);
		for (const call of octokit.paginate.mock.calls) {
			assert.equal(call.arguments[1].filter, 'all');
			assert.equal(call.arguments[1].ref, 'abc123');
		}
	});

	it('fails when any gated check was cancelled or timed out', async () => {
		const octokit = createOctokit({
			'Static Analysis': [actionsRun({ id: 3, conclusion: 'cancelled' })],
			'PR Size Limit': [actionsRun({ id: 2, conclusion: 'timed_out' })],
		});

		await assert.rejects(
			run({ octokit, owner: 'n8n-io', repo: 'n8n', headSha: 'abc123' }),
			/PR Size Limit: timed_out, Static Analysis: cancelled/,
		);
	});

	it('passes when prior executed checks succeeded or were always skipped', async () => {
		const octokit = createOctokit({
			'Detect Changes': [actionsRun({ id: 1, conclusion: 'success' })],
			'PR Size Limit': [actionsRun({ id: 2, conclusion: 'skipped' })],
			'Static Analysis': [actionsRun({ id: 3, conclusion: 'success' })],
			'Unused Dependencies': [
				actionsRun({ id: 4, conclusion: 'failure', completed_at: '2026-11-25T10:00:00Z' }),
				actionsRun({ id: 5, conclusion: 'success', completed_at: '2026-11-25T10:05:00Z' }),
				actionsRun({ id: 6, conclusion: 'skipped', completed_at: '2026-11-25T10:06:00Z' }),
			],
		});

		await run({ octokit, owner: 'n8n-io', repo: 'n8n', headSha: 'abc123' });
	});

	it('passes when no prior completed run exists yet on the commit', async () => {
		const octokit = createOctokit({
			'Unused Dependencies': [actionsRun({ id: 4, status: 'in_progress', conclusion: null })],
		});

		await run({ octokit, owner: 'n8n-io', repo: 'n8n', headSha: 'abc123' });
	});
});
