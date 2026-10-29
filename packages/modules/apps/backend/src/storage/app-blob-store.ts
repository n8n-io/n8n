import {
	AzureByteStore,
	ByteStoreRegistry,
	S3ByteStore,
	ObjectStoreConfig,
	AzureBlobConfig,
} from '@n8n/blob-storage';
import {
	BinaryDataRepository,
	DbLock,
	DbLockService,
	type ExecutionDataStorageLocation,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { FsByteStoreService, StorageConfig } from 'n8n-core';
import { v7 as uuidv7 } from 'uuid';

import type { AppArtifactRef } from './app-artifact.entity';
import { AppArtifactRepository } from './app-artifact.repository';
import { appStorageLockSubKey } from './app-storage-lock';

export type AppBlob = { storedAt: ExecutionDataStorageLocation; storageKey: string };

@Service()
export class AppBlobStore {
	private readonly stores: ByteStoreRegistry;

	constructor(
		fs: FsByteStoreService,
		private readonly config: StorageConfig,
		private readonly binaryData: BinaryDataRepository,
		private readonly artifacts: AppArtifactRepository,
		private readonly locks: DbLockService,
	) {
		this.stores = new ByteStoreRegistry({ fs });
	}

	async init() {
		if (Container.get(ObjectStoreConfig).bucket.name) {
			try {
				const { ObjectStoreService } = await import('@n8n/blob-storage/object-store');
				const store = Container.get(ObjectStoreService);
				await store.checkConnection();
				this.stores.register('s3', new S3ByteStore(store));
			} catch (error) {
				if (this.config.modeTag === 's3') throw error;
			}
		}
		if (Container.get(AzureBlobConfig).containerName) {
			try {
				const { AzureBlobService } = await import('@n8n/blob-storage/azure-blob');
				const store = Container.get(AzureBlobService);
				await store.checkConnection();
				this.stores.register('az', new AzureByteStore(store));
			} catch (error) {
				if (this.config.modeTag === 'az') throw error;
			}
		}
		// Fail at startup if the selected byte store is unavailable
		if (this.config.modeTag !== 'db') this.stores.get(this.config.modeTag);
	}

	newBlob(): AppBlob {
		const storedAt = this.config.modeTag;
		const id = uuidv7();
		return { storedAt, storageKey: storedAt === 'db' ? id : `apps/artifacts/${id}.tgz` };
	}

	async write(blob: AppBlob & AppArtifactRef, body: Buffer): Promise<void> {
		if (blob.storedAt === 'db') {
			// Keep the database insert and reservation check together so cleanup cannot pass them.
			await this.locks.withLockContext(
				DbLock.APPS_STORAGE,
				async (ctx) => {
					await this.artifacts.storeDatabaseContent(blob, body, ctx);
				},
				{ subKey: appStorageLockSubKey(blob.appId) },
			);
		} else {
			await this.stores.get(blob.storedAt).write(blob.storageKey, body, {
				mimeType: 'application/gzip',
				fileName: 'artifact.tgz',
			});
		}
	}

	async read(blob: AppBlob): Promise<Buffer | null> {
		if (blob.storedAt === 'db') return await this.binaryData.findContentByFileId(blob.storageKey);
		return await this.stores.get(blob.storedAt).read(blob.storageKey);
	}

	async delete(blob: AppBlob): Promise<void> {
		if (blob.storedAt === 'db') {
			await this.binaryData.deleteByFileIds([blob.storageKey]);
		} else {
			// An unavailable backend must leave its artifact record available for retry.
			await this.stores.get(blob.storedAt).delete([blob.storageKey]);
		}
	}
}
