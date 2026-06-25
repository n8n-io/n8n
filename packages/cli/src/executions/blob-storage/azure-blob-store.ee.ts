import { Service } from '@n8n/di';
import { AzureBlobService } from 'n8n-core/dist/binary-data/azure-blob/azure-blob.service.ee';
import { ensureError } from 'n8n-workflow';

import type { BlobStore, BlobStoreKey, BlobStoreWriteOptions } from './types';

@Service()
export class AzureBlobStore implements BlobStore {
	constructor(private readonly azureBlob: AzureBlobService) {}

	async write(
		key: BlobStoreKey,
		body: Buffer,
		{ mimeType }: BlobStoreWriteOptions = {},
	): Promise<number> {
		await this.azureBlob.put(key, body, { mimeType });
		return body.length;
	}

	async read(key: BlobStoreKey): Promise<Buffer | null> {
		try {
			return await this.azureBlob.get(key, { mode: 'buffer' });
		} catch (error) {
			if (this.isNotFound(error)) return null;
			throw error;
		}
	}

	async delete(key: BlobStoreKey | BlobStoreKey[]) {
		const keys = Array.isArray(key) ? key : [key];
		await Promise.all(keys.map(async (k) => await this.azureBlob.delete(k)));
	}

	private isNotFound(error: unknown) {
		const original = ensureError(error).cause ?? error;
		if (typeof original !== 'object' || original === null) return false;
		const code = 'code' in original ? original.code : undefined;
		return code === 'BlobNotFound';
	}
}
