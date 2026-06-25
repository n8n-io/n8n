import { Service } from '@n8n/di';
import { ObjectStoreService } from 'n8n-core/dist/binary-data/object-store/object-store.service.ee';
import { ensureError } from 'n8n-workflow';

import type { BlobStore, BlobStoreKey, BlobStoreWriteOptions } from './types';

@Service()
export class S3BlobStore implements BlobStore {
	constructor(private readonly objectStore: ObjectStoreService) {}

	async write(
		key: BlobStoreKey,
		body: Buffer,
		{ mimeType }: BlobStoreWriteOptions = {},
	): Promise<number> {
		await this.objectStore.put(key, body, { mimeType });
		return body.length;
	}

	async read(key: BlobStoreKey): Promise<Buffer | null> {
		try {
			return await this.objectStore.get(key, { mode: 'buffer' });
		} catch (error) {
			if (this.isNotFound(error)) return null;
			throw error;
		}
	}

	async delete(key: BlobStoreKey | BlobStoreKey[]) {
		const keys = Array.isArray(key) ? key : [key];
		await this.objectStore.deleteByKeys(keys);
	}

	private isNotFound(error: unknown) {
		const original = ensureError(error).cause ?? error;
		if (typeof original !== 'object' || original === null) return false;
		const name = 'name' in original ? original.name : undefined;
		return name === 'NoSuchKey' || name === 'NotFound';
	}
}
