import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createFilesystem, createSandbox } from '../create-workspace';
import { LocalSandbox } from '../local-sandbox';

describe('LocalSandbox', () => {
	let baseDir: string;

	beforeEach(async () => {
		baseDir = await mkdtemp(join(tmpdir(), 'local-sandbox-test-'));
	});

	afterEach(async () => {
		await rm(baseDir, { recursive: true, force: true });
	});

	it('runs commands in the working directory', async () => {
		const sandbox = new LocalSandbox({ workingDirectory: baseDir });
		await writeFile(join(baseDir, 'hello.txt'), 'hi');

		const result = await sandbox.executeCommand('cat', ['hello.txt']);

		expect(result.success).toBe(true);
		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe('hi');
	});

	it('reports a non-zero exit code without throwing', async () => {
		const sandbox = new LocalSandbox({ workingDirectory: baseDir });

		const result = await sandbox.executeCommand('cat', ['does-not-exist']);

		expect(result.success).toBe(false);
		expect(result.exitCode).not.toBe(0);
	});

	it('removes only a self-created working directory on destroy', async () => {
		const owned = new LocalSandbox();
		await owned.start();
		const fs = createFilesystem(owned);
		await fs.writeFile('marker.txt', 'x');
		expect(await fs.exists('marker.txt')).toBe(true);

		await owned.destroy();
		expect(await fs.exists('marker.txt')).toBe(false);
	});
});

describe('local provider via create-workspace', () => {
	it('builds a LocalSandbox and a paired filesystem rooted at its working dir', async () => {
		const sandbox = await createSandbox({ enabled: true, provider: 'local' });
		expect(sandbox).toBeInstanceOf(LocalSandbox);

		const fs = createFilesystem(sandbox!);
		expect(fs.provider).toBe('local');
		expect(fs.basePath).toBe((sandbox as LocalSandbox).getWorkingDirectory());

		await sandbox!.destroy?.();
	});

	it('round-trips files through the filesystem adapter', async () => {
		const base = await mkdtemp(join(tmpdir(), 'local-fs-test-'));
		try {
			const sandbox = await createSandbox({
				enabled: true,
				provider: 'local',
				workspaceRoot: base,
			});
			const fs = createFilesystem(sandbox!);

			await fs.writeFile('nested/file.txt', 'content', { recursive: true });
			expect(await fs.readFile('nested/file.txt', { encoding: 'utf-8' })).toBe('content');
			expect(await fs.exists('nested/file.txt')).toBe(true);

			const entries = await fs.readdir('nested');
			expect(entries).toContainEqual({ name: 'file.txt', type: 'file' });

			await fs.deleteFile('nested/file.txt');
			expect(await fs.exists('nested/file.txt')).toBe(false);
		} finally {
			await rm(base, { recursive: true, force: true });
		}
	});
});
