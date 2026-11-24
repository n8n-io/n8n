import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import { readPrLabels } from '../github-helpers.mjs';

let event;
const getPullRequestById = mock.fn();

mock.module('../github-helpers.mjs', {
	namedExports: {
		getEventFromGithubEventPath: () => event,
		getPullRequestById,
		readPrLabels,
	},
});

const { main } = await import('./check-do-not-merge.mjs');

describe('check-do-not-merge', () => {
	beforeEach(() => {
		event = { pull_request: { number: 42, labels: [] } };
		getPullRequestById.mock.resetCalls();
	});

	it('fails when the current PR has the label but the event does not', async () => {
		getPullRequestById.mock.mockImplementation(async () => ({
			labels: [{ name: 'Do Not Merge' }],
		}));

		await assert.rejects(main(), /This PR has the 'Do Not Merge' label/);
		assert.deepEqual(getPullRequestById.mock.calls[0].arguments, [42]);
	});

	it('passes when the label was removed after the event', async () => {
		event.pull_request.labels = [{ name: 'Do Not Merge' }];
		getPullRequestById.mock.mockImplementation(async () => ({ labels: [] }));

		await main();
	});

	it('passes when the current PR has other labels', async () => {
		getPullRequestById.mock.mockImplementation(async () => ({
			labels: [{ name: 'node/improvement' }],
		}));

		await main();
	});

	it('fails when GitHub cannot return the current PR', async () => {
		getPullRequestById.mock.mockImplementation(async () => {
			throw new Error('GitHub API request failed');
		});

		await assert.rejects(main(), /GitHub API request failed/);
	});
});
