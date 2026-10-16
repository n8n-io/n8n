import { AzureBlobConfig, FsByteStore, ObjectStoreConfig } from '@n8n/blob-storage';
import { ObjectStoreService } from '@n8n/blob-storage/object-store';
import { AzureBlobService } from '@n8n/blob-storage/azure-blob';
import { BinaryDataRepository, DbLockService, type ExecutionDataStorageLocation } from '@n8n/db';
import { Container } from '@n8n/di';
import { StorageConfig } from 'n8n-core';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import { AppArtifactRepository } from '../app-artifact.repository';
import { AppBlobStore } from '../storage/app-blob-store';

function createStore(mode: ExecutionDataStorageLocation = 'fs') {
	return new AppBlobStore(
		new FsByteStore({
			storagePath: join(process.env.N8N_USER_FOLDER!, 'blobs'),
			reportError: vi.fn(),
		}),
		mock<StorageConfig>({ modeTag: mode }),
		mock<BinaryDataRepository>(),
		mock<AppArtifactRepository>(),
		mock<DbLockService>(),
	);
}

beforeEach(() => {
	Container.set(ObjectStoreConfig, mock<ObjectStoreConfig>({ bucket: { name: '' } }));
	Container.set(AzureBlobConfig, mock<AzureBlobConfig>({ containerName: '' }));
});

afterEach(() => Container.reset());

it('writes filesystem bytes through the shared store', async () => {
	const store = createStore();
	const blob = { ...store.newBlob(), id: 1 };
	await store.write(blob, Buffer.from('source'));
	expect(await store.read(blob)).toEqual(Buffer.from('source'));
	await store.delete(blob);
	expect(await store.read(blob)).toBeNull();
});

it('writes and deletes S3 bytes through the shared store', async () => {
	const client = mock<ObjectStoreService>();
	Container.set(ObjectStoreConfig, mock<ObjectStoreConfig>({ bucket: { name: 'apps' } }));
	Container.set(ObjectStoreService, client);
	const store = createStore('s3');
	await store.init();
	const blob = { ...store.newBlob(), id: 1 };
	const body = Buffer.from('bundle');
	await store.write(blob, body);
	expect(client.put).toHaveBeenCalledWith(blob.storageKey, body, {
		mimeType: 'application/gzip',
		fileName: 'artifact.tgz',
	});
	await store.delete(blob);
	expect(client.deleteByKeys).toHaveBeenCalledWith([blob.storageKey]);
});

it('writes and deletes Azure bytes through the shared store', async () => {
	const client = mock<AzureBlobService>();
	Container.set(AzureBlobConfig, mock<AzureBlobConfig>({ containerName: 'apps' }));
	Container.set(AzureBlobService, client);
	const store = createStore('az');
	await store.init();
	const blob = { ...store.newBlob(), id: 1 };
	const body = Buffer.from('bundle');
	await store.write(blob, body);
	expect(client.put).toHaveBeenCalledWith(blob.storageKey, body, {
		mimeType: 'application/gzip',
		fileName: 'artifact.tgz',
	});
	await store.delete(blob);
	expect(client.delete).toHaveBeenCalledWith(blob.storageKey);
});
