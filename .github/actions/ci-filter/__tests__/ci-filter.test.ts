import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	matchGlob,
	parseFilters,
	evaluateFilter,
	formatChangedFilesOutput,
	runValidate,
	getChangedFiles,
	getMergeBase,
} from '../ci-filter.mjs';

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
		assert.ok(
			!matchGlob('packages/@n8n/config/src/index.ts', 'packages/@n8n/task-runner-python/**'),
		);
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

	it('parses YAML-list-style multi-line filter', () => {
		const input = `db:
  - packages/@n8n/db/**
  - packages/cli/**`;
		const filters = parseFilters(input);
		assert.deepEqual(filters.get('db'), ['packages/@n8n/db/**', 'packages/cli/**']);
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
		const files = ['packages/@n8n/task-runner-python/src/main.py', 'packages/cli/src/index.ts'];
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

	it('list-style parsed db filter matches db package changes', () => {
		const filters = parseFilters(`db:
  - packages/@n8n/db/**
  - packages/cli/**`);
		assert.equal(evaluateFilter(['packages/@n8n/db/src/index.ts'], filters.get('db') ?? []), true);
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
		const patterns = [
			'**',
			'!packages/@n8n/task-runner-python/**',
			'packages/@n8n/task-runner-python/**',
		];
		assert.equal(evaluateFilter(files, patterns), true);
	});
});

// --- formatChangedFilesOutput (oversized change-set cap) ---

describe('formatChangedFilesOutput', () => {
	it('joins the list with newlines when under the cap', () => {
		const files = ['packages/cli/src/a.ts', 'packages/core/src/b.ts'];
		assert.equal(
			formatChangedFilesOutput(files, 10),
			'packages/cli/src/a.ts\npackages/core/src/b.ts',
		);
	});

	it('returns the full list at exactly the cap', () => {
		const files = ['a', 'b', 'c'];
		assert.equal(formatChangedFilesOutput(files, 3), 'a\nb\nc');
	});

	it('returns an empty string when the list exceeds the cap', () => {
		const files = ['a', 'b', 'c', 'd'];
		assert.equal(formatChangedFilesOutput(files, 3), '');
	});

	it('empty input stays empty', () => {
		assert.equal(formatChangedFilesOutput([], 10), '');
	});
});

// --- runtime filter (E2E-chain scoping) ---

describe('runtime filter', () => {
	const runtimePatterns = [
		'**',
		'!packages/@n8n/task-runner-python/**',
		'!.github/**',
		'!**/*.md',
		'!**/LICENSE',
		'!**/CHANGELOG.md',
		'!**/*.test.ts',
		'!**/*.spec.ts',
		'!packages/testing/playwright/**',
		'!packages/frontend/@n8n/storybook/**',
		'!scripts/agent-setup.mjs',
		'!scripts/backend-module/**',
		'!scripts/licenses/**',
		'!scripts/mutation-health/**',
		'!scripts/sync-agent-skill-links.mjs',
	];

	it('triggers on a runtime source file', () => {
		assert.equal(evaluateFilter(['packages/cli/src/foo.ts'], runtimePatterns), true);
	});

	it('does not trigger on a unit test file', () => {
		assert.equal(evaluateFilter(['packages/cli/src/foo.test.ts'], runtimePatterns), false);
	});

	it('does not trigger on a spec file', () => {
		assert.equal(evaluateFilter(['packages/cli/src/foo.spec.ts'], runtimePatterns), false);
	});

	it('does not trigger on playwright tests', () => {
		assert.equal(
			evaluateFilter(['packages/testing/playwright/tests/x.spec.ts'], runtimePatterns),
			false,
		);
	});

	it('does not trigger on storybook files', () => {
		assert.equal(
			evaluateFilter(['packages/frontend/@n8n/storybook/preview.ts'], runtimePatterns),
			false,
		);
	});

	it('does not trigger on docs or LICENSE', () => {
		assert.equal(evaluateFilter(['README.md'], runtimePatterns), false);
		assert.equal(evaluateFilter(['LICENSE'], runtimePatterns), false);
		assert.equal(evaluateFilter(['packages/cli/LICENSE'], runtimePatterns), false);
		assert.equal(evaluateFilter(['docs/CHANGELOG.md'], runtimePatterns), false);
	});

	it('does not trigger on .github workflow changes', () => {
		assert.equal(evaluateFilter(['.github/workflows/x.yml'], runtimePatterns), false);
	});

	it('does not trigger on task-runner-python changes', () => {
		assert.equal(
			evaluateFilter(['packages/@n8n/task-runner-python/src/main.py'], runtimePatterns),
			false,
		);
	});

	it('mixed PR with source and test file triggers (any positive-match file wins)', () => {
		const files = ['packages/cli/src/foo.ts', 'packages/cli/src/foo.test.ts'];
		assert.equal(evaluateFilter(files, runtimePatterns), true);
	});

	it('does not trigger on workflow-only tooling scripts', () => {
		assert.equal(evaluateFilter(['scripts/mutation-health/pick-next.mjs'], runtimePatterns), false);
		assert.equal(evaluateFilter(['scripts/licenses/enrich-sbom.mjs'], runtimePatterns), false);
		assert.equal(
			evaluateFilter(['scripts/backend-module/my-feature.service.template'], runtimePatterns),
			false,
		);
		assert.equal(evaluateFilter(['scripts/agent-setup.mjs'], runtimePatterns), false);
		assert.equal(evaluateFilter(['scripts/sync-agent-skill-links.mjs'], runtimePatterns), false);
	});

	it('still triggers on build/release-relevant scripts', () => {
		assert.equal(evaluateFilter(['scripts/build-n8n.mjs'], runtimePatterns), true);
		assert.equal(evaluateFilter(['scripts/dockerize-n8n.mjs'], runtimePatterns), true);
		assert.equal(evaluateFilter(['scripts/smoke-n8n-image.mjs'], runtimePatterns), true);
	});
});

