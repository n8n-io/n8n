import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assignOwnership, buildRecommendationsBody, ownershipsToAllocations, parseOwnersFile } from './owners-review-recommendations.mjs';

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
	},
});

describe('parseOwnersFile', () => {
	it('reads the real OWNERS file into well-formed Owner records', () => {
		const owners = parseOwnersFile();

		assert.ok(owners.length > 0, 'OWNERS file should not be empty');
		assert.ok(
			owners.every(o => o.team && o.filepath),
			'every parsed entry should have both team and filepath',
		);
		assert.ok(
			owners.every(o => o.team?.startsWith('@n8n-io/')),
			'every parsed team should belong to the @n8n-io org',
		);
	});
});

describe('assignOwnership', () => {
	it('assigns every file to the catch-all team when only `*` is defined', () => {
		const files = new Set(['a.ts', 'packages/cli/src/index.ts', 'docs/readme.md']);
		const owners = [{ filepath: '*', team: '@n8n-io/catalysts' }];

		const result = assignOwnership(files, owners);

		assert.deepEqual(
			result.get('@n8n-io/catalysts')?.sort(),
			[...files].sort(),
		);
		assert.equal(result.size, 1);
	});

	it('applies last-match-wins: a later specific rule overrides the catch-all', () => {
		const files = new Set([
			'README.md',
			'packages/cli/src/index.ts',
			'packages/cli/src/lib/foo.ts',
		]);
		const owners = [
			{ filepath: '*', team: '@n8n-io/catalysts' },
			{ filepath: 'packages/cli/', team: '@n8n-io/cli-team' },
		];

		const result = assignOwnership(files, owners);

		assert.deepEqual(result.get('@n8n-io/catalysts'), ['README.md']);
		assert.deepEqual(
			result.get('@n8n-io/cli-team')?.sort(),
			['packages/cli/src/index.ts', 'packages/cli/src/lib/foo.ts'].sort(),
		);
	});

	it('matches a directory pattern recursively', () => {
		const files = new Set([
			'packages/cli/src/deep/nested/file.ts',
			'packages/cli/package.json',
		]);
		const owners = [{ filepath: 'packages/cli/', team: '@n8n-io/cli-team' }];

		const result = assignOwnership(files, owners);

		assert.deepEqual(
			result.get('@n8n-io/cli-team')?.sort(),
			[...files].sort(),
		);
	});

	it('matches an exact file pattern only against that file', () => {
		const files = new Set([
			'packages/cli/src/controllers/ai.controller.ts',
			'packages/cli/src/controllers/other.controller.ts',
		]);
		const owners = [
			{
				filepath: 'packages/cli/src/controllers/ai.controller.ts',
				team: '@n8n-io/ai-team',
			},
		];

		const result = assignOwnership(files, owners);

		assert.deepEqual(result.get('@n8n-io/ai-team'), [
			'packages/cli/src/controllers/ai.controller.ts',
		]);
		// the other controller matched no rule, so it must be omitted entirely
		assert.equal(result.size, 1);
	});

	it('omits files that match no rule (no catch-all present)', () => {
		const files = new Set(['unowned/file.ts', 'packages/cli/src/x.ts']);
		const owners = [{ filepath: 'packages/cli/', team: '@n8n-io/cli-team' }];

		const result = assignOwnership(files, owners);

		assert.deepEqual(result.get('@n8n-io/cli-team'), ['packages/cli/src/x.ts']);
		assert.equal(result.size, 1);
	});

	it('returns an empty Map when there are no changed files', () => {
		const owners = [{ filepath: '*', team: '@n8n-io/catalysts' }];
		const result = assignOwnership(new Set(), owners);

		assert.equal(result.size, 0);
	});
});

describe('ownershipsToAllocations', () => {
	it('converts a Map of team -> files into Allocation[] with fileCount', () => {
		const ownerships = new Map([
			['@n8n-io/cli-team', ['a.ts', 'b.ts', 'c.ts']],
			['@n8n-io/catalysts', ['README.md']],
		]);

		const result = ownershipsToAllocations(ownerships);

		assert.deepEqual(result, [
			{ team: '@n8n-io/cli-team', fileCount: 3 },
			{ team: '@n8n-io/catalysts', fileCount: 1 },
		]);
	});

	it('returns an empty array for an empty Map', () => {
		assert.deepEqual(ownershipsToAllocations(new Map()), []);
	});
});

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
