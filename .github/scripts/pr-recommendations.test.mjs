import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/pr-recommendations.test.mjs
 * */

// ---------------------------------------------------------------------------
// Mutable stubs — individual tests can override these before calling `run`.
// mock.module must be called before the module under test is imported.
// ---------------------------------------------------------------------------

let getPrFilesImpl = async () => [];
let initGithubImpl = () => ({ owner: 'o', repo: 'r', octokit: null });

mock.module('./github-helpers.mjs', {
	namedExports: {
		ensureEnvVar: () => {},
		initGithub: () => initGithubImpl(),
		getChangedFiles: () => Promise.resolve(new Set()),
		getEventFromGithubEventPath: () => ({}),
		getPrFiles: (n) => getPrFilesImpl(n),
	},
});

let parseOwnersFileImpl = () => [];
let assignOwnershipImpl = () => new Map();
let ownershipsToAllocationsImpl = () => [];

mock.module('./owners.mjs', {
	namedExports: {
		parseOwnersFile: () => parseOwnersFileImpl(),
		assignOwnership: (files, owners) => assignOwnershipImpl(files, owners),
		ownershipsToAllocations: (ownerships) => ownershipsToAllocationsImpl(ownerships),
	},
});

const {
	buildReviewersSection,
	buildChangedLinesSection,
	buildComment,
	computeLineStats,
	run,
} = await import('./pr-recommendations.mjs');

const BOT_MARKER = '<!-- pr-recommendations -->';
const EMPTY_LINE_STATS = { sourceCode: 0, testFiles: 0, misc: 0 };

// ---------------------------------------------------------------------------
// Helper: build a minimal octokit mock whose call history is inspectable
// ---------------------------------------------------------------------------
function makeOctokitMock({ existingComments = [] } = {}) {
	const createComment = mock.fn(async () => {});
	const updateComment = mock.fn(async () => {});

	const octokit = {
		paginate: async (_fn, _opts) => existingComments,
		rest: {
			issues: {
				listComments: {},
				createComment,
				updateComment,
			},
		},
	};

	return { octokit, createComment, updateComment };
}

// ---------------------------------------------------------------------------
// buildReviewersSection
// ---------------------------------------------------------------------------

describe('buildReviewersSection', () => {
	it('returns the fallback message when there are no allocations', () => {
		const section = buildReviewersSection([], new Set(['a.ts']));

		assert.match(section, /No owning teams matched/);
	});

	it('returns the fallback message when no files changed', () => {
		const section = buildReviewersSection(
			[{ team: '@n8n-io/cli-team', fileCount: 0 }],
			new Set(),
		);

		assert.match(section, /No owning teams matched/);
	});

	it('renders a table with team name, file count, and rounded percentage', () => {
		const section = buildReviewersSection(
			[
				{ team: '@n8n-io/cli-team', fileCount: 6 },
				{ team: '@n8n-io/catalysts', fileCount: 3 },
				{ team: '@n8n-io/ai-team', fileCount: 1 },
			],
			new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']),
		);

		assert.match(section, /\| @n8n-io\/cli-team \| 6 \| 60% \|/);
		assert.match(section, /\| @n8n-io\/catalysts \| 3 \| 30% \|/);
		assert.match(section, /\| @n8n-io\/ai-team \| 1 \| 10% \|/);
	});

	it('rounds the percentage to the nearest integer', () => {
		// 2 out of 3 = 66.66…% → rounds to 67%
		const section = buildReviewersSection(
			[{ team: '@n8n-io/cli-team', fileCount: 2 }],
			new Set(['a.ts', 'b.ts', 'c.ts']),
		);

		assert.match(section, /\| @n8n-io\/cli-team \| 2 \| 67% \|/);
	});

	it('uses singular "file" when exactly one file changed', () => {
		const section = buildReviewersSection(
			[{ team: '@n8n-io/cli-team', fileCount: 1 }],
			new Set(['only.ts']),
		);

		assert.match(section, /ownership of the 1 changed file in this PR/);
	});

	it('uses plural "files" for more than one changed file', () => {
		const section = buildReviewersSection(
			[{ team: '@n8n-io/cli-team', fileCount: 2 }],
			new Set(['a.ts', 'b.ts']),
		);

		assert.match(section, /ownership of the 2 changed files in this PR/);
	});

	it('includes the table header', () => {
		const section = buildReviewersSection(
			[{ team: '@n8n-io/cli-team', fileCount: 1 }],
			new Set(['a.ts']),
		);

		assert.match(section, /\| Team \| Files owned \| Share \|/);
	});
});

// ---------------------------------------------------------------------------
// buildChangedLinesSection
// ---------------------------------------------------------------------------

