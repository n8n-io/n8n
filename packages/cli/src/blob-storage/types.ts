export type StorageLocation = 'fs' | 's3' | 'az';

export type ByteStoreKey = string;

/** A raw byte store addressed by an opaque key. */
export interface ByteStore {
	init?(): Promise<void>;

	/** Returns the number of bytes written. */
	write(key: ByteStoreKey, body: Buffer, contentType?: string): Promise<number>;

	/** Returns `null` when no object exists for `key`. */
	read(key: ByteStoreKey): Promise<Buffer | null>;

	delete(keys: ByteStoreKey[]): Promise<void>;
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