// --- getChangedFiles + getMergeBase (integration, exercises real git) ---

describe('getChangedFiles', () => {
	const repoDir = mkdtempSync(join(tmpdir(), 'ci-filter-'));
	const remoteDir = mkdtempSync(join(tmpdir(), 'ci-filter-remote-'));
	const originalCwd = process.cwd();
	const git = (args: string[], cwd: string = repoDir) =>
		execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();

	before(() => {
		// Bare remote so the action's `git fetch origin <ref>` works
		execFileSync('git', ['init', '--bare', '-b', 'main', remoteDir], { stdio: 'pipe' });
		git(['init', '-b', 'main'], repoDir);
		git(['config', 'user.email', 'test@test.local']);
		git(['config', 'user.name', 'test']);
		git(['remote', 'add', 'origin', remoteDir]);

		// Common ancestor commit
		writeFileSync(join(repoDir, 'shared.ts'), 'shared\n');
		git(['add', '.']);
		git(['commit', '-m', 'root']);
		git(['push', 'origin', 'main']);

		// PR branches off main, adds a file
		git(['checkout', '-b', 'pr-branch']);
		writeFileSync(join(repoDir, 'pr-only.ts'), 'pr\n');
		git(['add', '.']);
		git(['commit', '-m', 'PR change']);

		// Master drifts forward, modifying shared.ts (the pre-fix bug surface)
		git(['checkout', 'main']);
		writeFileSync(join(repoDir, 'shared.ts'), 'shared\ndrift-from-master\n');
		git(['commit', '-am', 'master moves']);
		git(['push', 'origin', 'main']);

		// Sit on the PR branch as if running CI
		git(['checkout', 'pr-branch']);
		process.chdir(repoDir);
	});

	after(() => {
		process.chdir(originalCwd);
		rmSync(repoDir, { recursive: true, force: true });
		rmSync(remoteDir, { recursive: true, force: true });
	});

	it('returns only PR-introduced files (master drift does not pollute)', () => {
		const changed = getChangedFiles('main');
		assert.deepEqual(changed, ['pr-only.ts']);
	});

	it('getMergeBase returns the common ancestor commit', () => {
		const mergeBase = getMergeBase();
		assert.match(mergeBase, /^[a-f0-9]{40}$/);
		const expected = git(['merge-base', 'FETCH_HEAD', 'HEAD']);
		assert.equal(mergeBase, expected);
	});

	it('rejects unsafe base refs', () => {
		assert.throws(() => getChangedFiles('main; rm -rf /'), /Unsafe/);
		assert.throws(() => getChangedFiles('main$evil'), /Unsafe/);
	});
});

// --- getChangedFiles deep merge-base (shallow clone, stale base) ---

