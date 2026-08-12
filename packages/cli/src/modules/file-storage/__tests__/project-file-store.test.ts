import type { ByteStore } from '@n8n/blob-storage';
import type { GlobalConfig } from '@n8n/config';
import type { BinaryDataRepository } from '@n8n/db';
import type { ErrorReporter, FsByteStoreService } from 'n8n-core';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { ProjectFileStore } from '../project-file-store';

describe('ProjectFileStore', () => {
	const fsByteStore = mock<FsByteStoreService>();
	const binaryDataRepository = mock<BinaryDataRepository>();
	const errorReporter = mock<ErrorReporter>();
	const globalConfig = mock<GlobalConfig>({ fileStorage: { mode: 'fs' } });

	const ref = { projectId: 'project-1', fileId: 'file-1' };
	const body = Buffer.from('payload-bytes', 'utf-8');

	let store: ProjectFileStore;

	beforeEach(() => {
		vi.clearAllMocks();
		globalConfig.fileStorage.mode = 'fs';
		store = new ProjectFileStore(fsByteStore, globalConfig, binaryDataRepository, errorReporter);
	});

	describe('write', () => {
		it('writes to the configured byte store under an id-based key', async () => {
			fsByteStore.write.mockResolvedValueOnce(body.length);

			const stored = await store.write(ref, body, { mimeType: 'text/csv' });

			expect(fsByteStore.write).toHaveBeenCalledWith('project-files/project-1/file-1', body, {
				mimeType: 'text/csv',
			});
			expect(stored).toEqual({
				storedAt: 'fs',
				storageKey: 'project-files/project-1/file-1',
				bytesWritten: body.length,
			});
		});

		it('short-circuits into binary_data in db mode with a fresh uuid key', async () => {
			globalConfig.fileStorage.mode = 'db';

			const stored = await store.write(ref, Readable.from(body), {
				mimeType: 'text/csv',
				fileName: 'pricing.csv',
			});

			expect(fsByteStore.write).not.toHaveBeenCalled();
			expect(binaryDataRepository.insert).toHaveBeenCalledWith({
				fileId: stored.storageKey,
				sourceType: 'project_file',
				sourceId: 'file-1',
				data: body,
				mimeType: 'text/csv',
				fileName: 'pricing.csv',
				fileSize: body.length,
			});
			expect(stored.storedAt).toBe('db');
			expect(stored.bytesWritten).toBe(body.length);
		});

		it('throws when the configured mode has no registered store', async () => {
			globalConfig.fileStorage.mode = 's3';

			await expect(store.write(ref, body, {})).rejects.toThrow();
		});
	});

	describe('readStream', () => {
		it('reads from the byte store recorded on the row', async () => {
			const stream = Readable.from(body) as unknown as import('fs').ReadStream;
			fsByteStore.readStream.mockResolvedValueOnce(stream);

			await expect(store.readStream({ storedAt: 'fs', storageKey: 'a/key' })).resolves.toBe(stream);
		});

		it('wraps db-mode bytes in a stream', async () => {
			binaryDataRepository.findContentByFileId.mockResolvedValueOnce(body);

			const stream = await store.readStream({ storedAt: 'db', storageKey: 'uuid-1' });

			expect(stream).toBeInstanceOf(Readable);
		});

		it('returns null when the key resolves to nothing', async () => {
			fsByteStore.readStream.mockResolvedValueOnce(null);

			await expect(store.readStream({ storedAt: 'fs', storageKey: 'gone' })).resolves.toBeNull();
		});
	});

	describe('delete', () => {
		it('groups keys by location and dispatches to the right backend', async () => {
			const s3Store = mock<ByteStore>();
			store.registerByteStore('s3', s3Store);

			await store.delete([
				{ storedAt: 'fs', storageKey: 'fs-key-1' },
				{ storedAt: 's3', storageKey: 's3-key-1' },
				{ storedAt: 'db', storageKey: 'db-key-1' },
			]);

			expect(fsByteStore.delete).toHaveBeenCalledWith(['fs-key-1']);
			expect(s3Store.delete).toHaveBeenCalledWith(['s3-key-1']);
			expect(binaryDataRepository.deleteByFileIds).toHaveBeenCalledWith(['db-key-1']);
		});

		it('reports and skips keys on an unregistered backend', async () => {
			await store.delete([{ storedAt: 's3', storageKey: 's3-key-1' }]);

			expect(errorReporter.error).toHaveBeenCalled();
		});
	});

	describe('listStoredKeys', () => {
		it('lists the project-files prefix on the active backend', async () => {
			const entries = [{ key: 'project-files/p/f', lastModified: new Date() }];
			fsByteStore.list.mockResolvedValueOnce(entries);

			await expect(store.listStoredKeys()).resolves.toEqual(entries);
			expect(fsByteStore.list).toHaveBeenCalledWith('project-files/');
		});

		it('returns an empty array in db mode', async () => {
			globalConfig.fileStorage.mode = 'db';

			await expect(store.listStoredKeys()).resolves.toEqual([]);
			expect(fsByteStore.list).not.toHaveBeenCalled();
		});
	});
});
