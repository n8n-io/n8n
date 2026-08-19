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

	it('flushes buffered files and directories to disk on finalize', async () => {
		const writer = new DirectoryPackageWriter(targetDir);

		writer.writeFile('manifest.json', '{"packageFormatVersion":"1"}');
		writer.writeDirectory('projects/alpha/workflows');
		writer.writeFile('projects/alpha/workflows/wf/workflow.json', '{"id":"wf"}');

		await writer.finalize();

		expect(await readFile(path.join(targetDir, 'manifest.json'), 'utf-8')).toBe(
			'{"packageFormatVersion":"1"}',
		);
		expect(
			await readFile(path.join(targetDir, 'projects/alpha/workflows/wf/workflow.json'), 'utf-8'),
		).toBe('{"id":"wf"}');
		expect((await stat(path.join(targetDir, 'projects/alpha/workflows'))).isDirectory()).toBe(true);
	});

	it('writes nothing to disk before finalize is called', async () => {
		const writer = new DirectoryPackageWriter(targetDir);
		writer.writeFile('manifest.json', '{}');

		await expect(stat(path.join(targetDir, 'manifest.json'))).rejects.toThrow();
	});

	it('nests every entry under the subfolder when provided', async () => {
		const writer = new DirectoryPackageWriter(targetDir, 'project-id-123');

		writer.writeFile('manifest.json', '{}');
		writer.writeFile('projects/alpha/project.json', '{}');

		await writer.finalize();

		expect(await readFile(path.join(targetDir, 'project-id-123/manifest.json'), 'utf-8')).toBe(
			'{}',
		);
		expect(
			await readFile(path.join(targetDir, 'project-id-123/projects/alpha/project.json'), 'utf-8'),
		).toBe('{}');
	});

	it('creates missing parent directories for a file entry', async () => {
		const writer = new DirectoryPackageWriter(targetDir);
		// No explicit writeDirectory for the parents.
		writer.writeFile('a/b/c/deep.json', '{"deep":true}');

		await writer.finalize();

		expect(await readFile(path.join(targetDir, 'a/b/c/deep.json'), 'utf-8')).toBe('{"deep":true}');
	});

	it('normalises leading "./" entry paths', async () => {
		const writer = new DirectoryPackageWriter(targetDir);
		writer.writeFile('./manifest.json', '{}');

		await writer.finalize();

		expect(await readFile(path.join(targetDir, 'manifest.json'), 'utf-8')).toBe('{}');
	});

	it('refuses to write outside the target directory', async () => {
		const writer = new DirectoryPackageWriter(targetDir);
		writer.writeFile('../escape.json', '{}');

		await expect(writer.finalize()).rejects.toThrow(/outside the target/);
	});
});
