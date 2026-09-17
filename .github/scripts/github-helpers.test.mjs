import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

const {
	findCommentByMarker,
	initGithub,
	postOrUpdateComment,
	setOctokit,
	updateCommentById,
	writeGithubOutput,
} = await import('./github-helpers.mjs');

const ORIGINAL_ENV = { ...process.env };

describe('findCommentByMarker', () => {
	beforeEach(() => {
		process.env.GITHUB_TOKEN = 'token';
		process.env.GITHUB_REPOSITORY = 'n8n-io/n8n';
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
	});

	const withComments = (comments) => {
		octokitImpl = () => ({
			paginate: mock.fn(async () => comments),
			rest: { issues: { listComments: {}, createComment: mock.fn(), updateComment: mock.fn() } },
		});
	};

	it('returns the id and the body of the marked comment', async () => {
		withComments([
			{ id: 1, body: 'unrelated' },
			{ id: 42, body: '<!-- marker -->\nold body' },
		]);

		assert.deepEqual(await findCommentByMarker(123, '<!-- marker -->'), {
			id: 42,
			body: '<!-- marker -->\nold body',
		});
	});

	it('returns undefined when nothing carries the marker', async () => {
		withComments([{ id: 1, body: 'unrelated' }]);

		assert.equal(await findCommentByMarker(123, '<!-- marker -->'), undefined);
	});
});

describe('updateCommentById', () => {
	beforeEach(() => {
		process.env.GITHUB_TOKEN = 'token';
		process.env.GITHUB_REPOSITORY = 'n8n-io/n8n';
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
	});

	// This is the whole point of the helper: a heartbeat must not paginate every
	// comment on the PR once a minute.
	it('edits the comment without listing any', async () => {
		const updateComment = mock.fn(async () => {});
		const paginate = mock.fn(async () => []);
		octokitImpl = () => ({
			paginate,
			rest: { issues: { listComments: {}, createComment: mock.fn(), updateComment } },
		});

		await updateCommentById(42, 'next body');

		assert.equal(paginate.mock.calls.length, 0);
		assert.deepEqual(updateComment.mock.calls[0].arguments[0], {
			owner: 'n8n-io',
			repo: 'n8n',
			comment_id: 42,
			body: 'next body',
		});
	});
});

describe('postOrUpdateComment', () => {
	beforeEach(() => {
		process.env.GITHUB_TOKEN = 'token';
		process.env.GITHUB_REPOSITORY = 'n8n-io/n8n';
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
	});

	it('creates a new comment when no existing bot-marker comment is found', async () => {
		const createComment = mock.fn(async () => ({ data: { id: 7 } }));
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

		const id = await postOrUpdateComment(123, 'new body', '<!-- marker -->');

		assert.equal(id, 7);
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
		const createComment = mock.fn(async () => ({ data: { id: 7 } }));
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

		const id = await postOrUpdateComment(123, 'updated body', '<!-- marker -->');

		assert.equal(id, 42);
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

describe('writeGithubOutput', () => {
	let outputPath;

	beforeEach(() => {
		outputPath = path.join(mkdtempSync(path.join(tmpdir(), 'gh-output-')), 'output');
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
	});

	it('appends key=value lines to GITHUB_OUTPUT from the given env', () => {
		writeGithubOutput(
			{ conflict_pr: 'https://example.test/pr/1', ok: true },
			{ GITHUB_OUTPUT: outputPath },
		);

		assert.equal(
			readFileSync(outputPath, 'utf8'),
			'conflict_pr=https://example.test/pr/1\nok=true\n',
		);
	});

	it('falls back to process.env when no env is given', () => {
		process.env.GITHUB_OUTPUT = outputPath;

		writeGithubOutput({ target_branches: 'a,b' });

		assert.equal(readFileSync(outputPath, 'utf8'), 'target_branches=a,b\n');
	});

	it('does nothing when GITHUB_OUTPUT is unset', () => {
		writeGithubOutput({ ignored: 'value' }, {});

		assert.equal(existsSync(outputPath), false);
	});
});

describe('initGithub', () => {
	beforeEach(() => {
		process.env.GITHUB_REPOSITORY = 'n8n-io/n8n';
		delete process.env.GITHUB_TOKEN;
	});

	afterEach(() => {
		setOctokit(null);
		process.env = { ...ORIGINAL_ENV };
	});

	it('uses the injected client and needs no token', () => {
		const injected = { rest: {} };
		setOctokit(injected);

		const result = initGithub();

		assert.equal(result.octokit, injected);
		assert.equal(result.owner, 'n8n-io');
		assert.equal(result.repo, 'n8n');
	});

	it('builds a client from GITHUB_TOKEN when nothing is injected', () => {
		const built = { rest: {} };
		octokitImpl = () => built;
		process.env.GITHUB_TOKEN = 'token';

		assert.equal(initGithub().octokit, built);
	});

	it('requires GITHUB_TOKEN when nothing is injected', () => {
		assert.throws(() => initGithub(), /GITHUB_TOKEN/);
	});
});
