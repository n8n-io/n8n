import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { gradeFileExists, gradeFileMatches, gradeFileNotExists } from '../graders/fs';

describe('fs.fileExists', () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'cu-eval-fs-'));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('passes when a matching file is at the root', async () => {
		await writeFile(join(dir, 'README.md'), '# hello');
		const result = await gradeFileExists(dir, { type: 'fs.fileExists', glob: '*.md' });
		expect(result.pass).toBe(true);
	});

	it('matches recursively with **', async () => {
		await mkdir(join(dir, 'docs'), { recursive: true });
		await writeFile(join(dir, 'docs', 'workflow.md'), '...');
		const result = await gradeFileExists(dir, { type: 'fs.fileExists', glob: '**/*.md' });
		expect(result.pass).toBe(true);
	});

	it('fails when nothing matches', async () => {
		await writeFile(join(dir, 'readme.txt'), '...');
		const result = await gradeFileExists(dir, { type: 'fs.fileExists', glob: '*.md' });
		expect(result.pass).toBe(false);
	});

	it('rejects matches that escape the sandbox via symlink', async () => {
		const outside = await mkdtemp(join(tmpdir(), 'cu-eval-fs-outside-'));
		try {
			await writeFile(join(outside, 'secret.md'), 'should not be readable');
			await symlink(join(outside, 'secret.md'), join(dir, 'leaked.md'));
			const result = await gradeFileExists(dir, { type: 'fs.fileExists', glob: '*.md' });
			expect(result.pass).toBe(false);
		} finally {
			await rm(outside, { recursive: true, force: true });
		}
	});

	it('rejects glob patterns that try to escape via ..', async () => {
		const parent = await mkdtemp(join(tmpdir(), 'cu-eval-fs-parent-'));
		try {
			const inner = join(parent, 'inner');
			await mkdir(inner);
			await writeFile(join(parent, 'sibling.md'), '# sibling');
			const result = await gradeFileExists(inner, {
				type: 'fs.fileExists',
				glob: '../*.md',
			});
			expect(result.pass).toBe(false);
		} finally {
			await rm(parent, { recursive: true, force: true });
		}
	});
});

describe('fs.fileNotExists', () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'cu-eval-fs-'));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('passes when no file matches the glob', async () => {
		const result = await gradeFileNotExists(dir, { type: 'fs.fileNotExists', glob: '*.md' });
		expect(result.pass).toBe(true);
	});

	it('fails when a file at the root matches the glob', async () => {
		await writeFile(join(dir, 'leftover.md'), '# still here');
		const result = await gradeFileNotExists(dir, {
			type: 'fs.fileNotExists',
			glob: 'leftover.md',
		});
		expect(result.pass).toBe(false);
	});

	it('passes when the file has been moved into a subfolder (so the root glob no longer matches)', async () => {
		await mkdir(join(dir, 'project'), { recursive: true });
		await writeFile(join(dir, 'project', 'briefing.md'), '# moved');
		const result = await gradeFileNotExists(dir, {
			type: 'fs.fileNotExists',
			glob: 'briefing.md',
		});
		expect(result.pass).toBe(true);
	});
});

describe('fs.fileMatches', () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'cu-eval-fs-'));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('passes when a candidate file satisfies anyOf', async () => {
		await writeFile(join(dir, 'doc.md'), '# Architecture\n\nThis describes the workflow.');
		const result = await gradeFileMatches(dir, {
			type: 'fs.fileMatches',
			glob: '*.md',
			anyOf: ['architecture'],
		});
		expect(result.pass).toBe(true);
	});

	it('fails when no candidate file matches', async () => {
		await writeFile(join(dir, 'doc.md'), 'random unrelated content');
		const result = await gradeFileMatches(dir, {
			type: 'fs.fileMatches',
			glob: '*.md',
			anyOf: ['architecture'],
		});
		expect(result.pass).toBe(false);
	});

	it('respects allOf', async () => {
		await writeFile(join(dir, 'doc.md'), '# Architecture only');
		const result = await gradeFileMatches(dir, {
			type: 'fs.fileMatches',
			glob: '*.md',
			anyOf: ['Architecture'],
			allOf: ['Architecture', 'Setup'],
		});
		expect(result.pass).toBe(false);
	});
});
