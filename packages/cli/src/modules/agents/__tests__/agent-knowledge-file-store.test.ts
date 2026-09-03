import { FsByteStore, SkippedEntryDeletionError } from '@n8n/blob-storage';
import type { BinaryDataRepository } from '@n8n/db';
import type { ErrorReporter, StorageConfig } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { AgentKnowledgeFileStore } from '../agent-knowledge-file-store';

vi.unmock('node:fs');
vi.unmock('node:fs/promises');

const LEGACY_KEY =
	'agents/agent-1/knowledge-files/file-1/binary_data/2f1b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

describe('AgentKnowledgeFileStore', () => {
	let storagePath: string;
	let binaryDataRepository: ReturnType<typeof mock<BinaryDataRepository>>;
	let errorReporter: ReturnType<typeof mock<ErrorReporter>>;
	let fsByteStore: FsByteStore;
	let store: AgentKnowledgeFileStore;

	function makeStore(modeTag: 'db' | 'fs' | 's3' | 'az'): AgentKnowledgeFileStore {
		return new AgentKnowledgeFileStore(
			fsByteStore,
			{ storagePath, modeTag } as StorageConfig,
			binaryDataRepository,
			errorReporter,
		);
	}

	beforeAll(async () => {
		storagePath = await mkdtemp(join(tmpdir(), 'n8n-agent-knowledge-file-store-'));
	});

	beforeEach(async () => {
		for (const entry of await readdir(storagePath)) {
			await rm(join(storagePath, entry), { recursive: true, force: true });
		}
		binaryDataRepository = mock<BinaryDataRepository>();
		errorReporter = mock<ErrorReporter>();
		fsByteStore = new FsByteStore({ storagePath, reportError: () => {} });
		store = makeStore('fs');
	});

	afterAll(async () => {
		await rm(storagePath, { recursive: true, force: true });
	});

	it('writes to and reads from binary_data when modeTag is db', async () => {
		store = makeStore('db');
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
		await fsByteStore.write(LEGACY_KEY, body);

		await expect(store.readAsBuffer({ storedAt: 'fs', storageKey: LEGACY_KEY })).resolves.toEqual(
			body,
		);
	});

	it('writes to a registered s3 location when modeTag is s3', async () => {
		store = makeStore('s3');
		const s3Store = new FsByteStore({
			storagePath: join(storagePath, 's3-root'),
			reportError: () => {},
		});
		store.registerByteStore('s3', s3Store);

		const body = Buffer.from('s3-bytes', 'utf-8');

		const stored = await store.write({ agentId: 'agent-1', fileId: 'file-2' }, body, {
			mimeType: 'text/plain',
		});

		expect(stored.storedAt).toBe('s3');
		await expect(store.readAsBuffer(stored)).resolves.toEqual(body);
	});

	it('throws when writing to a location that has no byte store', async () => {
		store = makeStore('s3');

		await expect(
			store.write({ agentId: 'agent-1', fileId: 'file-3' }, Buffer.from('bytes', 'utf-8'), {
				mimeType: 'text/plain',
			}),
		).rejects.toThrow(UnexpectedError);
	});

	it('returns null for a missing blob', async () => {
		await expect(
			store.readAsBuffer({
				storedAt: 'fs',
				storageKey: 'agents/a/knowledge-files/missing/content',
			}),
		).resolves.toBeNull();
	});

	it('throws when reading from a location that has no byte store', async () => {
		await expect(
			store.readAsBuffer({ storedAt: 's3', storageKey: 'agents/a/knowledge-files/f/content' }),
		).rejects.toThrow(UnexpectedError);
	});

	it('deletes registered blobs and reports unregistered locations without throwing', async () => {
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
		expect(errorReporter.error).toHaveBeenCalledWith(expect.any(SkippedEntryDeletionError));
	});

	it('deletes the companion metadata entry of a legacy filesystem key', async () => {
		await fsByteStore.write(LEGACY_KEY, Buffer.from('legacy-bytes', 'utf-8'));
		await fsByteStore.write(
			`${LEGACY_KEY}.metadata`,
			Buffer.from('{"fileName":"notes.txt"}', 'utf-8'),
		);

		await store.delete([{ storedAt: 'fs', storageKey: LEGACY_KEY }]);

		await expect(fsByteStore.read(LEGACY_KEY)).resolves.toBeNull();
		await expect(fsByteStore.read(`${LEGACY_KEY}.metadata`)).resolves.toBeNull();
	});
});
