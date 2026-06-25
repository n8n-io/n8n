export type BlobStoreKey = string;

export interface BlobStoreWriteOptions {
	mimeType?: string;
}

export interface BlobStore {
	init?(): Promise<void>;
	write(key: BlobStoreKey, body: Buffer, options?: BlobStoreWriteOptions): Promise<number>;
	read(key: BlobStoreKey): Promise<Buffer | null>;
	delete(key: BlobStoreKey | BlobStoreKey[]): Promise<void>;
}
