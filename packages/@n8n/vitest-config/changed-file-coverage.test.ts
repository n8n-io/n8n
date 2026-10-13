import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
	changedCoverageIncludes,
	changedFileCoverage,
	findWorkspaceRoot,
	readChangedFiles,
} from './changed-file-coverage.js';

const packageDir = import.meta.dirname;
const rootDir = join(packageDir, '../../..');
const pkg = 'packages/@n8n/vitest-config';

describe('readChangedFiles', () => {
	it('splits newline- and comma-separated lists', () => {
		expect(readChangedFiles('a.ts\nb.ts, c.ts\n')).toEqual(['a.ts', 'b.ts', 'c.ts']);
	});

	it('treats an unset or empty value as no signal', () => {
		expect(readChangedFiles(undefined)).toBeNull();
		expect(readChangedFiles(' \n ')).toBeNull();
	});
});

describe('findWorkspaceRoot', () => {
	it('finds the directory that contains pnpm-workspace.yaml', () => {
		expect(findWorkspaceRoot(packageDir)).toBe(rootDir);
	});
});

describe('changedCoverageIncludes', () => {
	it('keeps only coverable source files of the package, relative to it', () => {
		expect(
			changedCoverageIncludes(
				[
					`${pkg}/src/a.ts`,
					`${pkg}/src/b.vue`,
					`${pkg}/src/a.test.ts`,
					`${pkg}/src/__mocks__/m.ts`,
					`${pkg}/src/types.d.ts`,
					`${pkg}/vite.config.ts`,
					`${pkg}/vitest.workspace.ts`,
					`${pkg}/README.md`,
					'packages/other/src/x.ts',
				],
				packageDir,
				rootDir,
			),
		).toEqual(['src/a.ts', 'src/b.vue']);
	});

	it('escapes glob characters so each include matches only its file', () => {
		expect(changedCoverageIncludes([`${pkg}/src/[id]/(g).ts`], packageDir, rootDir)).toEqual([
			'src/\\[id\\]/\\(g\\).ts',
		]);
	});
});

describe('changedFileCoverage', () => {
	const scoped = { COVERAGE_SCOPE: 'changed-files', CHANGED_FILES: `${pkg}/src/a.ts` };

	it('measures only the changed files when the scope is changed-files', () => {
		expect(changedFileCoverage(packageDir, scoped)).toEqual({
			enabled: true,
			provider: 'istanbul',
			include: ['src/a.ts'],
		});
	});

	it('turns coverage off when the package has no changed source files', () => {
		expect(
			changedFileCoverage(packageDir, { ...scoped, CHANGED_FILES: 'packages/other/src/x.ts' }),
		).toEqual({ enabled: false });
	});

	it('keeps the full config without the changed-files scope', () => {
		expect(changedFileCoverage(packageDir, { ...scoped, COVERAGE_SCOPE: 'all' })).toBeUndefined();
		expect(
			changedFileCoverage(packageDir, { CHANGED_FILES: scoped.CHANGED_FILES }),
		).toBeUndefined();
	});

	it('keeps the full config when there is no change signal', () => {
		expect(changedFileCoverage(packageDir, { ...scoped, CHANGED_FILES: '' })).toBeUndefined();
	});
});
