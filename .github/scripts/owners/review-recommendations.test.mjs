import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/owners/review-recommendations.test.mjs
 * */

/** @type {(pullRequestNumber: number) => Promise<Array<{ filename: string, additions: number, deletions: number, previous_filename?: string }>>} */
let getPrFilesImpl = async () => [];
/** @type {(pullRequestNumber: number, body: string, botMarker: string) => Promise<void>} */
let postOrUpdateCommentImpl = async () => {};

mock.module('../github-helpers.mjs', {
	namedExports: {
		ensureEnvVar: () => {}, // no-op in tests
		initGithub: () => {}, // no-op in tests
		getChangedFiles: () => Promise.resolve(new Set()),
		getEventFromGithubEventPath: () => ({}),
		getPrFiles: (n) => getPrFilesImpl(n),
		postOrUpdateComment: (pullRequestNumber, body, botMarker) =>
			postOrUpdateCommentImpl(pullRequestNumber, body, botMarker),
	},
});

/** @type {() => Array<import('./owners.mjs').OwnersEntry>} */
let parseOwnersFileImpl = () => [];
/** @type {(files: Set<string>, entries: any[]) => Map<string, string[]>} */
let assignOwnershipImpl = () => new Map();
/** @type {(ownerships: Map<string, string[]>) => Array<{ team: string, fileCount: number }>} */
let ownershipsToAllocationsImpl = () => [];
/** @type {(files: Set<string>, entries: any[]) => Map<string, string[]>} */
let resolveRequiredTeamsImpl = () => new Map();

mock.module('./owners.mjs', {
	namedExports: {
		parseOwnersFile: () => parseOwnersFileImpl(),
		assignOwnership: (files, entries) => assignOwnershipImpl(files, entries),
		ownershipsToAllocations: (ownerships) => ownershipsToAllocationsImpl(ownerships),
		resolveRequiredTeams: (files, entries) => resolveRequiredTeamsImpl(files, entries),
	},
});

const {
	buildOverviewTable,
	buildComment,
	buildRequiredReviewsSection,
	computeAllocationLineStats,
	computeLineStats,
	run,
} = await import('./review-recommendations.mjs');

const BOT_MARKER = '<!-- pr-recommendations -->';
const EMPTY_LINE_STATS = {
	sourceCodeAdded: 0,
	sourceCodeRemoved: 0,
	testFilesAdded: 0,
	testFilesRemoved: 0,
	miscAdded: 0,
	miscRemoved: 0,
};

