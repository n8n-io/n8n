import type { FsByteStore } from '@n8n/blob-storage';
import type { BinaryDataRepository } from '@n8n/db';
import type { ErrorReporter, StorageConfig } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AppVersionBlobStore } from '../app-version-blob-store';

describe('AppVersionBlobStore', () => {
	let binaryDataRepository: ReturnType<typeof mock<BinaryDataRepository>>;
	let fsByteStore: ReturnType<typeof mock<FsByteStore>>;
	let store: AppVersionBlobStore;

	beforeEach(() => {
		binaryDataRepository = mock<BinaryDataRepository>();
		fsByteStore = mock<FsByteStore>();
		store = new AppVersionBlobStore(
			fsByteStore,
			{ modeTag: 'db' } as StorageConfig,
			binaryDataRepository,
			mock<ErrorReporter>(),
		);
	});

	describe('delete', () => {
		it('deletes db blobs in batches of 500 ids', async () => {
			const keys = Array.from({ length: 1001 }, (_, i) => `key-${i}`);

			await store.delete(keys.map((storageKey) => ({ storedAt: 'db', storageKey })));

			const batches = binaryDataRepository.deleteByFileIds.mock.calls.map(([ids]) => ids);
			expect(batches.map((ids) => ids.length)).toEqual([500, 500, 1]);
			expect(batches.flat()).toEqual(keys);
		});

		it('groups blobs by location', async () => {
			await store.delete([
				{ storedAt: 'db', storageKey: 'a' },
				{ storedAt: 'fs', storageKey: 'apps/x/versions/1/source.tgz' },
				{ storedAt: 'db', storageKey: 'b' },
			]);

			expect(binaryDataRepository.deleteByFileIds).toHaveBeenCalledTimes(1);
			expect(binaryDataRepository.deleteByFileIds).toHaveBeenCalledWith(['a', 'b']);
			expect(fsByteStore.delete).toHaveBeenCalledWith(['apps/x/versions/1/source.tgz']);
		});
	});
});
