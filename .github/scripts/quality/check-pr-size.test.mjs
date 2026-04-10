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

let hasValidOverride, countFilteredAdditions, SIZE_LIMIT, OVERRIDE_COMMAND, EXCLUDE_PATTERNS;
before(async () => {
	({ hasValidOverride, countFilteredAdditions, SIZE_LIMIT, OVERRIDE_COMMAND, EXCLUDE_PATTERNS } =
		await import('./check-pr-size.mjs'));
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

describe('countFilteredAdditions', () => {
	it('sums additions across all files when no patterns are given', () => {
		const files = [
			{ filename: 'src/foo.ts', additions: 100 },
			{ filename: 'src/bar.ts', additions: 200 },
		];
		assert.equal(countFilteredAdditions(files, []), 300);
	});

	it('excludes files matching a glob pattern', () => {
		const files = [
			{ filename: 'src/foo.ts', additions: 100 },
			{ filename: 'src/foo.test.ts', additions: 500 },
		];
		assert.equal(countFilteredAdditions(files, ['**/*.test.ts']), 100);
	});

	it('excludes files matching any of multiple patterns', () => {
		const files = [
			{ filename: 'src/foo.ts', additions: 100 },
			{ filename: 'src/foo.test.ts', additions: 200 },
			{ filename: 'src/foo.spec.ts', additions: 300 },
			{ filename: 'src/__tests__/bar.ts', additions: 400 },
		];
		assert.equal(
			countFilteredAdditions(files, ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**']),
			100,
		);
	});

	it('returns 0 when all files are excluded', () => {
		const files = [
			{ filename: 'src/foo.test.ts', additions: 100 },
			{ filename: 'src/bar.test.ts', additions: 200 },
		];
		assert.equal(countFilteredAdditions(files, ['**/*.test.ts']), 0);
	});

	it('returns 0 for an empty file list', () => {
		assert.equal(countFilteredAdditions([], EXCLUDE_PATTERNS), 0);
	});

	it('applies EXCLUDE_PATTERNS to common test file extensions', () => {
		const files = [
			{ filename: 'src/service.ts', additions: 50 },
			{ filename: 'src/service.test.ts', additions: 100 },
			{ filename: 'src/service.spec.ts', additions: 100 },
			{ filename: 'src/service.test.mjs', additions: 100 },
			{ filename: 'src/service.spec.mjs', additions: 100 },
			{ filename: 'src/service.test.js', additions: 100 },
			{ filename: 'src/service.spec.js', additions: 100 },
			{ filename: 'src/__tests__/helper.ts', additions: 100 },
			{ filename: 'src/component.snap', additions: 100 },
		];
		assert.equal(countFilteredAdditions(files, EXCLUDE_PATTERNS), 50);
	});

	it('applies EXCLUDE_PATTERNS to test directories (test/, tests/, __tests__)', () => {
		const files = [
			{ filename: 'packages/cli/src/service.ts', additions: 50 },
			{ filename: 'packages/cli/test/unit/service.test.ts', additions: 100 },
			{ filename: 'packages/cli/test/integration/api.test.ts', additions: 100 },
			{ filename: 'packages/nodes-base/nodes/Foo/tests/Foo.test.ts', additions: 100 },
			{ filename: 'packages/core/src/__tests__/cipher.test.ts', additions: 100 },
		];
		assert.equal(countFilteredAdditions(files, EXCLUDE_PATTERNS), 50);
	});

	it('applies EXCLUDE_PATTERNS to snapshots, fixtures, and mocks', () => {
		const files = [
			{ filename: 'packages/cli/src/service.ts', additions: 50 },
			{ filename: 'packages/editor-ui/src/__snapshots__/Canvas.test.ts.snap', additions: 100 },
			{ filename: 'packages/workflow/test/fixtures/workflow.json', additions: 100 },
			{ filename: 'packages/core/src/__mocks__/fs.ts', additions: 100 },
		];
		assert.equal(countFilteredAdditions(files, EXCLUDE_PATTERNS), 50);
	});

	it('applies EXCLUDE_PATTERNS to packages/testing and pnpm-lock.yaml', () => {
		const files = [
			{ filename: 'packages/cli/src/service.ts', additions: 50 },
			{ filename: 'packages/testing/playwright/tests/workflow.spec.ts', additions: 100 },
			{ filename: 'packages/testing/playwright/pages/CanvasPage.ts', additions: 100 },
			{ filename: 'pnpm-lock.yaml', additions: 500 },
		];
		assert.equal(countFilteredAdditions(files, EXCLUDE_PATTERNS), 50);
	});
});
