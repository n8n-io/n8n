import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/owners-review-recommendations.test.mjs
 * */

// mock.module must be called before the module under test is imported,
// because static imports are hoisted and resolve before any code runs.
mock.module('./github-helpers.mjs', {
	namedExports: {
		ensureEnvVar: () => {}, // no-op in tests
		initGithub: () => {}, // no-op in tests
		getChangedFiles: () => Promise.resolve(new Set()), // no-op in tests
	},
});

/** @type { (allocations: { team: string, fileCount: number }[], changedFiles: Set<string>) => string } */
let buildRecommendationsBody;
const { buildRecommendationsBody: imported } = await import('./owners-review-recommendations.mjs');
buildRecommendationsBody = imported;

describe('buildRecommendationsBody', () => {
	const marker = '<!-- owners-review-recommendations -->';

	it('returns the fallback message when there are no allocations', () => {
		const body = buildRecommendationsBody([], new Set(['a.ts']));

		assert.ok(body.startsWith(marker), 'body must start with the bot marker');
		assert.match(body, /No owning teams matched/);
	});

	it('returns the fallback message when no files changed', () => {
		const body = buildRecommendationsBody(
			[{ team: '@n8n-io/cli-team', fileCount: 0 }],
			new Set(),
		);

		assert.match(body, /No owning teams matched/);
	});

	it('renders a table with team name, file count, and rounded percentage', () => {
		const body = buildRecommendationsBody(
			[
				{ team: '@n8n-io/cli-team', fileCount: 6 },
				{ team: '@n8n-io/catalysts', fileCount: 3 },
				{ team: '@n8n-io/ai-team', fileCount: 1 },
			],
			new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']),
		);

		assert.ok(body.startsWith(marker));
		assert.match(body, /\| @n8n-io\/cli-team \| 6 \| 60% \|/);
		assert.match(body, /\| @n8n-io\/catalysts \| 3 \| 30% \|/);
		assert.match(body, /\| @n8n-io\/ai-team \| 1 \| 10% \|/);
	});

	it('uses singular "file" when exactly one file changed', () => {
		const body = buildRecommendationsBody(
			[{ team: '@n8n-io/cli-team', fileCount: 1 }],
			new Set(['only.ts']),
		);

		assert.match(body, /ownership of the 1 changed file in this PR/);
	});

	it('uses plural "files" for more than one changed file', () => {
		const body = buildRecommendationsBody(
			[{ team: '@n8n-io/cli-team', fileCount: 2 }],
			new Set(['a.ts', 'b.ts']),
		);

		assert.match(body, /ownership of the 2 changed files in this PR/);
	});
});