describe('buildChangedLinesSection', () => {
	it('renders a table with all three categories and a total row', () => {
		const section = buildChangedLinesSection({ sourceCode: 100, testFiles: 50, misc: 10 });

		assert.match(section, /## Changed lines/);
		assert.match(section, /\| Source code \| 100 \|/);
		assert.match(section, /\| Test files \| 50 \|/);
		assert.match(section, /\| Misc \| 10 \|/);
		assert.match(section, /\| \*\*Total\*\* \| \*\*160\*\* \|/);
	});

	it('adds ❗ to source code label when it exceeds the size limit', () => {
		const section = buildChangedLinesSection({ sourceCode: 1001, testFiles: 0, misc: 0 });

		assert.match(section, /\| Source code ❗ \|/);
	});

	it('does not add ❗ when source code is exactly at the size limit', () => {
		const section = buildChangedLinesSection({ sourceCode: 1000, testFiles: 0, misc: 0 });

		assert.match(section, /\| Source code \|/);
		assert.doesNotMatch(section, /❗/);
	});

	it('does not add ❗ when source code is below the size limit', () => {
		const section = buildChangedLinesSection({ sourceCode: 999, testFiles: 0, misc: 0 });

		assert.doesNotMatch(section, /❗/);
	});

	it('formats large numbers with locale thousands separator', () => {
		const section = buildChangedLinesSection({ sourceCode: 12345, testFiles: 1000, misc: 0 });

		assert.match(section, /12[,.]345/); // separator varies by locale, both are valid
		assert.match(section, /1[,.]000/);
	});

	it('renders zero values as 0 and total as 0', () => {
		const section = buildChangedLinesSection(EMPTY_LINE_STATS);

		assert.match(section, /\| Source code \| 0 \|/);
		assert.match(section, /\| Test files \| 0 \|/);
		assert.match(section, /\| Misc \| 0 \|/);
		assert.match(section, /\| \*\*Total\*\* \| \*\*0\*\* \|/);
	});

	it('includes the table header', () => {
		const section = buildChangedLinesSection(EMPTY_LINE_STATS);

		assert.match(section, /\| Category \| Lines added \|/);
	});
});

// ---------------------------------------------------------------------------
// buildComment
// ---------------------------------------------------------------------------

describe('buildComment', () => {
	it('starts with the bot marker', () => {
		const body = buildComment([], new Set(['a.ts']), EMPTY_LINE_STATS);

		assert.ok(body.startsWith(BOT_MARKER), 'body must start with the bot marker');
	});

	it('includes both sections', () => {
		const body = buildComment(
			[{ team: '@n8n-io/cli-team', fileCount: 1 }],
			new Set(['a.ts']),
			{ sourceCode: 42, testFiles: 5, misc: 1 },
		);

		assert.match(body, /## Recommended reviewers/);
		assert.match(body, /## Changed lines/);
	});

	it('reviewer fallback and changed-lines section both appear when no owners matched', () => {
		const body = buildComment([], new Set(['a.ts']), { sourceCode: 10, testFiles: 0, misc: 0 });

		assert.match(body, /No owning teams matched/);
		assert.match(body, /## Changed lines/);
	});

	it('sections are separated by a blank line', () => {
		const body = buildComment(
			[{ team: '@n8n-io/cli-team', fileCount: 1 }],
			new Set(['a.ts']),
			EMPTY_LINE_STATS,
		);

		// The reviewers section ends before "## Changed lines" with a blank line between them
		assert.match(body, /\n\n## Changed lines/);
	});
});

// ---------------------------------------------------------------------------
// computeLineStats — source code vs test files vs misc classification
// ---------------------------------------------------------------------------

describe('computeLineStats', () => {
	it('returns all zeros for an empty file list', () => {
		const stats = computeLineStats([]);

		assert.deepEqual(stats, { sourceCode: 0, testFiles: 0, misc: 0 });
	});

	it('categorises a plain source file as source code', () => {
		const stats = computeLineStats([{ filename: 'src/foo.ts', additions: 10 }]);

		assert.equal(stats.sourceCode, 10);
		assert.equal(stats.testFiles, 0);
		assert.equal(stats.misc, 0);
	});

	describe('test file patterns → testFiles', () => {
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
		]) {
			it(`classifies ${label} as testFiles`, () => {
				const stats = computeLineStats([{ filename, additions: 7 }]);

				assert.equal(stats.testFiles, 7, `expected ${filename} to be a test file`);
				assert.equal(stats.sourceCode, 0);
				assert.equal(stats.misc, 0);
			});
		}
	});

	describe('misc file patterns → misc', () => {
		for (const [label, filename] of [
			['pnpm-lock.yaml', 'pnpm-lock.yaml'],
			['*.md', 'README.md'],
			['nested *.md', 'packages/cli/CHANGELOG.md'],
			['*.mdx', 'docs/guide.mdx'],
			['nested *.mdx', 'packages/editor-ui/docs/page.mdx'],
		]) {
			it(`classifies ${label} as misc`, () => {
				const stats = computeLineStats([{ filename, additions: 3 }]);

				assert.equal(stats.misc, 3, `expected ${filename} to be misc`);
				assert.equal(stats.sourceCode, 0);
				assert.equal(stats.testFiles, 0);
			});
		}
	});

	it('sums additions across multiple files per category', () => {
		const stats = computeLineStats([
			{ filename: 'src/a.ts', additions: 10 },
			{ filename: 'src/b.ts', additions: 15 },
			{ filename: 'src/a.test.ts', additions: 5 },
			{ filename: 'src/b.spec.ts', additions: 8 },
			{ filename: 'pnpm-lock.yaml', additions: 100 },
			{ filename: 'README.md', additions: 20 },
		]);

		assert.equal(stats.sourceCode, 25);
		assert.equal(stats.testFiles, 13);
		assert.equal(stats.misc, 120);
	});

	it('test patterns take priority over misc patterns', () => {
		// A *.test.md file — matches both test extension logic and *.md misc pattern.
		// test classification wins because it is checked first.
		const stats = computeLineStats([{ filename: 'src/foo.test.ts', additions: 5 }]);

		assert.equal(stats.testFiles, 5);
		assert.equal(stats.misc, 0);
	});
});

// ---------------------------------------------------------------------------
// run — integration tests (GitHub API interactions)
// ---------------------------------------------------------------------------

describe('run', () => {
	beforeEach(() => {
		// Reset stubs to safe defaults before each test
		getPrFilesImpl = async () => [];
		parseOwnersFileImpl = () => [];
		assignOwnershipImpl = () => new Map();
		ownershipsToAllocationsImpl = () => [];
	});

	it('creates a new comment when no existing bot-marker comment is found', async () => {
		const { octokit, createComment, updateComment } = makeOctokitMock({
			existingComments: [],
		});
		initGithubImpl = () => ({ owner: 'o', repo: 'r', octokit });

		await run(42);

		assert.equal(createComment.mock.calls.length, 1, 'createComment should be called once');
		assert.equal(updateComment.mock.calls.length, 0, 'updateComment should not be called');

		const { body } = createComment.mock.calls[0].arguments[0];
		assert.ok(body.includes(BOT_MARKER));
	});

	it('updates the existing comment when the bot-marker comment is found', async () => {
		const existingComments = [{ id: 99, body: `${BOT_MARKER}\nold content` }];
		const { octokit, createComment, updateComment } = makeOctokitMock({ existingComments });
		initGithubImpl = () => ({ owner: 'o', repo: 'r', octokit });

		await run(42);

		assert.equal(updateComment.mock.calls.length, 1, 'updateComment should be called once');
		assert.equal(createComment.mock.calls.length, 0, 'createComment should not be called');

		const args = updateComment.mock.calls[0].arguments[0];
		assert.equal(args.comment_id, 99);
		assert.ok(args.body.includes(BOT_MARKER));
	});

	it('includes renamed files (previous_filename) in the changed files set', async () => {
		getPrFilesImpl = async () => [
			{ filename: 'new-name.ts', additions: 5, previous_filename: 'old-name.ts' },
		];

		let capturedChangedFiles;
		assignOwnershipImpl = (files) => {
			capturedChangedFiles = files;
			return new Map();
		};

		const { octokit } = makeOctokitMock();
		initGithubImpl = () => ({ owner: 'o', repo: 'r', octokit });

		await run(42);

		assert.ok(capturedChangedFiles.has('new-name.ts'), 'new filename must be included');
		assert.ok(capturedChangedFiles.has('old-name.ts'), 'previous filename must be included');
	});

	it('limits reviewer recommendations to the top 3 allocations by file count', async () => {
		getPrFilesImpl = async () => [
			{ filename: 'a.ts', additions: 1 },
			{ filename: 'b.ts', additions: 1 },
		];
		ownershipsToAllocationsImpl = () => [
			{ team: '@n8n-io/team-a', fileCount: 1 },
			{ team: '@n8n-io/team-b', fileCount: 5 },
			{ team: '@n8n-io/team-c', fileCount: 3 },
			{ team: '@n8n-io/team-d', fileCount: 2 },
		];

		const { octokit, createComment } = makeOctokitMock();
		initGithubImpl = () => ({ owner: 'o', repo: 'r', octokit });

		await run(42);

		const { body } = createComment.mock.calls[0].arguments[0];
		assert.match(body, /@n8n-io\/team-b/); // rank 1
		assert.match(body, /@n8n-io\/team-c/); // rank 2
		assert.match(body, /@n8n-io\/team-d/); // rank 3
		assert.doesNotMatch(body, /@n8n-io\/team-a/); // rank 4 — excluded
	});

	it('posted comment body includes both reviewer and changed-lines sections', async () => {
		getPrFilesImpl = async () => [{ filename: 'src/foo.ts', additions: 50 }];
		ownershipsToAllocationsImpl = () => [{ team: '@n8n-io/cli-team', fileCount: 1 }];
		assignOwnershipImpl = () => new Map([['@n8n-io/cli-team', ['src/foo.ts']]]);

		const { octokit, createComment } = makeOctokitMock();
		initGithubImpl = () => ({ owner: 'o', repo: 'r', octokit });

		await run(42);

		const { body } = createComment.mock.calls[0].arguments[0];
		assert.match(body, /## Recommended reviewers/);
		assert.match(body, /## Changed lines/);
	});
});
