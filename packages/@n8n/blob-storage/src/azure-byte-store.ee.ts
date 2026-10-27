import { binaryToBuffer } from '@n8n/backend-network';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import chunk from 'lodash/chunk';
import type { Readable } from 'node:stream';

import type { AzureBlobService } from './azure-blob/azure-blob.service.ee';
import { assertChunkSize } from './stream-utils';
import type { BlobMetadata, ByteStore, ByteStoreKey, PreWriteBlobMetadata } from './types';

const MAX_DELETE_CONCURRENCY = 50;

export class AzureByteStore implements ByteStore {
	constructor(private readonly azureBlob: AzureBlobService) {}

	async write(key: ByteStoreKey, body: Buffer | Readable, metadata: PreWriteBlobMetadata = {}) {
		const buffer = Buffer.isBuffer(body) ? body : await binaryToBuffer(body);
		await this.azureBlob.put(key, buffer, {
			...metadata,
			mimeType: metadata.mimeType ?? 'application/octet-stream',
		});
		return buffer.length;
	}

	async read(key: ByteStoreKey): Promise<Buffer | null> {
		try {
			return await this.azureBlob.get(key, { mode: 'buffer' });
		} catch (error) {
			if (this.isNotFound(error)) return null;
			throw error;
		}
	}

	async readStream(key: ByteStoreKey, { chunkSize }: { chunkSize?: number } = {}) {
		if (chunkSize !== undefined) assertChunkSize(chunkSize);
		try {
			return await this.azureBlob.get(key, { mode: 'stream', chunkSize });
		} catch (error) {
			if (this.isNotFound(error)) return null;
			throw error;
		}
	}

	async copy(sourceKey: ByteStoreKey, targetKey: ByteStoreKey) {
		const buffer = await this.azureBlob.get(sourceKey, { mode: 'buffer' });
		const metadata = await this.azureBlob.getMetadata(sourceKey);
		await this.azureBlob.put(targetKey, buffer, metadata);
	}

	async rename(oldKey: ByteStoreKey, newKey: ByteStoreKey) {
		if (oldKey === newKey) return;
		await this.copy(oldKey, newKey);
		await this.azureBlob.delete(oldKey);
	}

	async delete(keys: ByteStoreKey[]): Promise<void> {
		for (const batch of chunk(keys, MAX_DELETE_CONCURRENCY)) {
			await Promise.all(batch.map(async (key) => await this.azureBlob.delete(key)));
		}
	}

	async getMetadata(key: ByteStoreKey): Promise<BlobMetadata | null> {
		try {
			return await this.azureBlob.getMetadata(key);
		} catch (error) {
			if (this.isNotFound(error)) return null;
			throw error;
		}
	}

	// private methods

	private isNotFound(error: unknown) {
		const original = ensureError(error).cause ?? error;
		if (typeof original !== 'object' || original === null) return false;
		const code = 'code' in original ? original.code : undefined;
		return code === 'BlobNotFound';
	}
}
