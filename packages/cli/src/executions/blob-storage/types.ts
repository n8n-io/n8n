import type { EntityManager } from '@n8n/db';

export type BlobStoreKey = string;

export interface BlobStoreWriteOptions {
	mimeType?: string;
	tx?: EntityManager;
}

export interface BlobStoreReadOptions {
	tx?: EntityManager;
}

export interface BlobStore {
	init?(): Promise<void>;
	write(key: BlobStoreKey, body: Buffer, options?: BlobStoreWriteOptions): Promise<number>;
	read(key: BlobStoreKey, options?: BlobStoreReadOptions): Promise<Buffer | null>;
	readMany?(keys: BlobStoreKey[]): Promise<Map<BlobStoreKey, Buffer>>;
	getByteSize?(key: BlobStoreKey, options?: BlobStoreReadOptions): Promise<number | null>;
	delete(key: BlobStoreKey | BlobStoreKey[]): Promise<void>;
}
