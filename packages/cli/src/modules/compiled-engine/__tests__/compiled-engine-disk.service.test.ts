import type { Logger } from '@n8n/backend-common';
import type { BinaryDataConfig } from 'n8n-core';
import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import { ArtifactCache, CompiledEngineDiskService } from '../compiled-engine-disk.service';
import type { CompiledEngineProcesses } from '../compiled-engine-processes';
import type { CompiledExecutionStore } from '../compiled-execution.store';

const HOUR_MS = 60 * 60 * 1000;

let root: string;

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), 'n8n-compiled-disk-'));
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

const processesWith = (dataDir: string): CompiledEngineProcesses =>
	({ dataDir }) as unknown as CompiledEngineProcesses;

function serviceWith(options: {
	dataDir: string;
	storage?: string;
	store?: CompiledExecutionStore;
}) {
	const store = options.store ?? mock<CompiledExecutionStore>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const binaryDataConfig = {
		mode: 'filesystem',
		localStoragePath: options.storage ?? join(options.dataDir, 'storage'),
	} as unknown as BinaryDataConfig;
	const service = new CompiledEngineDiskService(
		processesWith(options.dataDir),
		store,
		binaryDataConfig,
		logger,
	);
	return { service, store, logger };
}

const exists = async (path: string) => {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
};

const modeOf = async (path: string) => (await stat(path)).mode & 0o777;

const setAge = async (path: string, ageMs: number) => {
	const when = new Date(Date.now() - ageMs);
	await utimes(path, when, when);
};

describe('ArtifactCache', () => {
	it('removes the least recently used file when a write goes above the limit', async () => {
		const dir = join(root, 'artifacts');
		const cache = new ArtifactCache(dir, 8);

		await cache.write('a', 'aaaa');
		await cache.write('b', 'bbbb');
		await cache.write('c', 'cccc');

		expect(await cache.read('a')).toBeUndefined();
		expect(await cache.read('b')).toBe('bbbb');
		expect(await cache.read('c')).toBe('cccc');
		expect(await cache.bytes()).toBe(8);
	});

	it('touches the file of a hit, so the next removal takes another file', async () => {
		const dir = join(root, 'artifacts');
		const cache = new ArtifactCache(dir, 8);
		await cache.write('a', 'aaaa');
		await cache.write('b', 'bbbb');

		await cache.touch('a');
		await cache.write('c', 'cccc');

		expect(await exists(join(dir, 'a.json'))).toBe(true);
		expect(await exists(join(dir, 'b.json'))).toBe(false);
		expect(await exists(join(dir, 'c.json'))).toBe(true);
	});

	it('touches the file of a disk hit, so the next removal takes another file', async () => {
		const dir = join(root, 'artifacts');
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, 'a.json'), 'aaaa');
		await writeFile(join(dir, 'b.json'), 'bbbb');
		await setAge(join(dir, 'a.json'), 2000);
		await setAge(join(dir, 'b.json'), 1000);
		const cache = new ArtifactCache(dir, 8);

		expect(await cache.read('a')).toBe('aaaa');
		await cache.write('c', 'cccc');

		expect(await exists(join(dir, 'a.json'))).toBe(true);
		expect(await exists(join(dir, 'b.json'))).toBe(false);
	});

	it('reads files of an earlier process and removes them when they are above the limit', async () => {
		const dir = join(root, 'artifacts');
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, 'old.json'), 'aaaa');
		await writeFile(join(dir, 'new.json'), 'bbbb');
		await setAge(join(dir, 'old.json'), 2000);
		await setAge(join(dir, 'new.json'), 1000);

		const cache = new ArtifactCache(dir, 4);
		expect(await cache.bytes()).toBe(4);
		expect(await exists(join(dir, 'old.json'))).toBe(false);
		expect(await cache.read('new')).toBe('bbbb');
	});

	it('creates the folder 0700 and the files 0600', async () => {
		const dir = join(root, 'artifacts');
		const cache = new ArtifactCache(dir, 1024);
		await cache.write('key', '{}');

		expect(await modeOf(dir)).toBe(0o700);
		expect(await modeOf(join(dir, 'key.json'))).toBe(0o600);
	});

	it('keeps no files when the limit is 0', async () => {
		const dir = join(root, 'artifacts');
		const cache = new ArtifactCache(dir, 0);
		await cache.write('key', '{}');

		expect(await exists(join(dir, 'key.json'))).toBe(false);
		expect(await cache.bytes()).toBe(0);
	});
});

/** Makes an old `wfrt-<id>` folder of the binary store. */
async function runtimeFolder(storage: string, wfrtId: string, workflowId = 'wf1') {
	const path = join(storage, 'workflows', workflowId, 'executions', `wfrt-${wfrtId}`);
	await mkdir(join(path, 'binary_data'), { recursive: true });
	await writeFile(join(path, 'binary_data', 'f1'), 'data');
	return path;
}

