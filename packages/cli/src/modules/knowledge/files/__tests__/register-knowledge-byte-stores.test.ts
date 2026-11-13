import { AzureByteStore, S3ByteStore } from '@n8n/blob-storage';
import { AzureBlobService } from '@n8n/blob-storage/azure-blob';
import { ObjectStoreService } from '@n8n/blob-storage/object-store';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { ExecutionDataJsonStore } from '@/executions/execution-data/execution-data-json-store';

import type { KnowledgeFileStore } from '../knowledge-file-store';
import { registerKnowledgeByteStores } from '../register-knowledge-byte-stores';

describe('registerKnowledgeByteStores', () => {
	beforeEach(() => {
		Container.reset();
		Container.set(ObjectStoreService, mock<ObjectStoreService>());
		Container.set(AzureBlobService, mock<AzureBlobService>());
	});

	function makeStores(locations: string[]) {
		return {
			executionDataJsonStore: mock<ExecutionDataJsonStore>({
				hasLocation: (location: string) => locations.includes(location),
			}),
			knowledgeFileStore: mock<KnowledgeFileStore>(),
		};
	}

	it('registers nothing when only the fs location is configured', async () => {
		const stores = makeStores(['fs']);

		await registerKnowledgeByteStores(stores);

		expect(stores.knowledgeFileStore.registerByteStore).not.toHaveBeenCalled();
	});

	it('registers the s3 byte store when the s3 location is configured', async () => {
		const stores = makeStores(['s3']);

		await registerKnowledgeByteStores(stores);

		expect(stores.knowledgeFileStore.registerByteStore).toHaveBeenCalledTimes(1);
		expect(stores.knowledgeFileStore.registerByteStore).toHaveBeenCalledWith(
			's3',
			expect.any(S3ByteStore),
		);
	});

	it('registers the az byte store when the az location is configured', async () => {
		const stores = makeStores(['az']);

		await registerKnowledgeByteStores(stores);

		expect(stores.knowledgeFileStore.registerByteStore).toHaveBeenCalledTimes(1);
		expect(stores.knowledgeFileStore.registerByteStore).toHaveBeenCalledWith(
			'az',
			expect.any(AzureByteStore),
		);
	});
});
