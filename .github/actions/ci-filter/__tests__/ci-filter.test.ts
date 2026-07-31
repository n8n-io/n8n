import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchGlob, parseFilters, evaluateFilter, runValidate } from '../ci-filter.mjs';

// --- matchGlob ---

describe('matchGlob', () => {
	it('** matches dotfiles', () => {
		assert.ok(matchGlob('.github/workflows/ci.yml', '**'));
	});

	it('** matches deeply nested paths', () => {
		assert.ok(matchGlob('packages/cli/src/controllers/auth.ts', '**'));
	});

	it('** matches root-level files', () => {
		assert.ok(matchGlob('README.md', '**'));
	});

	it('.github/** matches workflow files', () => {
		assert.ok(matchGlob('.github/workflows/ci.yml', '.github/**'));
	});

	it('.github/** matches action files', () => {
		assert.ok(matchGlob('.github/actions/ci-filter/action.yml', '.github/**'));
	});

	it('.github/** does not match non-.github paths', () => {
		assert.ok(!matchGlob('packages/cli/src/index.ts', '.github/**'));
	});

	it('scoped package pattern matches files in that package', () => {
		assert.ok(
			matchGlob(
				'packages/@n8n/task-runner-python/src/main.py',
				'packages/@n8n/task-runner-python/**',
			),
		);
	});

	it('scoped package pattern does not match other packages', () => {
		assert.ok(!matchGlob('packages/@n8n/config/src/index.ts', 'packages/@n8n/task-runner-python/**'));
	});

	it('* matches single-level only', () => {
		assert.ok(matchGlob('README.md', '*.md'));
		assert.ok(!matchGlob('docs/README.md', '*.md'));
	});

	it('exact path match', () => {
		assert.ok(matchGlob('package.json', 'package.json'));
		assert.ok(!matchGlob('packages/cli/package.json', 'package.json'));
	});

	it('? matches single character', () => {
		assert.ok(matchGlob('file1.txt', 'file?.txt'));
		assert.ok(!matchGlob('file12.txt', 'file?.txt'));
	});

	it('**/ at start matches zero or more path segments', () => {
		assert.ok(matchGlob('src/index.ts', '**/index.ts'));
		assert.ok(matchGlob('packages/cli/src/index.ts', '**/index.ts'));
		assert.ok(matchGlob('index.ts', '**/index.ts'));
	});

	it('**/ in middle matches nested paths', () => {
		assert.ok(matchGlob('packages/@n8n/db/src/deep/file.ts', 'packages/@n8n/db/**'));
	});
});

// --- parseFilters ---

describe('parseFilters', () => {
	it('parses single-line filter', () => {
		const filters = parseFilters('workflows: .github/**');
		assert.deepEqual(filters.get('workflows'), ['.github/**']);
	});

	it('parses single-line with multiple patterns', () => {
		const filters = parseFilters('db: packages/@n8n/db/** packages/cli/**');
		assert.deepEqual(filters.get('db'), ['packages/@n8n/db/**', 'packages/cli/**']);
	});

	it('parses multi-line filter', () => {
		const input = `non-python:
  **
  !packages/@n8n/task-runner-python/**`;
		const filters = parseFilters(input);
		assert.deepEqual(filters.get('non-python'), ['**', '!packages/@n8n/task-runner-python/**']);
	});

	it('parses mixed single and multi-line', () => {
		const input = `non-python:
  **
  !packages/@n8n/task-runner-python/**
workflows: .github/**`;
		const filters = parseFilters(input);
		assert.equal(filters.size, 2);
		assert.deepEqual(filters.get('non-python'), ['**', '!packages/@n8n/task-runner-python/**']);
		assert.deepEqual(filters.get('workflows'), ['.github/**']);
	});

	it('ignores comments and blank lines', () => {
		const input = `# This is a comment

workflows: .github/**

# Another comment
db: packages/@n8n/db/**`;
		const filters = parseFilters(input);
		assert.equal(filters.size, 2);
	});

	it('throws on malformed input', () => {
		assert.throws(() => parseFilters('not a valid filter line'), /Malformed/);
	});

	it('throws on filter with no patterns', () => {
		const input = `empty:
other: .github/**`;
		assert.throws(() => parseFilters(input), /no patterns/);
	});
});

