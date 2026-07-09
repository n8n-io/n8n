/* eslint-disable @typescript-eslint/unbound-method */

import type { ObjectStoreService } from 'n8n-core/dist/binary-data/object-store/object-store.service.ee';
import type { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { S3ByteStore } from '../s3-byte-store.ee';
import { body, wrapProviderError } from './mocks';

const notFoundByName = () =>
	wrapProviderError(Object.assign(new Error('missing'), { name: 'NoSuchKey' }));

describe('S3ByteStore', () => {
	let objectStoreService: ReturnType<typeof mock<ObjectStoreService>>;
	let store: S3ByteStore;

	beforeEach(() => {
		objectStoreService = mock<ObjectStoreService>();
		store = new S3ByteStore(objectStoreService);
	});

	describe('write', () => {
		it('should put the bytes at the key and return the byte count', async () => {
			const bytes = await store.write('a/b/blob.json', body, 'application/json');

			expect(objectStoreService.put).toHaveBeenCalledWith('a/b/blob.json', body, {
				mimeType: 'application/json',
			});
			expect(bytes).toBe(body.length);
		});

		it('should default to a binary content type', async () => {
			await store.write('a/b/blob.bin', body);

			expect(objectStoreService.put).toHaveBeenCalledWith('a/b/blob.bin', body, {
				mimeType: 'application/octet-stream',
			});
		});
	});

	describe('read', () => {
		it('should return the stored bytes', async () => {
			objectStoreService.get.mockResolvedValueOnce(body as unknown as Readable);

			expect(await store.read('a/b/blob.json')).toBe(body);
			expect(objectStoreService.get).toHaveBeenCalledWith('a/b/blob.json', { mode: 'buffer' });
		});

		it('should return `null` when the object is missing (NoSuchKey)', async () => {
			objectStoreService.get.mockRejectedValueOnce(notFoundByName());

			expect(await store.read('a/b/blob.json')).toBeNull();
		});

		it('should not treat a bucket-level failure (NoSuchBucket) as a missing object', async () => {
			const noSuchBucket = wrapProviderError(
				Object.assign(new Error('bucket missing'), {
					name: 'NoSuchBucket',
					$metadata: { httpStatusCode: 404 },
				}),
			);
			objectStoreService.get.mockRejectedValueOnce(noSuchBucket);

			await expect(store.read('a/b/blob.json')).rejects.toBe(noSuchBucket);
		});

		it('should rethrow a systemic error (not a missing object)', async () => {
			const throttled = wrapProviderError(
				Object.assign(new Error('slow down'), { name: 'ThrottlingException' }),
			);
			objectStoreService.get.mockRejectedValueOnce(throttled);

			await expect(store.read('a/b/blob.json')).rejects.toBe(throttled);
		});
	});

	describe('delete', () => {
		it('should delete the objects for the given keys', async () => {
			await store.delete(['a/one.json', 'a/two.json']);

			expect(objectStoreService.deleteByKeys).toHaveBeenCalledWith(['a/one.json', 'a/two.json']);
		});

		it('should not send a request for an empty array', async () => {
			await store.delete([]);

			expect(objectStoreService.deleteByKeys).not.toHaveBeenCalled();
		});
	});
});
