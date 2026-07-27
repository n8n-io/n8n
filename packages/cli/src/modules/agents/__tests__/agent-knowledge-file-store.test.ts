import type { Logger } from '@n8n/backend-common';
import { FsByteStore } from '@n8n/blob-storage';
import type { BinaryDataRepository } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';
import type { StorageConfig } from 'n8n-core';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { AgentKnowledgeFileStore } from '../agent-knowledge-file-store';

vi.unmock('node:fs');
vi.unmock('node:fs/promises');

describe('AgentKnowledgeFileStore', () => {
	let storagePath: string;
	let storageConfig: StorageConfig;
	let binaryDataRepository: ReturnType<typeof mock<BinaryDataRepository>>;
	let logger: ReturnType<typeof mock<Logger>>;
	let store: AgentKnowledgeFileStore;

	beforeAll(async () => {
		storagePath = await mkdtemp(join(tmpdir(), 'n8n-agent-knowledge-file-store-'));
	});

	beforeEach(async () => {
		for (const entry of await (await import('node:fs/promises')).readdir(storagePath)) {
			await rm(join(storagePath, entry), { recursive: true, force: true });
		}
		storageConfig = { storagePath, modeTag: 'fs' } as StorageConfig;
		binaryDataRepository = mock<BinaryDataRepository>();
		logger = mock<Logger>();
		const fsByteStore = new FsByteStore({
			storagePath,
			reportError: () => {},
		});
		store = new AgentKnowledgeFileStore(
			fsByteStore as never,
			storageConfig,
			binaryDataRepository,
			logger,
		);
	});

	afterAll(async () => {
		await rm(storagePath, { recursive: true, force: true });
	});

	it('writes to and reads from binary_data when modeTag is db', async () => {
		storageConfig = { storagePath, modeTag: 'db' } as StorageConfig;
		store = new AgentKnowledgeFileStore(
			new FsByteStore({ storagePath, reportError: () => {} }) as never,
			storageConfig,
			binaryDataRepository,
			logger,
		);
		const body = Buffer.from('knowledge-bytes', 'utf-8');

		const stored = await store.write(
			{ agentId: 'agent-1', fileId: 'file-1' },
			Readable.from(body),
			{ fileName: 'notes.txt', mimeType: 'text/plain' },
		);

		expect(stored.storedAt).toBe('db');
		expect(binaryDataRepository.insert).toHaveBeenCalledWith({
			fileId: stored.storageKey,
			sourceType: 'agent_file',
			sourceId: 'file-1',
			data: body,
			mimeType: 'text/plain',
			fileName: 'notes.txt',
			fileSize: body.length,
		});

		binaryDataRepository.findContentByFileId.mockResolvedValue(body);
		await expect(store.readAsBuffer(stored)).resolves.toEqual(body);
		expect(binaryDataRepository.findContentByFileId).toHaveBeenCalledWith(stored.storageKey);
	});

	it('reads a blob stored under the legacy BinaryDataService key', async () => {
		const body = Buffer.from('legacy-bytes', 'utf-8');
		const legacyKey =
			'agents/agent-1/knowledge-files/file-1/binary_data/2f1b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
		const fsByteStore = new FsByteStore({ storagePath, reportError: () => {} });
		await fsByteStore.write(legacyKey, body);

		await expect(store.readAsBuffer({ storedAt: 'fs', storageKey: legacyKey })).resolves.toEqual(
			body,
		);
	});

	it('writes to a registered s3 location when modeTag is s3', async () => {
		storageConfig = { storagePath, modeTag: 's3' } as StorageConfig;
		const fsByteStore = new FsByteStore({ storagePath, reportError: () => {} });
		store = new AgentKnowledgeFileStore(
			fsByteStore as never,
			storageConfig,
			binaryDataRepository,
			logger,
		);

		const s3Path = join(storagePath, 's3-root');
		const s3Store = new FsByteStore({ storagePath: s3Path, reportError: () => {} });
		store.registerByteStore('s3', s3Store);

		const body = Buffer.from('s3-bytes', 'utf-8');

		const stored = await store.write({ agentId: 'agent-1', fileId: 'file-2' }, body, {
			mimeType: 'text/plain',
		});

		expect(stored.storedAt).toBe('s3');
		await expect(store.readAsBuffer(stored)).resolves.toEqual(body);
	});

	it('returns null for a missing blob and throws for an unregistered storedAt', async () => {
		await expect(
			store.readAsBuffer({
				storedAt: 'fs',
				storageKey: 'agents/a/knowledge-files/missing/content',
			}),
		).resolves.toBeNull();

		await expect(
			store.readAsBuffer({ storedAt: 's3', storageKey: 'agents/a/knowledge-files/f/content' }),
		).rejects.toThrow(UnexpectedError);
	});

	it('deletes registered blobs and skips unregistered locations without throwing', async () => {
		const body = Buffer.from('delete-me', 'utf-8');
		const kept = await store.write({ agentId: 'agent-1', fileId: 'keep' }, body, {
			mimeType: 'text/plain',
		});

		await expect(
			store.delete([
				kept,
				{ storedAt: 'db', storageKey: '9c1f4b7a-2d3e-4f5a-8b6c-7d8e9f0a1b2c' },
				{ storedAt: 's3', storageKey: 'agents/agent-1/knowledge-files/orphan/content' },
			]),
		).resolves.toBeUndefined();

		await expect(store.readAsBuffer(kept)).resolves.toBeNull();
		expect(binaryDataRepository.deleteByFileIds).toHaveBeenCalledWith([
			'9c1f4b7a-2d3e-4f5a-8b6c-7d8e9f0a1b2c',
		]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped deleting agent knowledge files for unconfigured storage',
			expect.objectContaining({ storedAt: 's3', count: 1 }),
		);
	});
});
