import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalFilesystem } from '../local-filesystem';

describe('LocalFilesystem', () => {
	let basePath: string;
	let outsidePath: string;

	beforeEach(async () => {
		basePath = await mkdtemp(join(tmpdir(), 'n8n-local-fs-'));
		outsidePath = await mkdtemp(join(tmpdir(), 'n8n-local-fs-outside-'));
	});

	afterEach(async () => {
		await rm(basePath, { force: true, recursive: true });
		await rm(outsidePath, { force: true, recursive: true });
	});

	it('rejects reads through a symlink that points outside the workspace', async () => {
		const target = join(outsidePath, 'secret.txt');
		await writeFile(target, 'secret');
		await symlink(target, join(basePath, 'link.txt'));

		const filesystem = new LocalFilesystem({ basePath });

		await expect(filesystem.readFile('link.txt', { encoding: 'utf-8' })).rejects.toThrow(
			/escapes local workspace root/,
		);
	});

	it('rejects writes through an existing symlink that points outside the workspace', async () => {
		const target = join(outsidePath, 'secret.txt');
		await writeFile(target, 'secret');
		await symlink(target, join(basePath, 'link.txt'));

		const filesystem = new LocalFilesystem({ basePath });

		await expect(filesystem.writeFile('link.txt', 'changed')).rejects.toThrow(
			/escapes local workspace root/,
		);
		await expect(readFile(target, 'utf-8')).resolves.toBe('secret');
	});

	it('rejects recursive writes through a symlinked parent directory outside the workspace', async () => {
		await symlink(outsidePath, join(basePath, 'outside'));

		const filesystem = new LocalFilesystem({ basePath });

		await expect(
			filesystem.writeFile('outside/new.txt', 'changed', { recursive: true }),
		).rejects.toThrow(/escapes local workspace root/);
	});

	it('rejects recursive directory traversal through a symlink outside the workspace', async () => {
		await mkdir(join(outsidePath, 'nested'), { recursive: true });
		await writeFile(join(outsidePath, 'nested', 'secret.txt'), 'secret');
		await symlink(outsidePath, join(basePath, 'outside'));

		const filesystem = new LocalFilesystem({ basePath });

		await expect(filesystem.readdir('.', { recursive: true })).rejects.toThrow(
			/escapes local workspace root/,
		);
	});
});
