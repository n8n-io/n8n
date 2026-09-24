import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { minimatch } from 'minimatch';

import { matchesGlob } from './glob.mjs';
import { EXCLUDE_PATTERNS } from './quality/check-pr-size.mjs';

/**
 * Run with:
 * node --test --experimental-test-module-mocks ./.github/scripts/glob.test.mjs
 * */

describe('matchesGlob', () => {
	it('matches a file extension anywhere in the tree', () => {
		assert.equal(matchesGlob('a.test.ts', '**/*.test.ts'), true);
		assert.equal(matchesGlob('packages/cli/src/a.test.ts', '**/*.test.ts'), true);
		assert.equal(matchesGlob('packages/cli/src/a.ts', '**/*.test.ts'), false);
	});

	it('matches dot segments', () => {
		assert.equal(matchesGlob('.github/scripts/a.test.mjs', '**/*.test.mjs'), true);
		assert.equal(matchesGlob('.github/scripts/glob.mjs', '**/*.test.mjs'), false);
	});

	it('matches a directory at any depth', () => {
		assert.equal(matchesGlob('test/a.ts', '**/test/**'), true);
		assert.equal(matchesGlob('packages/x/test/deep/a.ts', '**/test/**'), true);
		assert.equal(matchesGlob('packages/x/tests/a.ts', '**/test/**'), false);
		assert.equal(matchesGlob('packages/x/testing/a.ts', '**/test/**'), false);
	});

	it('matches a prefix pattern', () => {
		assert.equal(matchesGlob('packages/testing/playwright/a.ts', 'packages/testing/**'), true);
		assert.equal(matchesGlob('packages/testing', 'packages/testing/**'), false);
		assert.equal(matchesGlob('packages/cli/a.ts', 'packages/testing/**'), false);
	});

	it('matches a literal path only exactly', () => {
		assert.equal(matchesGlob('pnpm-lock.yaml', 'pnpm-lock.yaml'), true);
		assert.equal(matchesGlob('packages/cli/pnpm-lock.yaml', 'pnpm-lock.yaml'), false);
		assert.equal(matchesGlob('pnpm-lockXyaml', 'pnpm-lock.yaml'), false);
	});

	it('keeps `*` inside one segment', () => {
		assert.equal(matchesGlob('a/b.snap', '**/*.snap'), true);
		assert.equal(matchesGlob('a/b/c.md', 'a/*.md'), false);
	});

	it('agrees with minimatch on the PR size patterns', () => {
		const files = [
			'packages/cli/src/a.ts',
			'packages/cli/src/a.test.ts',
			'packages/cli/test/a.ts',
			'packages/cli/__tests__/a.ts',
			'packages/cli/__snapshots__/a.ts.snap',
			'packages/nodes-base/nodes/Foo/test/fixtures/a.json',
			'packages/frontend/editor-ui/src/__mocks__/a.ts',
			'packages/testing/playwright/a.ts',
			'packages/testing',
			'.github/scripts/glob.test.mjs',
			'.github/workflows/ci.yml',
			'a/.hidden/b.spec.js',
			'pnpm-lock.yaml',
			'packages/cli/pnpm-lock.yaml',
			'README.md',
			'docs/a.mdx',
			'src/tests.ts',
			'src/test.ts',
			'src/testing/a.ts',
		];
		for (const pattern of EXCLUDE_PATTERNS) {
			for (const file of files) {
				assert.equal(
					matchesGlob(file, pattern),
					minimatch(file, pattern, { dot: true }),
					`${file} against ${pattern}`,
				);
			}
		}
	});
});
