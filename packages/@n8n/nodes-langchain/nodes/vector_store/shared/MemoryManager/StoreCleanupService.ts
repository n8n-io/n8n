import type { MemoryVectorStore } from 'langchain/vectorstores/memory';

import type { VectorStoreMetadata, IStoreCleanupService } from './types';

/**
 * Service for cleaning up vector stores based on inactivity or memory pressure
 */
export class StoreCleanupService implements IStoreCleanupService {
	// Cache for oldest stores sorted by creation time
	private oldestStoreKeys: string[] = [];

	private lastSortTime = 0;

	private readonly CACHE_TTL_MS = 5000; // 5 seconds

	constructor(
		private readonly maxMemorySizeBytes: number,
		private readonly inactiveTtlMs: number,
		private readonly vectorStores: Map<string, MemoryVectorStore>,
		private readonly storeMetadata: Map<string, VectorStoreMetadata>,
		private readonly onCleanup: (
			removedKeys: string[],
			freedBytes: number,
			reason: 'ttl' | 'memory',
		) => void,
	) {}

	/**
	 * Check if a store has been inactive for longer than the TTL
	 */
	isStoreInactive(metadata: VectorStoreMetadata): boolean {
		// If TTL is disabled, nothing is considered inactive
		if (this.inactiveTtlMs <= 0) {
			return false;
		}

		const now = Date.now();
		const lastAccessedTime = metadata.lastAccessed.getTime();
		return now - lastAccessedTime > this.inactiveTtlMs;
	}

	/**
	 * Remove vector stores that haven't been accessed for longer than TTL
	 */
	cleanupInactiveStores(): void {
		// Skip if TTL is disabled
		if (this.inactiveTtlMs <= 0) {
			return;
		}

		let freedBytes = 0;
		const removedStores: string[] = [];

		// Find and remove inactive stores
		for (const [key, metadata] of this.storeMetadata.entries()) {
			if (this.isStoreInactive(metadata)) {
				// Remove this inactive store
				this.vectorStores.delete(key);
				freedBytes += metadata.size;
				removedStores.push(key);
			}
		}

		// Remove from metadata after iteration to avoid concurrent modification
		for (const key of removedStores) {
			this.storeMetadata.delete(key);
		}

		// Invalidate cache if we removed any stores
		if (removedStores.length > 0) {
			this.oldestStoreKeys = [];
			this.onCleanup(removedStores, freedBytes, 'ttl');
		}
	}

	/**
	 * Remove the oldest vector stores to free up memory
	 */
	cleanupOldestStores(requiredBytes: number): void {
		// Skip if memory limit is disabled
		if (this.maxMemorySizeBytes <= 0) {
			return;
		}

		// Calculate current total memory usage
		let currentMemoryUsage = 0;
		for (const metadata of this.storeMetadata.values()) {
			currentMemoryUsage += metadata.size;
		}

		// First, try to clean up inactive stores
		this.cleanupInactiveStores();

		// Recalculate memory usage after inactive cleanup
		currentMemoryUsage = 0;
		for (const metadata of this.storeMetadata.values()) {
			currentMemoryUsage += metadata.size;
		}

		// If no more cleanup needed, return early
		if (currentMemoryUsage + requiredBytes <= this.maxMemorySizeBytes) {
			return;
		}

		const now = Date.now();

		// Reuse cached ordering if available and not stale
		if (this.oldestStoreKeys.length === 0 || now - this.lastSortTime > this.CACHE_TTL_MS) {
			// Collect and sort store keys by age
			const stores: Array<[string, number]> = [];

			for (const [key, metadata] of this.storeMetadata.entries()) {
				stores.push([key, metadata.createdAt.getTime()]);
			}

			// Sort by creation time (oldest first)
			stores.sort((a, b) => a[1] - b[1]);

			// Extract just the keys
			this.oldestStoreKeys = stores.map(([key]) => key);
			this.lastSortTime = now;
		}

		let freedBytes = 0;
		const removedStores: string[] = [];

		// Remove stores in order until we have enough space
		for (const key of this.oldestStoreKeys) {
			// Skip if store no longer exists
			if (!this.storeMetadata.has(key)) continue;

			// Stop if we've freed enough space
			if (currentMemoryUsage - freedBytes + requiredBytes <= this.maxMemorySizeBytes) {
				break;
			}

			const metadata = this.storeMetadata.get(key);
			if (metadata) {
				this.vectorStores.delete(key);
				freedBytes += metadata.size;
				removedStores.push(key);
			}
		}

		// Remove from metadata after iteration to avoid concurrent modification
		for (const key of removedStores) {
			this.storeMetadata.delete(key);
		}

		// Update our cache if we removed stores
		if (removedStores.length > 0) {
			// Filter out removed stores from cached keys
			this.oldestStoreKeys = this.oldestStoreKeys.filter((key) => !removedStores.includes(key));
			this.onCleanup(removedStores, freedBytes, 'memory');
		}
	}
}
