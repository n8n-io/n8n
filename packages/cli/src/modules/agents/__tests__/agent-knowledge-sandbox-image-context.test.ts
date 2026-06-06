jest.unmock('node:fs');
jest.unmock('node:fs/promises');

import { access, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	disposeKnowledgeRunnerImageContext,
	stageFilesForKnowledgeRunnerImage,
} from '../agent-knowledge-sandbox-image-context';

describe('agent knowledge sandbox image context', () => {
	let tempDirs: string[] = [];

	afterEach(async () => {
		await Promise.all(
			tempDirs.map(async (dir) => {
				await disposeKnowledgeRunnerImageContext(dir);
			}),
		);
		tempDirs = [];
	});

	it('writes a flat runner file under the staging directory', async () => {
		const { stagingDir } = await stageFilesForKnowledgeRunnerImage(
			new Map([['knowledge-csv-runner.cjs', 'runner']]),
		);
		tempDirs.push(stagingDir);

		await expect(readFile(join(stagingDir, 'knowledge-csv-runner.cjs'), 'utf8')).resolves.toBe(
			'runner',
		);
	});

	it('preserves nested relative paths under the staging directory', async () => {
		const { stagingDir } = await stageFilesForKnowledgeRunnerImage(
			new Map([['nested/file.txt', 'content']]),
		);
		tempDirs.push(stagingDir);

		await expect(readFile(join(stagingDir, 'nested/file.txt'), 'utf8')).resolves.toBe('content');
	});

	it('reuses a hash-keyed staging directory for the same cache key', async () => {
		const cacheKey = 'aaaaaaaaaaaaaaaa';
		const first = await stageFilesForKnowledgeRunnerImage(
			new Map([['knowledge-csv-runner.cjs', 'first']]),
			cacheKey,
		);
		const second = await stageFilesForKnowledgeRunnerImage(
			new Map([['knowledge-csv-runner.cjs', 'second']]),
			cacheKey,
		);
		tempDirs.push(first.stagingDir);

		expect(second.stagingDir).toBe(first.stagingDir);
		await expect(
			readFile(join(first.stagingDir, 'knowledge-csv-runner.cjs'), 'utf8'),
		).resolves.toBe('second');
	});

	it('creates a unique temp directory when no cache key is provided', async () => {
		const first = await stageFilesForKnowledgeRunnerImage(
			new Map([['knowledge-csv-runner.cjs', 'first']]),
		);
		const second = await stageFilesForKnowledgeRunnerImage(
			new Map([['knowledge-csv-runner.cjs', 'second']]),
		);
		tempDirs.push(first.stagingDir, second.stagingDir);

		expect(first.stagingDir).not.toBe(second.stagingDir);
		expect(first.stagingDir).toContain('n8n-knowledge-runner-context-temp-');
		expect(first.stagingDir.startsWith(tmpdir())).toBe(true);
	});

	it('removes the staging directory', async () => {
		const { stagingDir } = await stageFilesForKnowledgeRunnerImage(
			new Map([['knowledge-csv-runner.cjs', 'runner']]),
		);

		await disposeKnowledgeRunnerImageContext(stagingDir);

		await expect(access(stagingDir)).rejects.toThrow();
	});
});
