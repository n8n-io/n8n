import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { DirectoryPackageWriter } from '../directory/directory-package-writer';

describe('DirectoryPackageWriter', () => {
	let targetDir: string;

	beforeEach(async () => {
		targetDir = await mkdtemp(path.join(tmpdir(), 'n8n-dir-writer-'));
	});

	afterEach(async () => {
		await rm(targetDir, { recursive: true, force: true });
	});

	it('writes files and directories directly to disk', async () => {
		const writer = new DirectoryPackageWriter(targetDir);

		await writer.writeFile('manifest.json', '{"packageFormatVersion":"1"}');
		await writer.writeDirectory('projects/alpha/workflows');
		await writer.writeFile('projects/alpha/workflows/wf/workflow.json', '{"id":"wf"}');

		expect(await readFile(path.join(targetDir, 'manifest.json'), 'utf-8')).toBe(
			'{"packageFormatVersion":"1"}',
		);
		expect(
			await readFile(path.join(targetDir, 'projects/alpha/workflows/wf/workflow.json'), 'utf-8'),
		).toBe('{"id":"wf"}');
		expect((await stat(path.join(targetDir, 'projects/alpha/workflows'))).isDirectory()).toBe(true);
	});

	it('writes files before finalize is called', async () => {
		const writer = new DirectoryPackageWriter(targetDir);
		await writer.writeFile('manifest.json', '{}');

		expect((await stat(path.join(targetDir, 'manifest.json'))).isFile()).toBe(true);
	});

	it('creates missing parent directories for a file entry', async () => {
		const writer = new DirectoryPackageWriter(targetDir);
		// No explicit writeDirectory for the parents.
		await writer.writeFile('a/b/c/deep.json', '{"deep":true}');

		expect(await readFile(path.join(targetDir, 'a/b/c/deep.json'), 'utf-8')).toBe('{"deep":true}');
	});

	it('normalises leading "./" entry paths', async () => {
		const writer = new DirectoryPackageWriter(targetDir);
		await writer.writeFile('./manifest.json', '{}');

		expect(await readFile(path.join(targetDir, 'manifest.json'), 'utf-8')).toBe('{}');
	});

	it('refuses to write outside the target directory', async () => {
		const writer = new DirectoryPackageWriter(targetDir);
		await expect(writer.writeFile('../escape.json', '{}')).rejects.toThrow(/outside the target/);
	});
});
