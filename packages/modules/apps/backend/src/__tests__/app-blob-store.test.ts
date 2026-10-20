import { AzureBlobConfig, ObjectStoreConfig } from '@n8n/blob-storage';
import { ObjectStoreService } from '@n8n/blob-storage/object-store';
import { AzureBlobService } from '@n8n/blob-storage/azure-blob';
import {
	BinaryDataRepository,
	DbLock,
	DbLockService,
	type ExecutionDataStorageLocation,
	type OperationContext,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { FsByteStoreService, StorageConfig } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AppArtifactRepository } from '../app-artifact.repository';
import { appStorageLockSubKey } from '../app-storage-lock';
import { AppBlobStore } from '../storage/app-blob-store';

const appId = '11111111-1111-4111-8111-111111111111';

function createStore(mode: ExecutionDataStorageLocation = 'fs') {
	const fs = mock<FsByteStoreService>();
	const binaryData = mock<BinaryDataRepository>();
	const artifacts = mock<AppArtifactRepository>();
	const locks = mock<DbLockService>();
	const ctx = mock<OperationContext>();
	locks.withLockContext.mockImplementation(async (_key, fn) => await fn(ctx));
	const store = new AppBlobStore(
		fs,
		mock<StorageConfig>({ modeTag: mode }),
		binaryData,
		artifacts,
		locks,
	);
	return { store, fs, binaryData, artifacts, locks, ctx };
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
	const blob = { ...store.newBlob(), id: 1, appId };
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
	const blob = { ...store.newBlob(), id: 1, appId };
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
	const blob = { ...store.newBlob(), id: 1, appId };
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

it('writes database content under the owning app lock', async () => {
	const { store, artifacts, locks, ctx } = createStore('db');
	const blob = { ...store.newBlob(), id: 1, appId };
	const body = Buffer.from('content');

	await store.write(blob, body);

	expect(locks.withLockContext).toHaveBeenCalledWith(DbLock.APPS_STORAGE, expect.any(Function), {
		subKey: appStorageLockSubKey(appId),
	});
	expect(artifacts.storeDatabaseContent).toHaveBeenCalledWith(blob, body, ctx);
});

it('reads and deletes filesystem content after new writes switch to the database', async () => {
	const { store, fs } = createStore('db');
	const blob = { storedAt: 'fs', storageKey: 'apps/artifacts/existing.tgz' } as const;
	const body = Buffer.from('existing content');
	fs.read.mockResolvedValue(body);

	expect(await store.read(blob)).toEqual(body);
	await store.delete(blob);

	expect(fs.delete).toHaveBeenCalledWith([blob.storageKey]);
});

it('reads and deletes database content after new writes switch to the filesystem', async () => {
	const { store, binaryData } = createStore('fs');
	const blob = { storedAt: 'db', storageKey: '11111111-1111-4111-8111-111111111111' } as const;
	const body = Buffer.from('existing content');
	binaryData.findContentByFileId.mockResolvedValue(body);

	expect(await store.read(blob)).toEqual(body);
	await store.delete(blob);

	expect(binaryData.deleteByFileIds).toHaveBeenCalledWith([blob.storageKey]);
});

it('fails startup when the selected backend cannot connect', async () => {
	const error = new Error('Storage is unavailable.');
	const client = mock<ObjectStoreService>();
	client.checkConnection.mockRejectedValue(error);
	Container.set(ObjectStoreConfig, mock<ObjectStoreConfig>({ bucket: { name: 'apps' } }));
	Container.set(ObjectStoreService, client);
	const { store } = createStore('s3');

	await expect(store.init()).rejects.toBe(error);
});