// --- evaluateFilter ---

describe('evaluateFilter', () => {
	it('python-only files with non-python filter returns false', () => {
		const files = [
			'packages/@n8n/task-runner-python/src/main.py',
			'packages/@n8n/task-runner-python/pyproject.toml',
		];
		const patterns = ['**', '!packages/@n8n/task-runner-python/**'];
		assert.equal(evaluateFilter(files, patterns), false);
	});

	it('mixed python and non-python returns true', () => {
		const files = [
			'packages/@n8n/task-runner-python/src/main.py',
			'packages/cli/src/index.ts',
		];
		const patterns = ['**', '!packages/@n8n/task-runner-python/**'];
		assert.equal(evaluateFilter(files, patterns), true);
	});

	it('non-python files with non-python filter returns true', () => {
		const files = ['packages/cli/src/index.ts', 'packages/core/src/utils.ts'];
		const patterns = ['**', '!packages/@n8n/task-runner-python/**'];
		assert.equal(evaluateFilter(files, patterns), true);
	});

	it('.github files with workflows filter returns true', () => {
		const files = ['.github/workflows/ci.yml', '.github/actions/setup/action.yml'];
		const patterns = ['.github/**'];
		assert.equal(evaluateFilter(files, patterns), true);
	});

	it('non-.github files with workflows filter returns false', () => {
		const files = ['packages/cli/src/index.ts'];
		const patterns = ['.github/**'];
		assert.equal(evaluateFilter(files, patterns), false);
	});

	it('empty changed files returns false', () => {
		assert.equal(evaluateFilter([], ['**']), false);
	});

	it('last matching pattern wins (gitignore semantics)', () => {
		const files = ['packages/@n8n/task-runner-python/src/main.py'];
		const patterns = ['**', '!packages/@n8n/task-runner-python/**', 'packages/@n8n/task-runner-python/**'];
		assert.equal(evaluateFilter(files, patterns), true);
	});
});

// --- runValidate ---

describe('runValidate', () => {
	function runWithResults(jobResults: Record<string, { result: string }>): number | null {
		const originalEnv = process.env.INPUT_JOB_RESULTS;
		const originalExit = process.exit;
		let exitCode: number | null = null;

		process.env.INPUT_JOB_RESULTS = JSON.stringify(jobResults);
		process.exit = ((code: number) => { exitCode = code; }) as never;

		try {
			runValidate();
		} finally {
			process.env.INPUT_JOB_RESULTS = originalEnv;
			process.exit = originalExit;
		}

		return exitCode;
	}

	it('passes when all jobs succeed', () => {
		assert.equal(runWithResults({
			'install-and-build': { result: 'success' },
			'unit-test': { result: 'success' },
			typecheck: { result: 'success' },
			lint: { result: 'success' },
		}), null);
	});

	it('passes when some jobs are skipped (filtered out)', () => {
		assert.equal(runWithResults({
			'install-and-build': { result: 'success' },
			'unit-test': { result: 'success' },
			'security-checks': { result: 'skipped' },
		}), null);
	});

	it('fails when a job fails', () => {
		assert.equal(runWithResults({
			'install-and-build': { result: 'success' },
			'unit-test': { result: 'failure' },
			typecheck: { result: 'success' },
		}), 1);
	});

	it('fails when a job is cancelled', () => {
		assert.equal(runWithResults({
			'install-and-build': { result: 'success' },
			'unit-test': { result: 'cancelled' },
		}), 1);
	});

	it('fails when multiple jobs have problems', () => {
		assert.equal(runWithResults({
			'unit-test': { result: 'failure' },
			typecheck: { result: 'cancelled' },
			lint: { result: 'success' },
		}), 1);
	});
});
