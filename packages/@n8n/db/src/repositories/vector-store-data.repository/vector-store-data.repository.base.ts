import type { Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import type { DataSource } from '@n8n/typeorm';
import { Repository } from '@n8n/typeorm';
import type { VectorDocument, VectorSearchResult } from 'n8n-workflow';

import { VectorStoreData } from '../../entities';
import { generateNanoId } from '../../utils/generators';

/**
 * Abstract base repository for vector store operations.
 * Database-specific implementations should extend this class.
 */
export abstract class VectorStoreDataRepositoryBase extends Repository<VectorStoreData> {
	constructor(
		dataSource: DataSource,
		protected readonly databaseConfig: DatabaseConfig,
		protected readonly logger: Logger,
	) {
		super(VectorStoreData, dataSource.manager);
	}

	/**
	 * Add vectors to the store
	 */
	abstract addVectors(
		memoryKey: string,
		projectId: string,
		documents: VectorDocument[],
		embeddings: number[][],
		clearStore?: boolean,
	): Promise<void>;

	/**
	 * Perform similarity search
	 */
	abstract similaritySearch(
		memoryKey: string,
		projectId: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]>;

	/**
	 * Optional: Initialize repository (e.g., upgrade to pgvector for PostgreSQL)
	 */
	async init?(): Promise<void> {
		// Default: no-op for databases that don't need initialization
	}

	/**
	 * Optional: Cleanup resources on shutdown
	 */
	async shutdown?(): Promise<void> {
		// Default: no-op
	}

	/**
	 * Get count of vectors for a memory key
	 */
	async getVectorCount(memoryKey: string, projectId: string): Promise<number> {
		return await this.countBy({ memoryKey, projectId });
	}

	/**
	 * Clear all vectors for a memory key
	 */
	async clearStore(memoryKey: string, projectId: string): Promise<void> {
		await this.delete({ memoryKey, projectId });
	}

	/**
	 * Delete entire store (alias for clearStore)
	 */
	async deleteStore(memoryKey: string, projectId: string): Promise<void> {
		await this.clearStore(memoryKey, projectId);
	}

	/**
	 * Delete vectors by file names in metadata
	 */
	abstract deleteByFileNames(
		memoryKey: string,
		projectId: string,
		fileNames: string[],
	): Promise<number>;

	/**
	 * List all memory keys for a project
	 */
	abstract listStores(projectId: string, filter?: string): Promise<string[]>;

	/**
	 * Get total size of all vectors (instance-wide)
	 */
	abstract getTotalSize(): Promise<number>;

	/**
	 * Helper: Generate unique ID
	 */
	protected generateId(): string {
		return generateNanoId();
	}

	/**
	 * Helper: Get escaped table name with prefix
	 */
	protected getTableName(name: string): string {
		const { tablePrefix } = this.databaseConfig;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}

	/**
	 * Helper: Get escaped column name
	 */
	protected getColumnName(name: string): string {
		return this.manager.connection.driver.escape(name);
	}
}
