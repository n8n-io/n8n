import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { gradeFileExists, gradeFileMatches } from '../graders/fs';

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