describe('buildOverviewTable', () => {
	it('renders an ownership-first table with per-team line stats', () => {
		const table = buildOverviewTable(
			[
				{ team: '@n8n-io/cli-team', fileCount: 2 },
				{ team: '@n8n-io/editor-ui-team', fileCount: 1 },
			],
			new Set(['a.ts', 'b.test.ts', 'README.md']),
			{
				sourceCodeAdded: 10,
				sourceCodeRemoved: 2,
				testFilesAdded: 5,
				testFilesRemoved: 1,
				miscAdded: 3,
				miscRemoved: 0,
			},
			new Map([
				[
					'@n8n-io/cli-team',
					{
						sourceCodeAdded: 10,
						sourceCodeRemoved: 2,
						testFilesAdded: 5,
						testFilesRemoved: 1,
						miscAdded: 0,
						miscRemoved: 0,
					},
				],
				[
					'@n8n-io/editor-ui-team',
					{
						sourceCodeAdded: 0,
						sourceCodeRemoved: 0,
						testFilesAdded: 0,
						testFilesRemoved: 0,
						miscAdded: 3,
						miscRemoved: 0,
					},
				],
			]),
		);

		assert.match(table, /## PR review overview/);
		assert.match(table, /\| Ownership \| Files owned \| Share \| Source code \| Test files \| Misc \|/);
		assert.match(table, /\| @n8n-io\/cli-team \| 2 \| 67% \| \+10 \/ -2 \| \+5 \/ -1 \| \+0 \/ -0 \|/);
		assert.match(table, /\| @n8n-io\/editor-ui-team \| 1 \| 33% \| \+0 \/ -0 \| \+0 \/ -0 \| \+3 \/ -0 \|/);
		assert.match(table, /\| \*\*Total\*\* \| \*\*3\*\* \| \*\*100%\*\* \| \*\*\+10 \/ -2\*\* \| \*\*\+5 \/ -1\*\* \| \*\*\+3 \/ -0\*\* \|/);
	});

	it('renders a no-owner row when no owners matched', () => {
		const table = buildOverviewTable(
			[],
			new Set(['a.ts']),
			{ ...EMPTY_LINE_STATS, sourceCodeAdded: 12, sourceCodeRemoved: 1 },
			new Map(),
		);

		assert.match(table, /\| _No owning teams matched_ \| 0 \| 0% \| \+12 \/ -1 \| \+0 \/ -0 \| \+0 \/ -0 \|/);
	});

	it('uses singular "file" when exactly one file changed', () => {
		const table = buildOverviewTable(
			[{ team: '@n8n-io/cli-team', fileCount: 1 }],
			new Set(['only.ts']),
			EMPTY_LINE_STATS,
			new Map(),
		);

		assert.match(table, /ownership of the 1 changed file in this PR/);
	});

	it('uses plural "files" for more than one file changed', () => {
		const table = buildOverviewTable(
			[{ team: '@n8n-io/cli-team', fileCount: 1 }],
			new Set(['a.ts', 'b.ts']),
			EMPTY_LINE_STATS,
			new Map(),
		);

		assert.match(table, /ownership of the 2 changed files in this PR/);
	});

	it('renders an aggregate row for allocations outside the displayed teams', () => {
		const table = buildOverviewTable(
			[{ team: '@n8n-io/cli-team', fileCount: 2 }],
			new Set(['a.ts', 'b.ts', 'c.ts']),
			{ ...EMPTY_LINE_STATS, sourceCodeAdded: 13, sourceCodeRemoved: 3 },
			new Map([
				['@n8n-io/cli-team', { ...EMPTY_LINE_STATS, sourceCodeAdded: 10, sourceCodeRemoved: 1 }],
				['@n8n-io/team-a', { ...EMPTY_LINE_STATS, sourceCodeAdded: 2, sourceCodeRemoved: 1 }],
				['@n8n-io/team-b', { ...EMPTY_LINE_STATS, sourceCodeAdded: 1, sourceCodeRemoved: 1 }],
			]),
			[
				{ team: '@n8n-io/team-a', fileCount: 1 },
				{ team: '@n8n-io/team-b', fileCount: 1 },
			],
		);

		assert.match(table, /\| Other teams \| 2 \| 67% \| \+3 \/ -2 \| \+0 \/ -0 \| \+0 \/ -0 \|/);
	});
});

describe('buildComment', () => {
	it('starts with the bot marker', () => {
		const body = buildComment([], new Set(['a.ts']), EMPTY_LINE_STATS);

		assert.ok(body.startsWith(BOT_MARKER), 'body must start with the bot marker');
	});

	it('includes the overview table', () => {
		const body = buildComment(
			[{ team: '@n8n-io/cli-team', fileCount: 1 }],
			new Set(['a.ts']),
			{ ...EMPTY_LINE_STATS, sourceCodeAdded: 42 },
		);

		assert.match(body, /## PR review overview/);
		assert.match(body, /\| @n8n-io\/cli-team \| 1 \| 100% \|/);
	});

	it('shows a warning below the table when source code additions exceed the size limit', () => {
		const body = buildComment([], new Set(['a.ts']), { ...EMPTY_LINE_STATS, sourceCodeAdded: 1001 });

		assert.match(body, /❗ Source code additions \(1[,.]001\) exceed the 1[,.]000-line limit\./);
	});
});

describe('computeLineStats', () => {
	it('returns all zeros for an empty file list', () => {
		assert.deepEqual(computeLineStats([]), EMPTY_LINE_STATS);
	});

	it('categorises a plain source file as source code', () => {
		const stats = computeLineStats([{ filename: 'src/foo.ts', additions: 10, deletions: 3 }]);

		assert.equal(stats.sourceCodeAdded, 10);
		assert.equal(stats.sourceCodeRemoved, 3);
		assert.equal(stats.testFilesAdded, 0);
		assert.equal(stats.miscAdded, 0);
	});

	describe('test file patterns', () => {
		for (const [label, filename] of [
			['*.test.ts', 'src/foo.test.ts'],
			['*.test.js', 'src/foo.test.js'],
			['*.test.mjs', 'src/foo.test.mjs'],
			['*.spec.ts', 'src/foo.spec.ts'],
			['*.spec.js', 'src/foo.spec.js'],
			['*.spec.mjs', 'src/foo.spec.mjs'],
			['test/ directory', 'packages/cli/test/helpers.ts'],
			['tests/ directory', 'packages/cli/tests/helpers.ts'],
			['__tests__/ directory', 'src/__tests__/foo.ts'],
			['__snapshots__/ directory', 'src/__snapshots__/foo.snap'],
			['*.snap extension', 'src/foo.snap'],
			['fixtures/ directory', 'src/fixtures/data.json'],
			['__mocks__/ directory', 'src/__mocks__/axios.ts'],
			['packages/testing/**', 'packages/testing/playwright/spec.ts'],
			['dot-directory *.test.mjs', '.github/scripts/owners/owners.test.mjs'],
		]) {
			it(`classifies ${label} as testFiles`, () => {
				const stats = computeLineStats([{ filename, additions: 7, deletions: 2 }]);

				assert.equal(stats.testFilesAdded, 7, `expected ${filename} to be a test file`);
				assert.equal(stats.testFilesRemoved, 2);
				assert.equal(stats.sourceCodeAdded, 0);
				assert.equal(stats.miscAdded, 0);
			});
		}
	});

	describe('misc file patterns', () => {
		for (const [label, filename] of [
			['pnpm-lock.yaml', 'pnpm-lock.yaml'],
			['*.md', 'README.md'],
			['nested *.md', 'packages/cli/CHANGELOG.md'],
			['*.mdx', 'docs/guide.mdx'],
			['nested *.mdx', 'packages/editor-ui/docs/page.mdx'],
		]) {
			it(`classifies ${label} as misc`, () => {
				const stats = computeLineStats([{ filename, additions: 3, deletions: 1 }]);

				assert.equal(stats.miscAdded, 3, `expected ${filename} to be misc`);
				assert.equal(stats.miscRemoved, 1);
				assert.equal(stats.sourceCodeAdded, 0);
				assert.equal(stats.testFilesAdded, 0);
			});
		}
	});

	it('sums additions and deletions across multiple files per category', () => {
		const stats = computeLineStats([
			{ filename: 'src/a.ts', additions: 10, deletions: 5 },
			{ filename: 'src/b.ts', additions: 15, deletions: 3 },
			{ filename: 'src/a.test.ts', additions: 5, deletions: 1 },
			{ filename: 'src/b.spec.ts', additions: 8, deletions: 2 },
			{ filename: 'pnpm-lock.yaml', additions: 100, deletions: 50 },
			{ filename: 'README.md', additions: 20, deletions: 10 },
		]);

		assert.equal(stats.sourceCodeAdded, 25);
		assert.equal(stats.sourceCodeRemoved, 8);
		assert.equal(stats.testFilesAdded, 13);
		assert.equal(stats.testFilesRemoved, 3);
		assert.equal(stats.miscAdded, 120);
		assert.equal(stats.miscRemoved, 60);
	});
});

describe('computeAllocationLineStats', () => {
	it('computes line stats per owner allocation', () => {
		const statsByTeam = computeAllocationLineStats(
			[
				{ team: '@n8n-io/cli-team', fileCount: 2 },
				{ team: '@n8n-io/docs-team', fileCount: 1 },
			],
			new Map([
				['@n8n-io/cli-team', ['src/a.ts', 'src/a.test.ts']],
				['@n8n-io/docs-team', ['README.md']],
			]),
			[
				{ filename: 'src/a.ts', additions: 10, deletions: 1 },
				{ filename: 'src/a.test.ts', additions: 5, deletions: 2 },
				{ filename: 'README.md', additions: 3, deletions: 1 },
			],
		);

		assert.deepEqual(statsByTeam.get('@n8n-io/cli-team'), {
			sourceCodeAdded: 10,
			sourceCodeRemoved: 1,
			testFilesAdded: 5,
			testFilesRemoved: 2,
			miscAdded: 0,
			miscRemoved: 0,
		});
		assert.deepEqual(statsByTeam.get('@n8n-io/docs-team'), {
			sourceCodeAdded: 0,
			sourceCodeRemoved: 0,
			testFilesAdded: 0,
			testFilesRemoved: 0,
			miscAdded: 3,
			miscRemoved: 1,
		});
	});

	it('matches renamed files by previous filename', () => {
		const statsByTeam = computeAllocationLineStats(
			[{ team: '@n8n-io/cli-team', fileCount: 1 }],
			new Map([['@n8n-io/cli-team', ['old-name.ts']]]),
			[{ filename: 'new-name.ts', previous_filename: 'old-name.ts', additions: 7, deletions: 3 }],
		);

		assert.equal(statsByTeam.get('@n8n-io/cli-team').sourceCodeAdded, 7);
		assert.equal(statsByTeam.get('@n8n-io/cli-team').sourceCodeRemoved, 3);
	});
});

describe('buildRequiredReviewsSection', () => {
	it('returns null when no approval is required', () => {
		assert.equal(buildRequiredReviewsSection(new Map()), null);
	});

	it('lists each required team with its file count', () => {
		const section = buildRequiredReviewsSection(
			new Map([
				['@n8n-io/qa-dx', ['a.yml', 'b.yml']],
				['@n8n-io/migrations-review', ['m.ts']],
			]),
		);

		assert.match(section, /### Required reviews/);
		assert.match(section, /\| @n8n-io\/qa-dx \| 2 \|/);
		assert.match(section, /\| @n8n-io\/migrations-review \| 1 \|/);
	});

	it('prompts to request review from the team, plural when several teams are required', () => {
		const singular = buildRequiredReviewsSection(new Map([['@n8n-io/qa-dx', ['a.yml']]]));
		const plural = buildRequiredReviewsSection(
			new Map([
				['@n8n-io/qa-dx', ['a.yml']],
				['@n8n-io/migrations-review', ['m.ts']],
			]),
		);

		assert.match(singular, /Request a review from the team —/);
		assert.match(plural, /Request a review from the teams —/);
	});
});

describe('run', () => {
	let postOrUpdateComment;

	beforeEach(() => {
		getPrFilesImpl = async () => [];
		postOrUpdateComment = mock.fn(async () => {});
		postOrUpdateCommentImpl = postOrUpdateComment;
		parseOwnersFileImpl = () => [];
		assignOwnershipImpl = () => new Map();
		ownershipsToAllocationsImpl = () => [];
		resolveRequiredTeamsImpl = () => new Map();
	});

	it('calls postOrUpdateComment with the PR number, generated body, and bot marker', async () => {
		await run(42);

		assert.equal(postOrUpdateComment.mock.calls.length, 1, 'postOrUpdateComment should be called once');
		assert.equal(postOrUpdateComment.mock.calls[0].arguments[0], 42);
		assert.ok(postOrUpdateComment.mock.calls[0].arguments[1].includes(BOT_MARKER));
		assert.equal(postOrUpdateComment.mock.calls[0].arguments[2], BOT_MARKER);
	});

	it('includes renamed files in the changed files set', async () => {
		getPrFilesImpl = async () => [
			{ filename: 'new-name.ts', additions: 5, deletions: 0, previous_filename: 'old-name.ts' },
		];

		let capturedChangedFiles = new Set();
		assignOwnershipImpl = (files) => {
			capturedChangedFiles = files;
			return new Map();
		};

		await run(42);

		assert.ok(capturedChangedFiles.has('new-name.ts'), 'new filename must be included');
		assert.ok(capturedChangedFiles.has('old-name.ts'), 'previous filename must be included');
	});

	it('limits recommendations to the top 3 allocations by total line changes', async () => {
		getPrFilesImpl = async () => [
			{ filename: 'a.ts', additions: 1, deletions: 0 },
			{ filename: 'b.ts', additions: 50, deletions: 50 },
			{ filename: 'c.ts', additions: 20, deletions: 20 },
			{ filename: 'd.ts', additions: 10, deletions: 10 },
		];
		assignOwnershipImpl = () =>
			new Map([
				['@n8n-io/team-a', ['a.ts']],
				['@n8n-io/team-b', ['b.ts']],
				['@n8n-io/team-c', ['c.ts']],
				['@n8n-io/team-d', ['d.ts']],
			]);
		ownershipsToAllocationsImpl = () => [
			{ team: '@n8n-io/team-a', fileCount: 1 },
			{ team: '@n8n-io/team-b', fileCount: 1 },
			{ team: '@n8n-io/team-c', fileCount: 1 },
			{ team: '@n8n-io/team-d', fileCount: 1 },
		];

		await run(42);

		const body = postOrUpdateComment.mock.calls[0].arguments[1];
		assert.match(body, /@n8n-io\/team-b[\s\S]*@n8n-io\/team-c[\s\S]*@n8n-io\/team-d/);
		assert.doesNotMatch(body, /@n8n-io\/team-a/);
		assert.match(body, /\| Other teams \| 1 \| 25% \| \+1 \/ -0 \| \+0 \/ -0 \| \+0 \/ -0 \|/);
	});

	it('posted comment body includes the ownership-first overview table', async () => {
		getPrFilesImpl = async () => [{ filename: 'src/foo.ts', additions: 50, deletions: 5 }];
		ownershipsToAllocationsImpl = () => [{ team: '@n8n-io/cli-team', fileCount: 1 }];
		assignOwnershipImpl = () => new Map([['@n8n-io/cli-team', ['src/foo.ts']]]);

		await run(42);

		const body = postOrUpdateComment.mock.calls[0].arguments[1];
		assert.match(body, /## PR review overview/);
		assert.match(body, /\| @n8n-io\/cli-team \| 1 \| 100% \| \+50 \/ -5 \|/);
	});

	it('omits the required reviews section when no approval is required', async () => {
		await run(42);

		const body = postOrUpdateComment.mock.calls[0].arguments[1];
		assert.doesNotMatch(body, /### Required reviews/);
	});

	it('includes the required reviews section with the team review prompt', async () => {
		getPrFilesImpl = async () => [{ filename: '.github/workflows/ci.yml', additions: 1, deletions: 0 }];
		parseOwnersFileImpl = () => [
			{ pattern: '.github/workflows/', team: '@n8n-io/qa-dx', required: true, line: 1 },
		];
		resolveRequiredTeamsImpl = () => new Map([['@n8n-io/qa-dx', ['.github/workflows/ci.yml']]]);

		await run(42);

		const body = postOrUpdateComment.mock.calls[0].arguments[1];
		assert.match(body, /### Required reviews/);
		assert.match(body, /\| @n8n-io\/qa-dx \| 1 \|/);
		assert.match(body, /Request a review from the team —/);
	});
});
