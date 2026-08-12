import { LicenseState, Logger } from '@n8n/backend-common';
import { AzureBlobConfig, AzureByteStore, ObjectStoreConfig, S3ByteStore } from '@n8n/blob-storage';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import type { ProjectFileStore } from './project-file-store';

/**
 * Registers the byte store `N8N_FILE_STORAGE_MODE` points at. Unlike the
 * agents pattern, registration is module-owned and independent of the
 * execution-data storage mode: a deployment can keep execution data in the
 * database while project files live on s3/az. The fs backend is always
 * available via the store's constructor; s3/az require an enterprise license
 * and their storage config, enforced here so an unlicensed or misconfigured
 * mode fails startup instead of silently serving no files.
 */
export async function registerFileStorageByteStores(store: ProjectFileStore): Promise<void> {
	const globalConfig = Container.get(GlobalConfig);
	const { mode } = globalConfig.fileStorage;

	if (mode === 'fs' && globalConfig.executions.mode === 'queue') {
		Container.get(Logger).warn(
			'File storage mode is `fs` in queue mode: main and worker instances must share the volume behind `N8N_STORAGE_PATH`, or file reads will fail on instances without it. Consider `N8N_FILE_STORAGE_MODE=s3` or `db`.',
		);
		return;
	}

	if (mode === 's3') {
		if (!Container.get(LicenseState).isExecutionDataS3Licensed()) {
			throw new UserError(
				'S3 file storage requires a valid license. Either set `N8N_FILE_STORAGE_MODE` to something else, or upgrade to a license that supports this feature.',
			);
		}
		if (Container.get(ObjectStoreConfig).bucket.name === '') {
			throw new UserError(
				'S3 file storage requires `N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME` to be set.',
			);
		}
		const { ObjectStoreService } = await import('@n8n/blob-storage/object-store');
		const objectStore = Container.get(ObjectStoreService);
		await objectStore.init(); // idempotent when base-command already initialized it
		store.registerByteStore('s3', new S3ByteStore(objectStore));
	}

	if (mode === 'az') {
		if (!Container.get(LicenseState).isExecutionDataAzureLicensed()) {
			throw new UserError(
				'Azure Blob file storage requires a valid license. Either set `N8N_FILE_STORAGE_MODE` to something else, or upgrade to a license that supports this feature.',
			);
		}
		if (Container.get(AzureBlobConfig).containerName === '') {
			throw new UserError(
				'Azure Blob file storage requires `N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME` to be set.',
			);
		}
		const { AzureBlobService } = await import('@n8n/blob-storage/azure-blob');
		const azureBlob = Container.get(AzureBlobService);
		await azureBlob.init();
		store.registerByteStore('az', new AzureByteStore(azureBlob));
	}
}
