import type { Document } from '@langchain/core/documents';
import type { MemoryVectorStore } from 'langchain/vectorstores/memory';

/**
 * Configuration options for the memory vector store
 */
export interface MemoryVectorStoreConfig {
	/**
	 * Maximum memory size in MB, -1 to disable
	 */
	maxMemoryMB: number;

	/**
	 * TTL for inactive stores in hours, -1 to disable
	 */
	ttlHours: number;
}

/**
 * Vector store metadata for tracking usage
 */
export interface VectorStoreMetadata {
	size: number;
	createdAt: Date;
	lastAccessed: Date;
}

/**
 * Per-store statistics for reporting
 */
export interface StoreStats {
	sizeBytes: number;
	sizeMB: number;
	percentOfTotal: number;
	vectors: number;
	createdAt: string;
	lastAccessed: string;
	inactive?: boolean;
	inactiveForHours?: number;
}

/**
 * Overall vector store statistics
 */
export interface VectorStoreStats {
	totalSizeBytes: number;
	totalSizeMB: number;
	percentOfLimit: number;
	maxMemoryMB: number;
	storeCount: number;
	inactiveStoreCount: number;
	ttlHours: number;
	stores: Record<string, StoreStats>;
}

/**
 * Service for calculating memory usage
 */
export interface IMemoryCalculator {
	estimateBatchSize(documents: Document[]): number;
	calculateVectorStoreSize(vectorStore: MemoryVectorStore): number;
}

/**
 * Service for cleaning up vector stores
 */
export interface IStoreCleanupService {
	cleanupInactiveStores(): void;
	cleanupOldestStores(requiredBytes: number): void;
}
