import { AzureBlobConfig, ObjectStoreConfig } from '@n8n/blob-storage';
import { ObjectStoreService } from '@n8n/blob-storage/object-store';
import { AzureBlobService } from '@n8n/blob-storage/azure-blob';
import { BinaryDataRepository, DbLockService, type ExecutionDataStorageLocation } from '@n8n/db';
import { Container } from '@n8n/di';
import { FsByteStoreService, StorageConfig } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AppArtifactRepository } from '../app-artifact.repository';
import { AppBlobStore } from '../storage/app-blob-store';

function createStore(mode: ExecutionDataStorageLocation = 'fs') {
	const fs = mock<FsByteStoreService>();
	const store = new AppBlobStore(
		fs,
		mock<StorageConfig>({ modeTag: mode }),
		mock<BinaryDataRepository>(),
		mock<AppArtifactRepository>(),
		mock<DbLockService>(),
	);
	return { store, fs };
}

beforeEach(() => {
	Container.set(ObjectStoreConfig, mock<ObjectStoreConfig>({ bucket: { name: '' } }));
	Container.set(AzureBlobConfig, mock<AzureBlobConfig>({ containerName: '' }));
});

afterEach(() => Container.reset());

it('writes, reads, and deletes filesystem bytes through the shared store', async () => {
	const body = Buffer.from('content');
	const { store, fs } = createStore('fs');
	fs.read.mockResolvedValueOnce(body).mockResolvedValueOnce(null);
	await store.init();
	const blob = { ...store.newBlob(), id: 1 };
	await store.write(blob, body);
	expect(fs.write).toHaveBeenCalledWith(blob.storageKey, body, {
		mimeType: 'application/gzip',
		fileName: 'artifact.tgz',
	});
	expect(await store.read(blob)).toEqual(body);
	expect(fs.read).toHaveBeenCalledWith(blob.storageKey);
	await store.delete(blob);
	expect(fs.delete).toHaveBeenCalledWith([blob.storageKey]);
	expect(await store.read(blob)).toBeNull();
});

it('writes, reads, and deletes S3 bytes through the shared store', async () => {
	const body = Buffer.from('content');
	const client = mock<ObjectStoreService>({
		get: vi
			.fn()
			.mockResolvedValueOnce(body)
			.mockRejectedValueOnce(Object.assign(new Error('Object not found'), { name: 'NoSuchKey' })),
	});
	Container.set(ObjectStoreConfig, mock<ObjectStoreConfig>({ bucket: { name: 'apps' } }));
	Container.set(ObjectStoreService, client);
	const { store } = createStore('s3');
	await store.init();
	const blob = { ...store.newBlob(), id: 1 };
	await store.write(blob, body);
	expect(client.put).toHaveBeenCalledWith(blob.storageKey, body, {
		mimeType: 'application/gzip',
		fileName: 'artifact.tgz',
	});
	expect(await store.read(blob)).toEqual(body);
	expect(client.get).toHaveBeenCalledWith(blob.storageKey, { mode: 'buffer' });
	await store.delete(blob);
	expect(client.deleteByKeys).toHaveBeenCalledWith([blob.storageKey]);
	expect(await store.read(blob)).toBeNull();
});

it('writes, reads, and deletes Azure bytes through the shared store', async () => {
	const body = Buffer.from('content');
	const client = mock<AzureBlobService>({
		get: vi
			.fn()
			.mockResolvedValueOnce(body)
			.mockRejectedValueOnce(Object.assign(new Error('Blob not found'), { code: 'BlobNotFound' })),
	});
	Container.set(AzureBlobConfig, mock<AzureBlobConfig>({ containerName: 'apps' }));
	Container.set(AzureBlobService, client);
	const { store } = createStore('az');
	await store.init();
	const blob = { ...store.newBlob(), id: 1 };
	await store.write(blob, body);
	expect(client.put).toHaveBeenCalledWith(blob.storageKey, body, {
		mimeType: 'application/gzip',
		fileName: 'artifact.tgz',
	});
	expect(await store.read(blob)).toEqual(body);
	expect(client.get).toHaveBeenCalledWith(blob.storageKey, { mode: 'buffer' });
	await store.delete(blob);
	expect(client.delete).toHaveBeenCalledWith(blob.storageKey);
	expect(await store.read(blob)).toBeNull();
});