describe('CompiledEngineDiskService.sweep', () => {
	it('removes old runtime folders that have no execution, and keeps every other folder', async () => {
		const dataDir = join(root, 'data');
		const storage = join(root, 'storage');
		const stored = await runtimeFolder(storage, '1');
		const orphan = await runtimeFolder(storage, '2');
		const fresh = await runtimeFolder(storage, '3');
		const saved = join(storage, 'workflows', 'wf1', 'executions', '55');
		await mkdir(saved, { recursive: true });
		const store = mock<CompiledExecutionStore>();
		store.findExecutionId.mockImplementation(async (wfrtId: string) =>
			wfrtId === '1' ? '1' : undefined,
		);
		const { service } = serviceWith({ dataDir, storage, store });

		await setAge(stored, 2 * HOUR_MS);
		await setAge(orphan, 2 * HOUR_MS);
		await setAge(saved, 2 * HOUR_MS);
		const result = await service.sweep();

		expect(result.removed).toBe(1);
		expect(await exists(orphan)).toBe(false);
		expect(await exists(stored)).toBe(true);
		expect(await exists(fresh)).toBe(true);
		expect(await exists(saved)).toBe(true);
		// A kept runtime folder is closed to other users.
		expect(await modeOf(stored)).toBe(0o700);
		expect(await modeOf(join(stored, 'binary_data'))).toBe(0o700);
		expect(store.findExecutionId).toHaveBeenCalledWith('1');
		expect(store.findExecutionId).toHaveBeenCalledWith('2');
		expect(store.findExecutionId).not.toHaveBeenCalledWith('3');
	});

	it('takes no more than the given number of entries of a sweep', async () => {
		const dataDir = join(root, 'data');
		const storage = join(root, 'storage');
		const folders = [];
		for (const id of ['1', '2', '3']) {
			const folder = await runtimeFolder(storage, id);
			await setAge(folder, 2 * HOUR_MS);
			folders.push(folder);
		}
		const store = mock<CompiledExecutionStore>();
		store.findExecutionId.mockResolvedValue(undefined);
		const { service } = serviceWith({ dataDir, storage, store });

		const result = await service.sweep({ maxEntries: 2 });

		expect(result).toEqual({ removed: 2, scanned: 2 });
		const left = await Promise.all(folders.map(exists));
		expect(left.filter(Boolean)).toHaveLength(1);
	});

	it('skips the store when n8n does not store binary data on disk', async () => {
		const dataDir = join(root, 'data');
		const storage = join(root, 'storage');
		await runtimeFolder(storage, '1');
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const binaryDataConfig = {
			mode: 's3',
			localStoragePath: storage,
		} as unknown as BinaryDataConfig;
		const store = mock<CompiledExecutionStore>();
		const service = new CompiledEngineDiskService(
			processesWith(dataDir),
			store,
			binaryDataConfig,
			logger,
		);

		expect(await service.sweep()).toEqual({ removed: 0, scanned: 0 });
		expect(store.findExecutionId).not.toHaveBeenCalled();
	});
});

describe('CompiledEngineDiskService', () => {
	it('creates the folders of the module 0700', async () => {
		const dataDir = join(root, 'data');
		const { service } = serviceWith({ dataDir });

		await service.start();
		service.stop();

		expect(await modeOf(dataDir)).toBe(0o700);
		expect(await modeOf(join(dataDir, 'artifacts'))).toBe(0o700);
		expect(await modeOf(join(dataDir, 'log'))).toBe(0o700);
	});

	it('reports the bytes of the artifact cache, the binary store and the log', async () => {
		const dataDir = join(root, 'data');
		const storage = join(root, 'storage');
		await mkdir(join(dataDir, 'artifacts'), { recursive: true });
		await writeFile(join(dataDir, 'artifacts', 'a.json'), 'abcde');
		await mkdir(join(dataDir, 'log'), { recursive: true });
		await writeFile(join(dataDir, 'log', 'wfrt.log'), 'abc');
		await runtimeFolder(storage, '1');
		const { service, logger } = serviceWith({ dataDir, storage });

		const usage = await service.report();

		expect(usage.artifactBytes).toBe(5);
		expect(usage.logBytes).toBe(3);
		expect(usage.binaryDataBytes).toBe(4);
		expect(usage.freeRatio).toBeGreaterThan(0);
		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining('Compiled engine disk use'),
			expect.objectContaining({ artifactBytes: 5, binaryDataBytes: 4, logBytes: 3 }),
		);
	});
});
