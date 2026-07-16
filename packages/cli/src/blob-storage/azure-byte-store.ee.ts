import { ensureError } from '@n8n/utils/errors/ensure-error';
import chunk from 'lodash/chunk';
import type { AzureBlobService } from 'n8n-core';

import type { ByteStore, ByteStoreKey } from './types';

const MAX_DELETE_CONCURRENCY = 50;

export class AzureByteStore implements ByteStore {
	constructor(private readonly azureBlob: AzureBlobService) {}

	async write(key: ByteStoreKey, body: Buffer, contentType?: string) {
		await this.azureBlob.put(key, body, { mimeType: contentType ?? 'application/octet-stream' });
		return body.length;
	}

	async read(key: ByteStoreKey): Promise<Buffer | null> {
		try {
			return await this.azureBlob.get(key, { mode: 'buffer' });
		} catch (error) {
			if (this.isNotFound(error)) return null;
			throw error;
		}
	}

	async delete(keys: ByteStoreKey[]): Promise<void> {
		for (const batch of chunk(keys, MAX_DELETE_CONCURRENCY)) {
			await Promise.all(batch.map(async (key) => await this.azureBlob.delete(key)));
		}
	}

	private isNotFound(error: unknown) {
		const original = ensureError(error).cause ?? error;
		if (typeof original !== 'object' || original === null) return false;
		const code = 'code' in original ? original.code : undefined;
		return code === 'BlobNotFound';
	}
}