describe('getChangedFiles (shallow clone, stale base)', () => {
	const builderDir = mkdtempSync(join(tmpdir(), 'ci-filter-build-'));
	const remoteDir = mkdtempSync(join(tmpdir(), 'ci-filter-remote-shallow-'));
	const repoDir = mkdtempSync(join(tmpdir(), 'ci-filter-shallow-'));
	const originalCwd = process.cwd();
	const originalStep = process.env.CI_FILTER_DEEPEN_STEP;
	const git = (args: string[], cwd: string) =>
		execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();

	before(() => {
		execFileSync('git', ['init', '--bare', '-b', 'main', remoteDir], { stdio: 'pipe' });
		git(['init', '-b', 'main'], builderDir);
		git(['config', 'user.email', 'test@test.local'], builderDir);
		git(['config', 'user.name', 'test'], builderDir);
		git(['remote', 'add', 'origin', remoteDir], builderDir);

		// Common ancestor (the merge base the PR diverged from)
		writeFileSync(join(builderDir, 'shared.ts'), 'shared\n');
		git(['add', '.'], builderDir);
		git(['commit', '-m', 'root'], builderDir);
		git(['push', 'origin', 'main'], builderDir);

		// PR branch off root, adds a file
		git(['checkout', '-b', 'pr-branch'], builderDir);
		writeFileSync(join(builderDir, 'pr-only.ts'), 'pr\n');
		git(['add', '.'], builderDir);
		git(['commit', '-m', 'PR change'], builderDir);
		git(['push', 'origin', 'pr-branch'], builderDir);

		// master drifts forward, burying the merge base behind several commits
		git(['checkout', 'main'], builderDir);
		for (let i = 1; i <= 6; i++) {
			writeFileSync(join(builderDir, 'shared.ts'), `shared\ndrift ${i}\n`);
			git(['commit', '-am', `drift ${i}`], builderDir);
		}
		git(['push', 'origin', 'main'], builderDir);

		// Shallow checkout of the PR side, mirroring CI's depth-1 clone
		git(
			['clone', '--depth=1', '--branch', 'pr-branch', `file://${remoteDir}`, repoDir],
			originalCwd,
		);
		git(['config', 'user.email', 'test@test.local'], repoDir);
		git(['config', 'user.name', 'test'], repoDir);
		// Tiny step so the deepen loop has to iterate to reach the merge base
		process.env.CI_FILTER_DEEPEN_STEP = '1';
		process.chdir(repoDir);
	});

	after(() => {
		process.chdir(originalCwd);
		if (originalStep === undefined) delete process.env.CI_FILTER_DEEPEN_STEP;
		else process.env.CI_FILTER_DEEPEN_STEP = originalStep;
		rmSync(builderDir, { recursive: true, force: true });
		rmSync(remoteDir, { recursive: true, force: true });
		rmSync(repoDir, { recursive: true, force: true });
	});

	it('resolves PR-only files when the merge base is beyond the shallow boundary', () => {
		assert.equal(git(['rev-parse', '--is-shallow-repository'], repoDir), 'true');
		const changed = getChangedFiles('main');
		assert.deepEqual(changed, ['pr-only.ts']);
	});
});

// --- getChangedFiles deepen cap (falls back to --unshallow) ---

describe('getChangedFiles (deepen cap falls back to --unshallow)', () => {
	const builderDir = mkdtempSync(join(tmpdir(), 'ci-filter-build-cap-'));
	const remoteDir = mkdtempSync(join(tmpdir(), 'ci-filter-remote-cap-'));
	const repoDir = mkdtempSync(join(tmpdir(), 'ci-filter-cap-'));
	const originalCwd = process.cwd();
	const originalStep = process.env.CI_FILTER_DEEPEN_STEP;
	const originalMax = process.env.CI_FILTER_MAX_DEEPEN;
	const git = (args: string[], cwd: string) =>
		execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();

	before(() => {
		execFileSync('git', ['init', '--bare', '-b', 'main', remoteDir], { stdio: 'pipe' });
		git(['init', '-b', 'main'], builderDir);
		git(['config', 'user.email', 'test@test.local'], builderDir);
		git(['config', 'user.name', 'test'], builderDir);
		git(['remote', 'add', 'origin', remoteDir], builderDir);

		writeFileSync(join(builderDir, 'shared.ts'), 'shared\n');
		git(['add', '.'], builderDir);
		git(['commit', '-m', 'root'], builderDir);
		git(['push', 'origin', 'main'], builderDir);

		git(['checkout', '-b', 'pr-branch'], builderDir);
		writeFileSync(join(builderDir, 'pr-only.ts'), 'pr\n');
		git(['add', '.'], builderDir);
		git(['commit', '-m', 'PR change'], builderDir);
		git(['push', 'origin', 'pr-branch'], builderDir);

		git(['checkout', 'main'], builderDir);
		for (let i = 1; i <= 12; i++) {
			writeFileSync(join(builderDir, 'shared.ts'), `shared\ndrift ${i}\n`);
			git(['commit', '-am', `drift ${i}`], builderDir);
		}
		git(['push', 'origin', 'main'], builderDir);

		git(
			['clone', '--depth=1', '--branch', 'pr-branch', `file://${remoteDir}`, repoDir],
			originalCwd,
		);
		git(['config', 'user.email', 'test@test.local'], repoDir);
		git(['config', 'user.name', 'test'], repoDir);
		// Tiny step + tiny cap so the loop hits the cap and falls back to --unshallow
		// well before the merge base would otherwise be reachable by deepening.
		process.env.CI_FILTER_DEEPEN_STEP = '1';
		process.env.CI_FILTER_MAX_DEEPEN = '2';
		process.chdir(repoDir);
	});

	after(() => {
		process.chdir(originalCwd);
		if (originalStep === undefined) delete process.env.CI_FILTER_DEEPEN_STEP;
		else process.env.CI_FILTER_DEEPEN_STEP = originalStep;
		if (originalMax === undefined) delete process.env.CI_FILTER_MAX_DEEPEN;
		else process.env.CI_FILTER_MAX_DEEPEN = originalMax;
		rmSync(builderDir, { recursive: true, force: true });
		rmSync(remoteDir, { recursive: true, force: true });
		rmSync(repoDir, { recursive: true, force: true });
	});

	it('resolves merge base via --unshallow once the cap is exceeded', () => {
		assert.equal(git(['rev-parse', '--is-shallow-repository'], repoDir), 'true');
		const changed = getChangedFiles('main');
		assert.deepEqual(changed, ['pr-only.ts']);
		// After --unshallow, the repo should no longer be shallow.
		assert.equal(git(['rev-parse', '--is-shallow-repository'], repoDir), 'false');
	});
});

