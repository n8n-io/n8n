import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { DirectoryPackageReader } from '../directory/directory-package-reader';

const limits = {
	maxUncompressedBytes: 1024 * 1024,
	maxEntryBytes: 1024,
	maxEntries: 100,
	maxPathLength: 1024,
};

describe('DirectoryPackageReader', () => {
	let baseDir: string;

	beforeEach(async () => {
		baseDir = await mkdtemp(path.join(tmpdir(), 'n8n-dir-reader-'));
	});

	afterEach(async () => {
		await rm(baseDir, { recursive: true, force: true });
	});

	const reader = () => new DirectoryPackageReader(baseDir, limits);

	it('reads and parses the manifest', async () => {
		await writeFile(path.join(baseDir, 'manifest.json'), '{"packageFormatVersion":"1"}');

		expect(await reader().readManifest()).toEqual({ packageFormatVersion: '1' });
	});

	it('throws a clear error when the manifest is missing', async () => {
		await expect(reader().readManifest()).rejects.toThrow('Package is missing manifest.json');
	});

	it('throws when the manifest is not valid JSON', async () => {
		await writeFile(path.join(baseDir, 'manifest.json'), 'not-json');

		await expect(reader().readManifest()).rejects.toThrow('Package manifest is not valid JSON');
	});

	it('reads a nested file by its posix-relative path', async () => {
		await mkdir(path.join(baseDir, 'projects', 'alpha'), { recursive: true });
		await writeFile(path.join(baseDir, 'projects', 'alpha', 'project.json'), '{"id":"alpha"}');

		const content = await reader().readFile('projects/alpha/project.json');

		expect(content.toString('utf-8')).toBe('{"id":"alpha"}');
	});

	it('throws when a requested entry does not exist', async () => {
		await expect(reader().readFile('projects/missing/project.json')).rejects.toThrow(
			'Package does not contain entry: projects/missing/project.json',
		);
	});

	it('rejects a path that escapes the package root', async () => {
		await expect(reader().readFile('../secrets.json')).rejects.toThrow(BadRequestError);
	});

	it('rejects a path with disallowed characters', async () => {
		await expect(reader().readFile('projects/al pha/project.json')).rejects.toThrow(
			'contains disallowed characters',
		);
	});

	it('rejects a single file that exceeds the per-entry size limit', async () => {
		await writeFile(path.join(baseDir, 'big.json'), Buffer.alloc(limits.maxEntryBytes + 1, 0x61));

		await expect(reader().readFile('big.json')).rejects.toThrow(
			'exceeds the maximum allowed uncompressed size per entry',
		);
	});

	it.skipIf(process.platform === 'win32')('rejects a symbolic-link file entry', async () => {
		await writeFile(path.join(baseDir, 'target.json'), '{}');
		await symlink('target.json', path.join(baseDir, 'linked.json'));

		await expect(reader().readFile('linked.json')).rejects.toThrow('disallowed entry type');
	});

	it.skipIf(process.platform === 'win32')(
		'rejects an entry below a symbolic-link directory',
		async () => {
			await mkdir(path.join(baseDir, 'targets', 'alpha'), { recursive: true });
			await writeFile(path.join(baseDir, 'targets', 'alpha', 'project.json'), '{}');
			await mkdir(path.join(baseDir, 'projects'));
			await symlink(
				path.join(baseDir, 'targets', 'alpha'),
				path.join(baseDir, 'projects', 'alpha'),
			);

			await expect(reader().readFile('projects/alpha/project.json')).rejects.toThrow(
				'disallowed entry type',
			);
		},
	);

	it('lists every regular file as a posix-relative path', async () => {
		await mkdir(path.join(baseDir, 'projects', 'alpha'), { recursive: true });
		await writeFile(path.join(baseDir, 'manifest.json'), '{}');
		await writeFile(path.join(baseDir, 'projects', 'alpha', 'project.json'), '{}');

		expect((await reader().listEntries()).sort()).toEqual(
			['manifest.json', 'projects/alpha/project.json'].sort(),
		);
	});

	it('fails when the tree has more entries than allowed', async () => {
		const tight = new DirectoryPackageReader(baseDir, { ...limits, maxEntries: 1 });
		await writeFile(path.join(baseDir, 'a.json'), '{}');
		await writeFile(path.join(baseDir, 'b.json'), '{}');

		await expect(tight.listEntries()).rejects.toThrow('too many entries');
	});

	it.skipIf(process.platform === 'win32')(
		'rejects symbolic links during whole-tree validation',
		async () => {
			await writeFile(path.join(baseDir, 'target.json'), '{}');
			await symlink('target.json', path.join(baseDir, 'linked.json'));

			await expect(reader().listEntries()).rejects.toThrow('disallowed entry type');
		},
	);

	it.skipIf(process.platform === 'win32')('rejects a symbolic-link package root', async () => {
		const actualBaseDir = path.join(baseDir, 'actual');
		const linkedBaseDir = path.join(baseDir, 'linked');
		await mkdir(actualBaseDir);
		await symlink(actualBaseDir, linkedBaseDir);

		const linkedReader = new DirectoryPackageReader(linkedBaseDir, limits);

		await expect(linkedReader.listEntries()).rejects.toThrow('disallowed entry type');
	});

	it('fails when a single entry exceeds the per-entry size limit', async () => {
		await writeFile(path.join(baseDir, 'big.json'), Buffer.alloc(limits.maxEntryBytes + 1, 0x61));

		await expect(reader().listEntries()).rejects.toThrow(
			'exceeds the maximum allowed uncompressed size per entry',
		);
	});

	it('fails when the tree exceeds the total uncompressed size limit', async () => {
		const tight = new DirectoryPackageReader(baseDir, { ...limits, maxUncompressedBytes: 1024 });
		await writeFile(path.join(baseDir, 'a.json'), Buffer.alloc(600, 0x61));
		await writeFile(path.join(baseDir, 'b.json'), Buffer.alloc(600, 0x61));

		await expect(tight.listEntries()).rejects.toThrow(
			'exceeds the maximum allowed uncompressed size',
		);
	});
});
