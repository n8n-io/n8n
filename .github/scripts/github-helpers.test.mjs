import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/github-helpers.test.mjs
 * */

let octokitImpl;

mock.module('@actions/github', {
	namedExports: {
		getOctokit: () => octokitImpl(),
	},
});

const { postOrUpdateComment } = await import('./github-helpers.mjs');

const ORIGINAL_ENV = { ...process.env };

describe('postOrUpdateComment', () => {
	beforeEach(() => {
		process.env.GITHUB_TOKEN = 'token';
		process.env.GITHUB_REPOSITORY = 'n8n-io/n8n';
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
	});

	it('creates a new comment when no existing bot-marker comment is found', async () => {
		const createComment = mock.fn(async () => {});
		const updateComment = mock.fn(async () => {});
		const paginate = mock.fn(async () => [{ id: 1, body: 'unrelated comment' }]);
		octokitImpl = () => ({
			paginate,
			rest: {
				issues: {
					listComments: {},
					createComment,
					updateComment,
				},
			},
		});

		await postOrUpdateComment(123, 'new body', '<!-- marker -->');

		assert.equal(updateComment.mock.calls.length, 0);
		assert.equal(createComment.mock.calls.length, 1);
		assert.deepEqual(createComment.mock.calls[0].arguments[0], {
			owner: 'n8n-io',
			repo: 'n8n',
			issue_number: 123,
			body: 'new body',
		});
		assert.deepEqual(paginate.mock.calls[0].arguments[1], {
			owner: 'n8n-io',
			repo: 'n8n',
			issue_number: 123,
			per_page: 100,
		});
	});

	it('updates the existing comment when a bot-marker comment is found', async () => {
		const createComment = mock.fn(async () => {});
		const updateComment = mock.fn(async () => {});
		octokitImpl = () => ({
			paginate: mock.fn(async () => [{ id: 42, body: '<!-- marker -->\nold body' }]),
			rest: {
				issues: {
					listComments: {},
					createComment,
					updateComment,
				},
			},
		});

		await postOrUpdateComment(123, 'updated body', '<!-- marker -->');

		assert.equal(createComment.mock.calls.length, 0);
		assert.equal(updateComment.mock.calls.length, 1);
		assert.deepEqual(updateComment.mock.calls[0].arguments[0], {
			owner: 'n8n-io',
			repo: 'n8n',
			comment_id: 42,
			body: 'updated body',
		});
	});
});
