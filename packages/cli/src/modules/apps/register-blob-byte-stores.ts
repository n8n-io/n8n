import { AzureByteStore, S3ByteStore } from '@n8n/blob-storage';
import { Container } from '@n8n/di';

import type { ExecutionDataJsonStore } from '@/executions/execution-data/execution-data-json-store';

import type { AppVersionBlobStore } from './app-version-blob-store';

/**
 * Registers s3/az on the app version blob store when ExecutionDataJsonStore
 * already has those locations (base-command init succeeded). fs is always
 * available via the store's constructor.
 */
export async function registerAppVersionByteStores(
	executionDataJsonStore: ExecutionDataJsonStore,
	appVersionBlobStore: AppVersionBlobStore,
): Promise<void> {
	if (executionDataJsonStore.hasLocation('s3')) {
		const { ObjectStoreService } = await import('@n8n/blob-storage/object-store');
		appVersionBlobStore.registerByteStore('s3', new S3ByteStore(Container.get(ObjectStoreService)));
	}
	if (executionDataJsonStore.hasLocation('az')) {
		const { AzureBlobService } = await import('@n8n/blob-storage/azure-blob');
		appVersionBlobStore.registerByteStore(
			'az',
			new AzureByteStore(Container.get(AzureBlobService)),
		);
	}
}
