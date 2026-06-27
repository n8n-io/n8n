import { Service } from '@n8n/di';
import { ObjectStoreService } from 'n8n-core/dist/binary-data/object-store/object-store.service.ee';
import { ensureError } from 'n8n-workflow';

import type { ByteStore, ByteStoreKey } from './types';

@Service()
export class S3ByteStore implements ByteStore {
	constructor(private readonly objectStore: ObjectStoreService) {}

	async write(key: ByteStoreKey, body: Buffer, contentType?: string) {
		await this.objectStore.put(key, body, { mimeType: contentType ?? 'application/octet-stream' });
		return body.length;
	}

	async read(key: ByteStoreKey) {
		try {
			return await this.objectStore.get(key, { mode: 'buffer' });
		} catch (error) {
			if (this.isNotFound(error)) return null;
			throw error;
		}
	}

	async delete(keys: ByteStoreKey[]): Promise<void> {
		if (keys.length === 0) return;
		await this.objectStore.deleteByKeys(keys);
	}

	// private methods

	private isNotFound(error: unknown) {
		const original = ensureError(error).cause ?? error;
		if (typeof original !== 'object' || original === null) return false;
		const name = 'name' in original ? original.name : undefined;
		return name === 'NoSuchKey' || name === 'NotFound';
	}
}