// --- getChangedFiles unrelated histories ---

describe('getChangedFiles (unrelated histories)', () => {
	const remoteDir = mkdtempSync(join(tmpdir(), 'ci-filter-remote-unrelated-'));
	const repoDir = mkdtempSync(join(tmpdir(), 'ci-filter-unrelated-'));
	const originalCwd = process.cwd();
	const git = (args: string[], cwd: string = repoDir) =>
		execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();

	before(() => {
		execFileSync('git', ['init', '--bare', '-b', 'main', remoteDir], { stdio: 'pipe' });
		git(['init', '-b', 'main'], repoDir);
		git(['config', 'user.email', 'test@test.local']);
		git(['config', 'user.name', 'test']);
		git(['remote', 'add', 'origin', remoteDir]);

		// Remote main has its own root
		writeFileSync(join(repoDir, 'main.ts'), 'main\n');
		git(['add', '.']);
		git(['commit', '-m', 'main root']);
		git(['push', 'origin', 'main']);

		// Local HEAD is an orphan branch sharing no ancestor with main
		git(['checkout', '--orphan', 'feature']);
		git(['rm', '-q', '-rf', '.']);
		writeFileSync(join(repoDir, 'feature.ts'), 'feature\n');
		git(['add', '.']);
		git(['commit', '-m', 'feature root']);

		process.chdir(repoDir);
	});

	after(() => {
		process.chdir(originalCwd);
		rmSync(remoteDir, { recursive: true, force: true });
		rmSync(repoDir, { recursive: true, force: true });
	});

	it('throws once history is exhausted with no common ancestor', () => {
		assert.throws(() => getChangedFiles('main'), /unrelated histories/);
	});
});

// --- runValidate ---

describe('runValidate', () => {
	function runWithResults(jobResults: Record<string, { result: string }>): number | null {
		const originalEnv = process.env.INPUT_JOB_RESULTS;
		const originalExit = process.exit;
		let exitCode: number | null = null;

		process.env.INPUT_JOB_RESULTS = JSON.stringify(jobResults);
		process.exit = ((code: number) => {
			exitCode = code;
		}) as never;

		try {
			runValidate();
		} finally {
			process.env.INPUT_JOB_RESULTS = originalEnv;
			process.exit = originalExit;
		}

		return exitCode;
	}

	it('passes when all jobs succeed', () => {
		assert.equal(
			runWithResults({
				'install-and-build': { result: 'success' },
				'unit-test': { result: 'success' },
				typecheck: { result: 'success' },
				lint: { result: 'success' },
			}),
			null,
		);
	});

	it('passes when some jobs are skipped (filtered out)', () => {
		assert.equal(
			runWithResults({
				'install-and-build': { result: 'success' },
				'unit-test': { result: 'success' },
				'security-checks': { result: 'skipped' },
			}),
			null,
		);
	});

	it('fails when a job fails', () => {
		assert.equal(
			runWithResults({
				'install-and-build': { result: 'success' },
				'unit-test': { result: 'failure' },
				typecheck: { result: 'success' },
			}),
			1,
		);
	});

	it('fails when a job is cancelled', () => {
		assert.equal(
			runWithResults({
				'install-and-build': { result: 'success' },
				'unit-test': { result: 'cancelled' },
			}),
			1,
		);
	});

	it('fails when multiple jobs have problems', () => {
		assert.equal(
			runWithResults({
				'unit-test': { result: 'failure' },
				typecheck: { result: 'cancelled' },
				lint: { result: 'success' },
			}),
			1,
		);
	});
});
