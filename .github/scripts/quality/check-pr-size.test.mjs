import { describe, it, before, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run with:
 * node --test --experimental-test-module-mocks .github/scripts/quality/check-pr-size.test.mjs
 */

mock.module('../github-helpers.mjs', {
	namedExports: {
		initGithub: () => {},
		getEventFromGithubEventPath: () => {},
	},
});

let hasValidOverride, SIZE_LIMIT, OVERRIDE_COMMAND;
before(async () => {
	({ hasValidOverride, SIZE_LIMIT, OVERRIDE_COMMAND } = await import('./check-pr-size.mjs'));
});

/** @param {string} permission */
const permissionGetter = (permission) => async (_username) => permission;

describe('SIZE_LIMIT', () => {
	it('is 1000', () => {
		assert.equal(SIZE_LIMIT, 1000);
	});
});

describe('hasValidOverride', () => {
	it('returns false when there are no comments', async () => {
		const result = await hasValidOverride([], permissionGetter('write'));
		assert.equal(result, false);
	});

	it('returns false when no comment starts with the override command', async () => {
		const comments = [
			{ body: 'Looks good to me!', user: { login: 'reviewer' } },
			{ body: 'Please split this PR.', user: { login: 'maintainer' } },
		];
		const result = await hasValidOverride(comments, permissionGetter('write'));
		assert.equal(result, false);
	});

	it('returns true when a write-access user has posted the override command', async () => {
		const comments = [{ body: OVERRIDE_COMMAND, user: { login: 'maintainer' } }];
		const result = await hasValidOverride(comments, permissionGetter('write'));
		assert.ok(result);
	});

	it('returns true for maintain permission', async () => {
		const comments = [{ body: OVERRIDE_COMMAND, user: { login: 'lead' } }];
		const result = await hasValidOverride(comments, permissionGetter('maintain'));
		assert.ok(result);
	});

	it('returns true for admin permission', async () => {
		const comments = [{ body: OVERRIDE_COMMAND, user: { login: 'admin' } }];
		const result = await hasValidOverride(comments, permissionGetter('admin'));
		assert.ok(result);
	});

	it('returns false when the override commenter only has read access', async () => {
		const comments = [{ body: OVERRIDE_COMMAND, user: { login: 'outsider' } }];
		const result = await hasValidOverride(comments, permissionGetter('read'));
		assert.equal(result, false);
	});

	it('returns false when the override commenter only has triage access', async () => {
		const comments = [{ body: OVERRIDE_COMMAND, user: { login: 'triager' } }];
		const result = await hasValidOverride(comments, permissionGetter('triage'));
		assert.equal(result, false);
	});

	it('returns false when the override command appears mid-comment, not at the start', async () => {
		const comments = [
			{
				body: `Please note: ${OVERRIDE_COMMAND} should only be used when justified.`,
				user: { login: 'maintainer' },
			},
		];
		const result = await hasValidOverride(comments, permissionGetter('write'));
		assert.equal(result, false);
	});

	it('returns true when one of several comments is a valid override', async () => {
		const comments = [
			{ body: 'Looks good!', user: { login: 'reviewer' } },
			{ body: OVERRIDE_COMMAND, user: { login: 'maintainer' } },
			{ body: 'Please add tests.', user: { login: 'other' } },
		];
		const result = await hasValidOverride(comments, permissionGetter('write'));
		assert.ok(result);
	});

	it('returns false when override comment exists but all posters lack write access', async () => {
		const comments = [
			{ body: OVERRIDE_COMMAND, user: { login: 'user1' } },
			{ body: OVERRIDE_COMMAND, user: { login: 'user2' } },
		];
		const result = await hasValidOverride(comments, permissionGetter('read'));
		assert.equal(result, false);
	});

	it('checks permissions per commenter independently', async () => {
		const permissions = { writer: 'write', reader: 'read' };
		const getPermission = async (username) => permissions[username] ?? 'read';

		const comments = [
			{ body: OVERRIDE_COMMAND, user: { login: 'reader' } },
			{ body: OVERRIDE_COMMAND, user: { login: 'writer' } },
		];
		const result = await hasValidOverride(comments, getPermission);
		assert.ok(result);
	});
});
