import type { Readable } from 'node:stream';

/** Metadata stored alongside a blob. */
export type BlobMetadata = {
	fileName?: string;
	mimeType?: string;
	fileSize: number;
};

/** Caller-supplied metadata for a blob write, before its size is known. */
export type PreWriteBlobMetadata = Omit<BlobMetadata, 'fileSize'>;

export type StorageLocation = 'fs' | 's3' | 'az';

export type ByteStoreKey = string;

/** A raw byte store addressed by an opaque key. */
export interface ByteStore {
	init?(): Promise<void>;

	/** Returns the number of bytes written. `metadata` is stored natively where supported, `fs` ignores it. */
	write(
		key: ByteStoreKey,
		body: Buffer | Readable,
		metadata?: PreWriteBlobMetadata,
	): Promise<number>;

	/** Returns `null` when no object exists for `key`. */
	read(key: ByteStoreKey): Promise<Buffer | null>;

	/** Returns `null` when no object exists. `chunkSize` (positive integer) fixes the emitted chunk size (final chunk may be smaller). */
	readStream(key: ByteStoreKey, opts?: { chunkSize?: number }): Promise<Readable | null>;

	/** Preserves native metadata where supported. */
	copy(sourceKey: ByteStoreKey, targetKey: ByteStoreKey): Promise<void>;

	/** Preserves native metadata where supported. Same-key rename is a no-op, even for a missing source. */
	rename(oldKey: ByteStoreKey, newKey: ByteStoreKey): Promise<void>;

	delete(keys: ByteStoreKey[]): Promise<void>;

	/** `null` when no object exists. Absent on `fs`, where the domain layer keeps companion `.metadata` entries. */
	getMetadata?(key: ByteStoreKey): Promise<BlobMetadata | null>;

	/** Absolute filesystem path for `key`. Only present on backends addressed by path (fs). */
	getAbsolutePath?(key: ByteStoreKey): string;

	/** Recursively deletes under `prefix`. Absent where the backend can't list or delegates bulk deletion (e.g. lifecycle policies). */
	deletePrefix?(prefix: string): Promise<void>;
}

/** A stored JSON entry. */
export type JsonEntry<Payload extends object> = Payload & { version: number };

/** A stored JSON entry identifier. */
export type Stored<Ref> = Ref & { storedAt: StorageLocation };

/** Per-domain configuration for a {@link JsonStore}. */
export interface JsonStoreOptions<Ref> {
	/** Byte store per location. `fs` is always present. Externals e.g. `s3` and `az` are registered when configured. */
	byteStores: Partial<Record<StorageLocation, ByteStore>>;

	/** Schema version stamped on write and verified on read. */
	version: number;

	/** Maps a ref to the byte-store key (path) where the entry is stored at. */
	key: (ref: Ref) => string;

	/** Identity used to key `readMany` results. */
	getId: (ref: Ref) => string;

	/** Wraps a write failure as a domain error. */
	createWriteError: (ref: Ref, cause: unknown) => Error;

	/** Wraps an unparseable or version-mismatched entry as a domain error. */
	createCorruptedError: (ref: Ref, cause: unknown) => Error;

	/** Reports a non-fatal error, e.g. a skipped delete. */
	reportError: (error: unknown) => void;
}
