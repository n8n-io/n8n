import type { ContextCacheMetadata } from '../context-cache-metadata';

export type ContextCacheMetadataTtlOptions = {
	ttlSeconds: number;
};

/**
 * Persists {@link ContextCacheMetadata} per config hash (e.g. Redis key = prefix + hash).
 */
export interface ContextCacheMetadataStorage {
	read(hash: string): Promise<ContextCacheMetadata | null>;
	write(
		hash: string,
		metadata: ContextCacheMetadata,
		options: ContextCacheMetadataTtlOptions,
	): Promise<void>;
	/**
	 * Writes only if no value is present (`SET NX`). Returns whether this call installed the value.
	 */
	writeIfAbsent(
		hash: string,
		metadata: ContextCacheMetadata,
		options: ContextCacheMetadataTtlOptions,
	): Promise<boolean>;
	delete(hash: string): Promise<void>;
}
