/* eslint-disable @typescript-eslint/unbound-method */

import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import type { ObjectStoreService } from '../object-store/object-store.service.ee';
import { S3ByteStore } from '../s3-byte-store.ee';
import {
	body,
	s3HeadNotFoundError,
	s3NotFoundError,
	s3NoSuchBucketError,
	s3ThrottledError,
} from './mocks';

let objectStoreService: ReturnType<typeof mock<ObjectStoreService>>;
let store: S3ByteStore;

beforeEach(() => {
	objectStoreService = mock<ObjectStoreService>();
	store = new S3ByteStore(objectStoreService);
});

describe('write', () => {
	it('should put the bytes at the key and return the byte count', async () => {
		const bytes = await store.write('a/b/blob.json', body, { mimeType: 'application/json' });
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

	it('should forward native metadata', async () => {
		await store.write('a/b/blob.bin', body, { fileName: 'file.txt', mimeType: 'text/plain' });
		expect(objectStoreService.put).toHaveBeenCalledWith('a/b/blob.bin', body, {
			fileName: 'file.txt',
			mimeType: 'text/plain',
		});
	});

	it('should buffer a stream before uploading and return the byte count', async () => {
		const bytes = await store.write('a/b/blob.bin', Readable.from(body));
		expect(objectStoreService.put).toHaveBeenCalledWith('a/b/blob.bin', body, {
			mimeType: 'application/octet-stream',
		});
		expect(bytes).toBe(body.length);
	});
});

describe('readStream', () => {
	it('should return the stored stream, forwarding chunkSize', async () => {
		const stream = Readable.from(body);
		objectStoreService.get.mockResolvedValueOnce(stream);

		expect(await store.readStream('a/b/blob.json', { chunkSize: 5 })).toBe(stream);
		expect(objectStoreService.get).toHaveBeenCalledWith('a/b/blob.json', {
			mode: 'stream',
			chunkSize: 5,
		});
	});

	it('should return `null` when the object is missing', async () => {
		objectStoreService.get.mockRejectedValueOnce(s3NotFoundError);
		expect(await store.readStream('a/b/blob.json')).toBeNull();
	});

	it('should rethrow a systemic error', async () => {
		objectStoreService.get.mockRejectedValueOnce(s3ThrottledError);
		await expect(store.readStream('a/b/blob.json')).rejects.toBe(s3ThrottledError);
	});

	it('should reject a fractional chunkSize before downloading', async () => {
		await expect(store.readStream('a/b/blob.json', { chunkSize: 1.5 })).rejects.toThrow(
			'positive integer',
		);
		expect(objectStoreService.get).not.toHaveBeenCalled();
	});
});

describe('getMetadata', () => {
	it('should normalize native metadata', async () => {
		objectStoreService.getMetadata.mockResolvedValueOnce({
			'content-length': '11',
			'content-type': 'text/plain',
			'x-amz-meta-filename': 'file.txt',
		});

		expect(await store.getMetadata('a/b/blob.json')).toEqual({
			fileSize: 11,
			mimeType: 'text/plain',
			fileName: 'file.txt',
		});
	});

	it('should return `null` when the object is missing (HEAD 404)', async () => {
		objectStoreService.getMetadata.mockRejectedValueOnce(s3HeadNotFoundError);
		expect(await store.getMetadata('a/b/blob.json')).toBeNull();
	});
});

describe('copy', () => {
	it('should copy the bytes and preserved metadata to the target key', async () => {
		objectStoreService.get.mockResolvedValueOnce(body as unknown as Readable);
		objectStoreService.getMetadata.mockResolvedValueOnce({
			'content-type': 'text/plain',
			'x-amz-meta-filename': 'file.txt',
		});

		await store.copy('a/src.bin', 'a/dst.bin');

		expect(objectStoreService.get).toHaveBeenCalledWith('a/src.bin', { mode: 'buffer' });
		expect(objectStoreService.put).toHaveBeenCalledWith('a/dst.bin', body, {
			mimeType: 'text/plain',
			fileName: 'file.txt',
		});
	});
});

describe('rename', () => {
	it('should copy to the new key and delete the old one', async () => {
		objectStoreService.get.mockResolvedValueOnce(body as unknown as Readable);
		objectStoreService.getMetadata.mockResolvedValueOnce({});

		await store.rename('a/old.bin', 'a/new.bin');

		expect(objectStoreService.put).toHaveBeenCalledWith('a/new.bin', body, {});
		expect(objectStoreService.deleteOne).toHaveBeenCalledWith('a/old.bin');
	});

	it('should be a no-op when old and new keys match', async () => {
		await store.rename('a/same.bin', 'a/same.bin');

		expect(objectStoreService.put).not.toHaveBeenCalled();
		expect(objectStoreService.deleteOne).not.toHaveBeenCalled();
	});
});

describe('read', () => {
	it('should return the stored bytes', async () => {
		objectStoreService.get.mockResolvedValueOnce(body as unknown as Readable);
		expect(await store.read('a/b/blob.json')).toBe(body);
		expect(objectStoreService.get).toHaveBeenCalledWith('a/b/blob.json', { mode: 'buffer' });
	});

	it('should return `null` when the object is missing (NoSuchKey)', async () => {
		objectStoreService.get.mockRejectedValueOnce(s3NotFoundError);
		expect(await store.read('a/b/blob.json')).toBeNull();
	});

	it('should not treat a bucket-level failure (NoSuchBucket) as a missing object', async () => {
		objectStoreService.get.mockRejectedValueOnce(s3NoSuchBucketError);

		await expect(store.read('a/b/blob.json')).rejects.toBe(s3NoSuchBucketError);
	});

	it('should rethrow a systemic error (not a missing object)', async () => {
		objectStoreService.get.mockRejectedValueOnce(s3ThrottledError);

		await expect(store.read('a/b/blob.json')).rejects.toBe(s3ThrottledError);
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
