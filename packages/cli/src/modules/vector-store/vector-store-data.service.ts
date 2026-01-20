import { Logger } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { VectorDocument, VectorSearchResult } from '@n8n/db';
import { VectorStoreDataRepository } from '@n8n/db';
import { DataSource } from '@n8n/typeorm';

@Service()
export class VectorStoreDataService {
	private postgresHasVectorSupport: boolean = false;

	private sqliteHasVectorSupport: boolean = false;

	constructor(
		private readonly repository: VectorStoreDataRepository,
		private readonly logger: Logger,
		private readonly databaseConfig: DatabaseConfig,
		private readonly dataSource: DataSource,
	) {}

	/**
	 * Initialize the service and check for vector extension support
	 */
	async init() {
		const { type: dbType } = this.databaseConfig;

		this.logger.info('Initializing VectorStoreDataService', { dbType });

		if (dbType === 'postgresdb') {
			this.postgresHasVectorSupport = await this.checkPgvectorAvailability();
			if (this.postgresHasVectorSupport) {
				this.logger.info('pgvector extension is available for vector similarity search');
			} else {
				this.logger.warn(
					'pgvector extension is not available. Vector store persistence will use fallback mode with reduced performance.',
				);
			}
		} else if (dbType === 'sqlite') {
			// sqlite-vec is loaded via db-connection.ts
			// We assume it's available if the database is SQLite
			this.sqliteHasVectorSupport = true;
			this.logger.info('SQLite vector support enabled (using sqlite-vec extension)');
		}
	}

	/**
	 * Check if vector store persistence is available for the current database
	 */
	canUsePersistence(): boolean {
		const { type: dbType } = this.databaseConfig;

		if (dbType === 'sqlite') {
			return this.sqliteHasVectorSupport;
		}

		if (dbType === 'postgresdb') {
			// Allow persistence even without pgvector, using fallback mode
			return true;
		}

		// Other database types not supported
		return false;
	}

	/**
	 * Check if native vector similarity search is available
	 */
	hasNativeVectorSupport(): boolean {
		const { type: dbType } = this.databaseConfig;

		if (dbType === 'sqlite') {
			return this.sqliteHasVectorSupport;
		}

		if (dbType === 'postgresdb') {
			return this.postgresHasVectorSupport;
		}

		return false;
	}

	/**
	 * Add vectors to a memory store
	 */
	async addVectors(
		memoryKey: string,
		documents: VectorDocument[],
		embeddings: number[][],
		clearStore: boolean = false,
	): Promise<void> {
		await this.repository.addVectors(memoryKey, documents, embeddings, clearStore);
	}

	/**
	 * Perform similarity search on vectors
	 */
	async similaritySearch(
		memoryKey: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
		return await this.repository.similaritySearch(memoryKey, queryEmbedding, k, filter);
	}

	/**
	 * Get count of vectors for a memory key
	 */
	async getVectorCount(memoryKey: string): Promise<number> {
		return await this.repository.getVectorCount(memoryKey);
	}

	/**
	 * Clear all vectors for a memory key
	 */
	async clearStore(memoryKey: string): Promise<void> {
		await this.repository.clearStore(memoryKey);
	}

	/**
	 * Delete entire store (alias for clearStore)
	 */
	async deleteStore(memoryKey: string): Promise<void> {
		await this.repository.deleteStore(memoryKey);
	}

	/**
	 * List all unique memory keys
	 */
	async listStores(): Promise<string[]> {
		return await this.repository.listStores();
	}

	/**
	 * Check if pgvector extension is available in PostgreSQL
	 */
	private async checkPgvectorAvailability(): Promise<boolean> {
		try {
			// Check if extension is available
			const result = await this.dataSource.query(
				"SELECT * FROM pg_available_extensions WHERE name = 'vector'",
			);

			if (result.length === 0) {
				return false;
			}

			// Try to create extension (requires appropriate permissions)
			try {
				await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
				return true;
			} catch {
				// Extension exists but can't be created - check if it's already installed
				const installed = await this.dataSource.query(
					"SELECT * FROM pg_extension WHERE extname = 'vector'",
				);
				return installed.length > 0;
			}
		} catch {
			return false;
		}
	}
}
