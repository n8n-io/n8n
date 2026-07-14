/* eslint-disable @typescript-eslint/unbound-method */

import type { AzureBlobService } from 'n8n-core';
import type { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

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
		const bytes = await store.write('a/b/blob.json', body, 'application/json');
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
