/* eslint-disable @typescript-eslint/unbound-method */

import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import type { AzureBlobService } from '../azure-blob/azure-blob.service.ee';
import { AzureByteStore } from '../azure-byte-store.ee';
import { azureNotFoundError, azureThrottledError, body } from './mocks';

let azureBlob: ReturnType<typeof mock<AzureBlobService>>;
let store: AzureByteStore;

beforeEach(() => {
	azureBlob = mock<AzureBlobService>();
	store = new AzureByteStore(azureBlob);
});

describe('write', () => {
	it('should put the bytes at the key and return the byte count', async () => {
		const bytes = await store.write('a/b/blob.json', body, { mimeType: 'application/json' });
		expect(azureBlob.put).toHaveBeenCalledWith('a/b/blob.json', body, {
			mimeType: 'application/json',
		});
		expect(bytes).toBe(body.length);
	});

	it('should default to a binary content type', async () => {
		await store.write('a/b/blob.bin', body);
		expect(azureBlob.put).toHaveBeenCalledWith('a/b/blob.bin', body, {
			mimeType: 'application/octet-stream',
		});
	});

	it('should forward native metadata', async () => {
		await store.write('a/b/blob.bin', body, { fileName: 'file.txt', mimeType: 'text/plain' });
		expect(azureBlob.put).toHaveBeenCalledWith('a/b/blob.bin', body, {
			fileName: 'file.txt',
			mimeType: 'text/plain',
		});
	});

	it('should buffer a stream before uploading and return the byte count', async () => {
		const bytes = await store.write('a/b/blob.bin', Readable.from(body));
		expect(azureBlob.put).toHaveBeenCalledWith('a/b/blob.bin', body, {
			mimeType: 'application/octet-stream',
		});
		expect(bytes).toBe(body.length);
	});
});

describe('readStream', () => {
	it('should return the stored stream, forwarding chunkSize', async () => {
		const stream = Readable.from(body);
		azureBlob.get.mockResolvedValueOnce(stream);

		expect(await store.readStream('a/b/blob.json', { chunkSize: 5 })).toBe(stream);
		expect(azureBlob.get).toHaveBeenCalledWith('a/b/blob.json', { mode: 'stream', chunkSize: 5 });
	});

	it('should return `null` when the blob is missing', async () => {
		azureBlob.get.mockRejectedValueOnce(azureNotFoundError);
		expect(await store.readStream('a/b/blob.json')).toBeNull();
	});

	it('should rethrow a systemic error', async () => {
		azureBlob.get.mockRejectedValueOnce(azureThrottledError);
		await expect(store.readStream('a/b/blob.json')).rejects.toBe(azureThrottledError);
	});

	it('should reject a fractional chunkSize before downloading', async () => {
		await expect(store.readStream('a/b/blob.json', { chunkSize: 1.5 })).rejects.toThrow(
			'positive integer',
		);
		expect(azureBlob.get).not.toHaveBeenCalled();
	});
});

describe('getMetadata', () => {
	it('should return the native metadata', async () => {
		const metadata = { fileSize: 11, mimeType: 'text/plain', fileName: 'file.txt' };
		azureBlob.getMetadata.mockResolvedValueOnce(metadata);

		expect(await store.getMetadata('a/b/blob.json')).toEqual(metadata);
	});

	it('should return `null` when the blob is missing', async () => {
		azureBlob.getMetadata.mockRejectedValueOnce(azureNotFoundError);
		expect(await store.getMetadata('a/b/blob.json')).toBeNull();
	});
});

describe('copy', () => {
	it('should copy the bytes and preserved metadata to the target key', async () => {
		azureBlob.get.mockResolvedValueOnce(body as unknown as Readable);
		const metadata = { fileSize: 11, mimeType: 'text/plain', fileName: 'file.txt' };
		azureBlob.getMetadata.mockResolvedValueOnce(metadata);

		await store.copy('a/src.bin', 'a/dst.bin');

		expect(azureBlob.get).toHaveBeenCalledWith('a/src.bin', { mode: 'buffer' });
		expect(azureBlob.put).toHaveBeenCalledWith('a/dst.bin', body, metadata);
	});
});

describe('rename', () => {
	it('should copy to the new key and delete the old one', async () => {
		azureBlob.get.mockResolvedValueOnce(body as unknown as Readable);
		azureBlob.getMetadata.mockResolvedValueOnce({ fileSize: 11 });

		await store.rename('a/old.bin', 'a/new.bin');

		expect(azureBlob.put).toHaveBeenCalledWith('a/new.bin', body, { fileSize: 11 });
		expect(azureBlob.delete).toHaveBeenCalledWith('a/old.bin');
	});

	it('should be a no-op when old and new keys match', async () => {
		await store.rename('a/same.bin', 'a/same.bin');

		expect(azureBlob.put).not.toHaveBeenCalled();
		expect(azureBlob.delete).not.toHaveBeenCalled();
	});
});

describe('read', () => {
	it('should return the stored bytes', async () => {
		azureBlob.get.mockResolvedValueOnce(body as unknown as Readable);

		expect(await store.read('a/b/blob.json')).toBe(body);
		expect(azureBlob.get).toHaveBeenCalledWith('a/b/blob.json', { mode: 'buffer' });
	});

	it('should return `null` when the blob is missing', async () => {
		azureBlob.get.mockRejectedValueOnce(azureNotFoundError);
		expect(await store.read('a/b/blob.json')).toBeNull();
	});

	it('should rethrow a systemic error', async () => {
		azureBlob.get.mockRejectedValueOnce(azureThrottledError);
		await expect(store.read('a/b/blob.json')).rejects.toBe(azureThrottledError);
	});
});

describe('delete', () => {
	it('should delete the blobs for the given keys', async () => {
		await store.delete(['a/one.json', 'a/two.json']);

		expect(azureBlob.delete).toHaveBeenCalledTimes(2);
		expect(azureBlob.delete).toHaveBeenCalledWith('a/one.json');
		expect(azureBlob.delete).toHaveBeenCalledWith('a/two.json');
	});

	it('should delete in batches to cap concurrent requests', async () => {
		const keys = Array.from({ length: 120 }, (_, i) => `a/${i}.json`);
		const concurrent: number[] = [];
		let inFlight = 0;
		azureBlob.delete.mockImplementation(async () => {
			inFlight++;
			concurrent.push(inFlight);
			await new Promise((resolve) => setImmediate(resolve));
			inFlight--;
		});

		await store.delete(keys);

		expect(azureBlob.delete).toHaveBeenCalledTimes(120);
		expect(Math.max(...concurrent)).toBeLessThanOrEqual(50);
	});
});
