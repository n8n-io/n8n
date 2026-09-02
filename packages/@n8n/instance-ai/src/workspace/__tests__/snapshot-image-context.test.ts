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

	it('stages once per cache key and reuses the directory read-only', async () => {
		// Same key ⇒ same content in prod, so the repeat reuses the first staging (filesB ignored).
		const filesA = new Map([[`${WORKSPACE_ROOT}/package.json`, '{"name":"a"}']]);
		const filesB = new Map([[`${WORKSPACE_ROOT}/package.json`, '{"name":"b"}']]);
		const cacheKey = 'aaaaaaaaaaaa-bbbbbbbbbbbb';

		const first = await stageWorkspaceFilesForImage(filesA, WORKSPACE_ROOT, cacheKey);
		const second = await stageWorkspaceFilesForImage(filesB, WORKSPACE_ROOT, cacheKey);
		tempDirs.push(first.stagingDir);

		expect(second.stagingDir).toBe(first.stagingDir);
		await expect(readFile(join(first.stagingDir, 'package.json'), 'utf-8')).resolves.toBe(
			'{"name":"a"}',
		);
	});

	it('serves concurrent stagings for the same cache key from a single directory', async () => {
		const cacheKey = 'cccccccccccc-dddddddddddd';
		const files = new Map([
			[`${WORKSPACE_ROOT}/package.json`, '{"name":"concurrent"}'],
			[`${WORKSPACE_ROOT}/skills/post-build-flow/SKILL.md`, '# Post build'],
			[`${WORKSPACE_ROOT}/knowledge-base/templates/example.ts`, 'export const x = 1;'],
		]);

		const results = await Promise.all(
			Array.from(
				{ length: 8 },
				async () => await stageWorkspaceFilesForImage(files, WORKSPACE_ROOT, cacheKey),
			),
		);
		tempDirs.push(results[0].stagingDir);

		// All callers share one directory and every file is intact — no rm clobbered a write.
		for (const result of results) {
			expect(result.stagingDir).toBe(results[0].stagingDir);
		}
		await expect(
			readFile(join(results[0].stagingDir, 'skills/post-build-flow/SKILL.md'), 'utf-8'),
		).resolves.toBe('# Post build');
		await expect(
			readFile(join(results[0].stagingDir, 'knowledge-base/templates/example.ts'), 'utf-8'),
		).resolves.toBe('export const x = 1;');
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
