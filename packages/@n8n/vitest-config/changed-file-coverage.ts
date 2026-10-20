/**
 * Change-scoped coverage. On PR runs, patch coverage needs only the changed
 * lines, so measure only the changed source files of the package under test.
 * Istanbul instruments only the included files, so the rest of the code runs
 * at full speed. V8 coverage slows down all the code that runs.
 *
 * This is the only place that decides which files count as coverable source.
 * The janitor `test-scoped` runner and the shared vitest configs both use it.
 */
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const COVERABLE_SOURCE = /\.(?:[cm]?[jt]sx?|vue)$/;
// `coverageExcludes` never counts towards coverage. Runner config and setup files
// (vite.config.ts, vitest.workspace.ts, ...) are outside the default `src/**` include.
const NON_COVERABLE = [
	/\.(?:test|spec)\.[cm]?[jt]sx?$/,
	/(?:^|\/)__(?:tests|mocks)__\//,
	/\.d\.ts$/,
	/(?:^|\/)(?:vite\.|vitest[.-])[^/]*$/,
];
const GLOB_SPECIAL = /[*?[\]{}()!+@]/g;

const toPosix = (p: string) => (sep === '/' ? p : p.split(sep).join('/'));

/**
 * Read CHANGED_FILES (newline- or comma-separated, repo-root-relative).
 * Returns null when it is unset or empty: that is "no signal", not "nothing
 * changed". ci-filter emits an empty value for very large change sets.
 */
export function readChangedFiles(value: string | undefined): string[] | null {
	if (value === undefined) return null;
	const files = value
		.split(/[\n,]+/)
		.map((f) => f.trim())
		.filter((f) => f.length > 0);
	return files.length > 0 ? files : null;
}

/** Walk up from `startDir` to the directory that contains pnpm-workspace.yaml. */
export function findWorkspaceRoot(startDir: string): string | undefined {
	let dir = resolve(startDir);
	while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
		const parent = dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
	return dir;
}

/**
 * The changed source files of one package, relative to the package, escaped
 * for use as vitest `coverage.include` globs. Each glob matches only its file.
 */
export function changedCoverageIncludes(
	changedFiles: string[],
	packageDir: string,
	rootDir: string,
): string[] {
	const absolutePackageDir = isAbsolute(packageDir) ? packageDir : resolve(rootDir, packageDir);
	return changedFiles
		.map((f) => toPosix(relative(absolutePackageDir, resolve(rootDir, f))))
		.filter((f) => !f.startsWith('../') && !isAbsolute(f))
		.filter((f) => COVERABLE_SOURCE.test(f) && !NON_COVERABLE.some((p) => p.test(f)))
		.map((f) => f.replace(GLOB_SPECIAL, '\\$&'));
}

export type ChangedFileCoverage =
	| { enabled: false }
	| { enabled: true; provider: 'istanbul'; include: string[] };

/**
 * Coverage options for a PR run. Applies only when `COVERAGE_SCOPE` is
 * `changed-files` and CHANGED_FILES has a signal. Otherwise it returns
 * undefined, and the caller keeps its full coverage config (master, nightly,
 * local runs). Turns coverage off when the package has no changed source
 * files, e.g. a full run caused only by an upstream change.
 *
 * `COVERAGE_SCOPE` is part of the turbo cache key of the cacheable test tasks,
 * so a scoped result never replays in a run that expects full coverage.
 */
export function changedFileCoverage(
	packageDir = process.cwd(),
	env: NodeJS.ProcessEnv = process.env,
): ChangedFileCoverage | undefined {
	if (env.COVERAGE_SCOPE !== 'changed-files') return undefined;
	const changedFiles = readChangedFiles(env.CHANGED_FILES);
	if (changedFiles === null) return undefined;
	const rootDir = findWorkspaceRoot(packageDir);
	if (rootDir === undefined) return undefined;
	const include = changedCoverageIncludes(changedFiles, packageDir, rootDir);
	if (include.length === 0) return { enabled: false };
	return { enabled: true, provider: 'istanbul', include };
}
