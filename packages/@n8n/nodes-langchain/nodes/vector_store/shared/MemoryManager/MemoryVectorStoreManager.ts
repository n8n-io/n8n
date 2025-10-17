import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { OpenAIEmbeddings, AzureOpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import type { Logger } from 'n8n-workflow';

import { getConfig, mbToBytes, hoursToMs } from './config';
import { MemoryCalculator } from './MemoryCalculator';
import { StoreCleanupService } from './StoreCleanupService';
import type { VectorStoreMetadata, VectorStoreStats } from './types';

/**
 * Manages in-memory vector stores with memory limits and auto-cleanup
 */
export class MemoryVectorStoreManager {
	private static instance: MemoryVectorStoreManager | null = null;

	// Storage
	protected vectorStoreBuffer: Map<string, MemoryVectorStore>;

	protected storeMetadata: Map<string, VectorStoreMetadata>;

	protected memoryUsageBytes: number = 0;

	// Dependencies
	protected memoryCalculator: MemoryCalculator;

	protected cleanupService: StoreCleanupService;

	protected static logger: Logger;

	// Config values
	protected maxMemorySizeBytes: number;

	protected inactiveTtlMs: number;

	// Inactive TTL cleanup timer
	protected ttlCleanupIntervalId: NodeJS.Timeout | null = null;

	protected constructor(
		protected embeddings: Embeddings | OpenAIEmbeddings | AzureOpenAIEmbeddings,
		protected logger: Logger,
	) {
		// Initialize storage
		this.vectorStoreBuffer = new Map();
		this.storeMetadata = new Map();
		this.logger = logger;

		const config = getConfig();
		this.maxMemorySizeBytes = mbToBytes(config.maxMemoryMB);
		this.inactiveTtlMs = hoursToMs(config.ttlHours);

		// Initialize services
		this.memoryCalculator = new MemoryCalculator();
		this.cleanupService = new StoreCleanupService(
			this.maxMemorySizeBytes,
			this.inactiveTtlMs,
			this.vectorStoreBuffer,
			this.storeMetadata,
			this.handleCleanup.bind(this),
		);

		this.setupTtlCleanup();
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(
		embeddings: Embeddings | OpenAIEmbeddings | AzureOpenAIEmbeddings,
		logger: Logger,
	): MemoryVectorStoreManager {
		if (!MemoryVectorStoreManager.instance) {
			MemoryVectorStoreManager.instance = new MemoryVectorStoreManager(embeddings, logger);
		} else {
			// We need to update the embeddings in the existing instance.
			// This is important as embeddings instance is wrapped in a logWrapper,
			// which relies on supplyDataFunctions context which changes on each workflow run
			MemoryVectorStoreManager.instance.embeddings = embeddings;
			MemoryVectorStoreManager.instance.vectorStoreBuffer.forEach((vectorStoreInstance) => {
				vectorStoreInstance.embeddings = embeddings;
			});
		}

		return MemoryVectorStoreManager.instance;
	}

	/**
	 * Set up timer for TTL-based cleanup
	 */
	private setupTtlCleanup(): void {
		// Skip setup if TTL is disabled
		if (this.inactiveTtlMs <= 0) {
			return;
		}

		// Cleanup check interval (run every hour)
		const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

		// Clear any existing interval
		if (this.ttlCleanupIntervalId) {
			clearInterval(this.ttlCleanupIntervalId);
		}

		// Setup new interval for TTL cleanup
		this.ttlCleanupIntervalId = setInterval(() => {
			this.cleanupService.cleanupInactiveStores();
		}, CLEANUP_INTERVAL_MS);
	}

	/**
	 * Handle cleanup events from the cleanup service
	 */
	private handleCleanup(removedKeys: string[], freedBytes: number, reason: 'ttl' | 'memory'): void {
		// Update total memory usage
		this.memoryUsageBytes -= freedBytes;

		// Log cleanup event
		if (reason === 'ttl') {
			const ttlHours = Math.round(this.inactiveTtlMs / (60 * 60 * 1000));
			this.logger.info(
				`TTL cleanup: removed ${removedKeys.length} inactive vector stores (${ttlHours}h TTL) to free ${Math.round(freedBytes / (1024 * 1024))}MB of memory`,
			);
		} else {
			this.logger.info(
				`Memory cleanup: removed ${removedKeys.length} oldest vector stores to free ${Math.round(freedBytes / (1024 * 1024))}MB of memory`,
			);
		}
	}

	getMemoryKeysList(): string[] {
		return Array.from(this.vectorStoreBuffer.keys());
	}

	/**
	 * Get or create a vector store by key
	 */
	async getVectorStore(memoryKey: string): Promise<MemoryVectorStore> {
		let vectorStoreInstance = this.vectorStoreBuffer.get(memoryKey);

		if (!vectorStoreInstance) {
			vectorStoreInstance = await MemoryVectorStore.fromExistingIndex(this.embeddings);
			this.vectorStoreBuffer.set(memoryKey, vectorStoreInstance);

			this.storeMetadata.set(memoryKey, {
				size: 0,
				createdAt: new Date(),
				lastAccessed: new Date(),
			});
		} else {
			const metadata = this.storeMetadata.get(memoryKey);
			if (metadata) {
				metadata.lastAccessed = new Date();
			}
		}

		return vectorStoreInstance;
	}

	/**
	 * Reset a store's metadata when it's cleared
	 */
	protected clearStoreMetadata(memoryKey: string): void {
		const metadata = this.storeMetadata.get(memoryKey);
		if (metadata) {
			this.memoryUsageBytes -= metadata.size;
			metadata.size = 0;
			metadata.lastAccessed = new Date();
		}
	}

	/**
	 * Get memory usage in bytes
	 */
	getMemoryUsage(): number {
		return this.memoryUsageBytes;
	}

	/**
	 * Get memory usage as a formatted string (MB)
	 */
	getMemoryUsageFormatted(): string {
		return `${Math.round(this.memoryUsageBytes / (1024 * 1024))}MB`;
	}

	/**
	 * Recalculate memory usage from actual vector store contents
	 * This ensures tracking accuracy for large stores
	 */
	recalculateMemoryUsage(): void {
		this.memoryUsageBytes = 0;

		// Recalculate for each store
		for (const [key, vectorStore] of this.vectorStoreBuffer.entries()) {
			const storeSize = this.memoryCalculator.calculateVectorStoreSize(vectorStore);

			// Update metadata
			const metadata = this.storeMetadata.get(key);
			if (metadata) {
				metadata.size = storeSize;
				this.memoryUsageBytes += storeSize;
			}
		}

		this.logger.debug(`Recalculated vector store memory: ${this.getMemoryUsageFormatted()}`);
	}

	/**
	 * Add documents to a vector store
	 */
	async addDocuments(
		memoryKey: string,
		documents: Document[],
		clearStore?: boolean,
	): Promise<void> {
		if (clearStore) {
			this.clearStoreMetadata(memoryKey);
			this.vectorStoreBuffer.delete(memoryKey);
		}

		// Fast batch estimation instead of per-document calculation
		const estimatedAddedSize = this.memoryCalculator.estimateBatchSize(documents);

		// Clean up old stores if necessary
		this.cleanupService.cleanupOldestStores(estimatedAddedSize);

		const vectorStoreInstance = await this.getVectorStore(memoryKey);

		// Get vector count before adding documents
		const vectorCountBefore = vectorStoreInstance.memoryVectors?.length || 0;

		await vectorStoreInstance.addDocuments(documents);

		// Update store metadata and memory tracking
		const metadata = this.storeMetadata.get(memoryKey);
		if (metadata) {
			metadata.size += estimatedAddedSize;
			metadata.lastAccessed = new Date();
			this.memoryUsageBytes += estimatedAddedSize;
		}

		// Get updated vector count
		const vectorCount = vectorStoreInstance.memoryVectors?.length || 0;

		// Periodically recalculate actual memory usage to avoid drift
		if (
			(vectorCount > 0 && vectorCount % 100 === 0) ||
			documents.length > 20 ||
			(vectorCountBefore === 0 && vectorCount > 0)
		) {
			this.recalculateMemoryUsage();
		}

		// Logging memory usage
		const maxMemoryMB =
			this.maxMemorySizeBytes > 0
				? (this.maxMemorySizeBytes / (1024 * 1024)).toFixed(0)
				: 'unlimited';

		this.logger.debug(
			`Vector store memory: ${this.getMemoryUsageFormatted()}/${maxMemoryMB}MB (${vectorCount} vectors in ${this.vectorStoreBuffer.size} stores)`,
		);
	}

	/**
	 * Get statistics about the vector store memory usage
	 */
	getStats(): VectorStoreStats {
		const now = Date.now();
		let inactiveStoreCount = 0;

		// Always recalculate when getting stats to ensure accuracy
		this.recalculateMemoryUsage();

		const stats: VectorStoreStats = {
			totalSizeBytes: this.memoryUsageBytes,
			totalSizeMB: Math.round((this.memoryUsageBytes / (1024 * 1024)) * 100) / 100,
			percentOfLimit:
				this.maxMemorySizeBytes > 0
					? Math.round((this.memoryUsageBytes / this.maxMemorySizeBytes) * 100)
					: 0,
			maxMemoryMB: this.maxMemorySizeBytes > 0 ? this.maxMemorySizeBytes / (1024 * 1024) : -1, // -1 indicates unlimited
			storeCount: this.vectorStoreBuffer.size,
			inactiveStoreCount: 0,
			ttlHours: this.inactiveTtlMs > 0 ? this.inactiveTtlMs / (60 * 60 * 1000) : -1, // -1 indicates disabled
			stores: {},
		};

		// Add stats for each store
		for (const [key, metadata] of this.storeMetadata.entries()) {
			const store = this.vectorStoreBuffer.get(key);

			if (store) {
				const lastAccessedTime = metadata.lastAccessed.getTime();
				const inactiveTimeMs = now - lastAccessedTime;
				const isInactive = this.cleanupService.isStoreInactive(metadata);

				if (isInactive) {
					inactiveStoreCount++;
				}

				stats.stores[key] = {
					sizeBytes: metadata.size,
					sizeMB: Math.round((metadata.size / (1024 * 1024)) * 100) / 100,
					percentOfTotal: Math.round((metadata.size / this.memoryUsageBytes) * 100) || 0,
					vectors: store.memoryVectors?.length || 0,
					createdAt: metadata.createdAt.toISOString(),
					lastAccessed: metadata.lastAccessed.toISOString(),
					inactive: isInactive,
					inactiveForHours: Math.round(inactiveTimeMs / (60 * 60 * 1000)),
				};
			}
		}

		stats.inactiveStoreCount = inactiveStoreCount;

		return stats;
	}
}
