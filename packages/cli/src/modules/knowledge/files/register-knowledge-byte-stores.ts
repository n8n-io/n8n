import { AzureByteStore, S3ByteStore } from '@n8n/blob-storage';
import { Container } from '@n8n/di';

import type { ExecutionDataJsonStore } from '@/executions/execution-data/execution-data-json-store';

import type { KnowledgeFileStore } from './knowledge-file-store';

/**
 * Registers the s3 and az byte stores on the knowledge file store when
 * ExecutionDataJsonStore already has those locations configured (i.e.
 * base-command init succeeded). The fs backend is always available on the
 * store via its constructor.
 */
export async function registerKnowledgeByteStores(stores: {
	executionDataJsonStore: ExecutionDataJsonStore;
	knowledgeFileStore: KnowledgeFileStore;
}): Promise<void> {
	const { executionDataJsonStore, knowledgeFileStore } = stores;

	if (executionDataJsonStore.hasLocation('s3')) {
		const { ObjectStoreService } = await import('@n8n/blob-storage/object-store');
		knowledgeFileStore.registerByteStore('s3', new S3ByteStore(Container.get(ObjectStoreService)));
	}
	if (executionDataJsonStore.hasLocation('az')) {
		const { AzureBlobService } = await import('@n8n/blob-storage/azure-blob');
		knowledgeFileStore.registerByteStore('az', new AzureByteStore(Container.get(AzureBlobService)));
	}
}
