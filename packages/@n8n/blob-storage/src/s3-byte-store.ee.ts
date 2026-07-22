import { binaryToBuffer } from '@n8n/backend-network';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { Readable } from 'node:stream';

import type { ObjectStoreService } from './object-store/object-store.service.ee';
import { assertChunkSize } from './stream-utils';
import type { BlobMetadata, ByteStore, ByteStoreKey, PreWriteBlobMetadata } from './types';

export class S3ByteStore implements ByteStore {
	constructor(private readonly objectStore: ObjectStoreService) {}

	async write(key: ByteStoreKey, body: Buffer | Readable, metadata: PreWriteBlobMetadata = {}) {
		const buffer = Buffer.isBuffer(body) ? body : await binaryToBuffer(body);
		await this.objectStore.put(key, buffer, {
			...metadata,
			mimeType: metadata.mimeType ?? 'application/octet-stream',
		});
		return buffer.length;
	}

	async read(key: ByteStoreKey) {
		try {
			return await this.objectStore.get(key, { mode: 'buffer' });
		} catch (error) {
			if (this.isNoSuchKey(error)) return null;
			throw error;
		}
	}

	async readStream(key: ByteStoreKey, { chunkSize }: { chunkSize?: number } = {}) {
		if (chunkSize !== undefined) assertChunkSize(chunkSize);
		try {
			return await this.objectStore.get(key, { mode: 'stream', chunkSize });
		} catch (error) {
			if (this.isNoSuchKey(error)) return null;
			throw error;
		}
	}

	async copy(sourceKey: ByteStoreKey, targetKey: ByteStoreKey) {
		const buffer = await this.objectStore.get(sourceKey, { mode: 'buffer' });
		await this.objectStore.put(targetKey, buffer, await this.readNativeMetadata(sourceKey));
	}

	async rename(oldKey: ByteStoreKey, newKey: ByteStoreKey) {
		if (oldKey === newKey) return;
		await this.copy(oldKey, newKey);
		await this.objectStore.deleteOne(oldKey);
	}

	async delete(keys: ByteStoreKey[]): Promise<void> {
		if (keys.length === 0) return;
		await this.objectStore.deleteByKeys(keys);
	}

	async getMetadata(key: ByteStoreKey): Promise<BlobMetadata | null> {
		try {
			const headers = await this.objectStore.getMetadata(key);
			const metadata: BlobMetadata = { fileSize: Number(headers['content-length'] ?? 0) };
			if (headers['content-type']) metadata.mimeType = headers['content-type'];
			if (headers['x-amz-meta-filename']) metadata.fileName = headers['x-amz-meta-filename'];
			return metadata;
		} catch (error) {
			if (this.isHeadNotFound(error)) return null;
			throw error;
		}
	}

	// private methods

	private async readNativeMetadata(key: ByteStoreKey): Promise<PreWriteBlobMetadata> {
		const headers = await this.objectStore.getMetadata(key);
		const metadata: PreWriteBlobMetadata = {};
		if (headers['content-type']) metadata.mimeType = headers['content-type'];
		if (headers['x-amz-meta-filename']) metadata.fileName = headers['x-amz-meta-filename'];
		return metadata;
	}

	/** Missing object on a GET. Bucket-level failures surface as `NoSuchBucket` and rethrow. */
	private isNoSuchKey(error: unknown) {
		return this.errorName(error) === 'NoSuchKey';
	}

	/**
	 * Missing object on a HEAD, which carries no error code, so a 404 cannot be told apart
	 * from a missing bucket. Acceptable: bucket existence is verified at startup (`init`).
	 */
	private isHeadNotFound(error: unknown) {
		return this.errorName(error) === 'NotFound';
	}

	private errorName(error: unknown) {
		const original = ensureError(error).cause ?? error;
		if (typeof original !== 'object' || original === null) return undefined;
		return 'name' in original ? original.name : undefined;
	}
}
