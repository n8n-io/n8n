import type { Logger } from '@n8n/backend-common';
import { FsByteStore } from '@n8n/blob-storage';
import { UnexpectedError } from 'n8n-workflow';
import type { StorageConfig } from 'n8n-core';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import { AgentKnowledgeFileStore } from '../agent-knowledge-file-store';

vi.unmock('node:fs');
vi.unmock('node:fs/promises');

describe('AgentKnowledgeFileStore', () => {
	let storagePath: string;
	let storageConfig: StorageConfig;
	let logger: ReturnType<typeof mock<Logger>>;
	let store: AgentKnowledgeFileStore;

	beforeAll(async () => {
		storagePath = await mkdtemp(join(tmpdir(), 'n8n-agent-knowledge-file-store-'));
	});

	beforeEach(async () => {
		for (const entry of await (await import('node:fs/promises')).readdir(storagePath)) {
			await rm(join(storagePath, entry), { recursive: true, force: true });
		}
		storageConfig = { storagePath, modeTag: 'db' } as StorageConfig;
		logger = mock<Logger>();
		const fsByteStore = new FsByteStore({
			storagePath,
			reportError: () => {},
		});
		store = new AgentKnowledgeFileStore(fsByteStore as never, storageConfig, logger);
	});

	afterAll(async () => {
		await rm(storagePath, { recursive: true, force: true });
	});

	it('falls back to fs when execution data storage mode is database and round-trips bytes', async () => {
		const body = Buffer.from('knowledge-bytes', 'utf-8');
		const ref = { agentId: 'agent-1', fileId: 'file-1' };

		const storedAt = await store.write(ref, body, {
			fileName: 'notes.txt',
			mimeType: 'text/plain',
		});

		expect(storedAt).toBe('fs');
		expect(logger.warn).toHaveBeenCalledWith(
			"Execution data storage mode is 'database'; agent knowledge files will be stored on the local filesystem",
		);
		await expect(store.readAsBuffer({ ...ref, storedAt: 'fs' })).resolves.toEqual(body);
	});

	it('writes to a registered s3 location when modeTag is s3', async () => {
		storageConfig = { storagePath, modeTag: 's3' } as StorageConfig;
		const fsByteStore = new FsByteStore({ storagePath, reportError: () => {} });
		store = new AgentKnowledgeFileStore(fsByteStore as never, storageConfig, logger);

		const s3Path = join(storagePath, 's3-root');
		const s3Store = new FsByteStore({ storagePath: s3Path, reportError: () => {} });
		store.registerByteStore('s3', s3Store);

		const body = Buffer.from('s3-bytes', 'utf-8');
		const ref = { agentId: 'agent-1', fileId: 'file-2' };

		const storedAt = await store.write(ref, body, { mimeType: 'text/plain' });

		expect(storedAt).toBe('s3');
		await expect(store.readAsBuffer({ ...ref, storedAt: 's3' })).resolves.toEqual(body);
	});

	it('returns null for a missing blob and throws for an unregistered storedAt', async () => {
		await expect(
			store.readAsBuffer({ agentId: 'agent-1', fileId: 'missing', storedAt: 'fs' }),
		).resolves.toBeNull();

		await expect(
			store.readAsBuffer({ agentId: 'agent-1', fileId: 'file-1', storedAt: 's3' }),
		).rejects.toThrow(UnexpectedError);
	});

	it('deletes registered blobs and skips unregistered locations without throwing', async () => {
		const kept = { agentId: 'agent-1', fileId: 'keep' };
		const body = Buffer.from('delete-me', 'utf-8');
		await store.write(kept, body, { mimeType: 'text/plain' });

		await expect(
			store.delete([
				{ ...kept, storedAt: 'fs' },
				{ agentId: 'agent-1', fileId: 'orphan', storedAt: 's3' },
			]),
		).resolves.toBeUndefined();

		await expect(store.readAsBuffer({ ...kept, storedAt: 'fs' })).resolves.toBeNull();
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped deleting agent knowledge files for unconfigured storage',
			expect.objectContaining({ storedAt: 's3', count: 1 }),
		);
	});
});
