import { describe, it, mock, before } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/determine-release-version-changes.test.mjs
 * */

// mock.module must be called before the module under test is imported,
// because static imports are hoisted and resolve before any code runs.
mock.module('./github-helpers.mjs', {
	namedExports: {
		ensureEnvVar: () => {}, // no-op
		sh: () => {}, // no-op
		writeGithubOutput: () => {}, // no-op
	},
});

let hasNodeEnhancements, hasCoreChanges;
before(async () => {
	({ hasNodeEnhancements, hasCoreChanges } = await import(
		'./determine-release-version-changes.mjs'
	));
});

describe('Determine release version changes', () => {
	it('Matches nodes feature', () => {
		assert.ok(hasNodeEnhancements('feat(nodes): Added a utility for node'));
	});
	it('Matches nodes fix', () => {
		assert.ok(hasNodeEnhancements('fix(nodes): Fix said utility'));
	});
	it('Matches named node feature', () => {
		assert.ok(hasNodeEnhancements('feat(Github Actions Node): Add ability to call webhooks'));
	});
	it('Matches named node fix', () => {
		assert.ok(hasNodeEnhancements('fix(OpenAI Node): Allow credentials to pass through'));
	});

	it('Matches core changes', () => {
		assert.ok(hasCoreChanges('feat(core): Add cli flag'));
	});
	it('Matches editor changes', () => {
		assert.ok(hasCoreChanges('feat(editor): Add button'));
	});
});
