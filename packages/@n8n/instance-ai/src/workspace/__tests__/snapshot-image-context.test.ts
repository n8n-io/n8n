import { access, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	disposeSnapshotImageContext,
	stageWorkspaceFilesForImage,
} from '../snapshot-image-context';

const WORKSPACE_ROOT = '/home/daytona/workspace';

describe('snapshot-image-context', () => {
	let tempDirs: string[] = [];

	afterEach(async () => {
		await Promise.all(
			tempDirs.map(async (dir) => {
				await rm(dir, { recursive: true, force: true });
			}),
		);
		tempDirs = [];
	});

	it('writes nested workspace files under the staging directory', async () => {
		const files = new Map([
			[`${WORKSPACE_ROOT}/skills/demo/SKILL.md`, '# Demo'],
			[`${WORKSPACE_ROOT}/knowledge-base/best-practices/scheduling.md`, '# Schedule'],
		]);

		const { stagingDir } = await stageWorkspaceFilesForImage(files, WORKSPACE_ROOT);
		tempDirs.push(stagingDir);

		await expect(readFile(join(stagingDir, 'skills/demo/SKILL.md'), 'utf-8')).resolves.toBe(
			'# Demo',
		);
		await expect(
			readFile(join(stagingDir, 'knowledge-base/best-practices/scheduling.md'), 'utf-8'),
		).resolves.toBe('# Schedule');
	});

	it('reuses a hash-keyed staging directory for the same cache key', async () => {
		const filesA = new Map([[`${WORKSPACE_ROOT}/package.json`, '{"name":"a"}']]);
		const filesB = new Map([[`${WORKSPACE_ROOT}/package.json`, '{"name":"b"}']]);
		const cacheKey = 'aaaaaaaaaaaa-bbbbbbbbbbbb';

		const first = await stageWorkspaceFilesForImage(filesA, WORKSPACE_ROOT, cacheKey);
		const second = await stageWorkspaceFilesForImage(filesB, WORKSPACE_ROOT, cacheKey);
		tempDirs.push(first.stagingDir);

		expect(second.stagingDir).toBe(first.stagingDir);
		await expect(readFile(join(first.stagingDir, 'package.json'), 'utf-8')).resolves.toBe(
			'{"name":"b"}',
		);
	});

	it('removes stale files when reusing a cache-keyed staging directory', async () => {
		const cacheKey = 'cccccccccccc-dddddddddddd';
		const filesWithExtra = new Map([
			[`${WORKSPACE_ROOT}/package.json`, '{"name":"a"}'],
			[`${WORKSPACE_ROOT}/skills/removed/SKILL.md`, '# Removed'],
		]);
		const filesWithoutExtra = new Map([[`${WORKSPACE_ROOT}/package.json`, '{"name":"b"}']]);

		const first = await stageWorkspaceFilesForImage(filesWithExtra, WORKSPACE_ROOT, cacheKey);
		const second = await stageWorkspaceFilesForImage(filesWithoutExtra, WORKSPACE_ROOT, cacheKey);
		tempDirs.push(first.stagingDir);

		expect(second.stagingDir).toBe(first.stagingDir);
		await expect(access(join(first.stagingDir, 'skills/removed/SKILL.md'))).rejects.toThrow();
	});

	it('disposeSnapshotImageContext removes the staging directory', async () => {
		const files = new Map([[`${WORKSPACE_ROOT}/build.mjs`, 'export {};']]);
		const { stagingDir } = await stageWorkspaceFilesForImage(files, WORKSPACE_ROOT);
		await disposeSnapshotImageContext(stagingDir);

		await expect(access(stagingDir)).rejects.toThrow();
	});

	it('throws when a file path is outside the workspace root', async () => {
		const files = new Map([['/tmp/outside.txt', 'nope']]);

		await expect(stageWorkspaceFilesForImage(files, WORKSPACE_ROOT)).rejects.toThrow(
			'is not under workspace root',
		);
	});

	it('creates a unique temp directory when no cache key is provided', async () => {
		const files = new Map([[`${WORKSPACE_ROOT}/tsconfig.json`, '{}']]);

		const first = await stageWorkspaceFilesForImage(files, WORKSPACE_ROOT);
		const second = await stageWorkspaceFilesForImage(files, WORKSPACE_ROOT);
		tempDirs.push(first.stagingDir, second.stagingDir);

		expect(first.stagingDir).not.toBe(second.stagingDir);
		expect(first.stagingDir).toContain('n8n-snapshot-context-temp-');
		expect(first.stagingDir.startsWith(tmpdir())).toBe(true);
	});
});
