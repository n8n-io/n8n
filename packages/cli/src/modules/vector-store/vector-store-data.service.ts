import { Logger } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { VectorStoreDataRepository, SharedWorkflowRepository } from '@n8n/db';
import { DataSource } from '@n8n/typeorm';
import type { IVectorStoreDataService, VectorDocument, VectorSearchResult } from 'n8n-workflow';

@Service()
export class VectorStoreDataService implements IVectorStoreDataService {
	private postgresHasVectorSupport: boolean = false;

	private sqliteHasVectorSupport: boolean = false;

	constructor(
		private readonly repository: VectorStoreDataRepository,
		private readonly logger: Logger,
		private readonly databaseConfig: DatabaseConfig,
		private readonly dataSource: DataSource,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
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
			return this.postgresHasVectorSupport;
		}

		// Other database types not supported
		return false;
	}

	/**
	 * Resolve projectId from workflowId
	 */
	private async resolveProjectId(workflowId: string): Promise<string> {
		const sharedWorkflow = await this.sharedWorkflowRepository.findOne({
			select: ['projectId'],
			where: { workflowId },
		});

		if (!sharedWorkflow?.projectId) {
			throw new Error(
				`Could not find projectId for workflowId ${workflowId}. This execution may not be associated with a project.`,
			);
		}

		return sharedWorkflow.projectId;
	}

	/**
	 * Add vectors to a memory store
	 */
	async addVectors(
		memoryKey: string,
		workflowId: string,
		documents: VectorDocument[],
		embeddings: number[][],
		clearStore: boolean = false,
	): Promise<void> {
		const projectId = await this.resolveProjectId(workflowId);
		await this.repository.addVectors(memoryKey, projectId, documents, embeddings, clearStore);
	}

	/**
	 * Perform similarity search on vectors
	 */
	async similaritySearch(
		memoryKey: string,
		workflowId: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
		const projectId = await this.resolveProjectId(workflowId);
		return await this.repository.similaritySearch(memoryKey, projectId, queryEmbedding, k, filter);
	}

	/**
	 * Get count of vectors for a memory key
	 */
	async getVectorCount(memoryKey: string, workflowId: string): Promise<number> {
		const projectId = await this.resolveProjectId(workflowId);
		return await this.repository.getVectorCount(memoryKey, projectId);
	}

	/**
	 * Clear all vectors for a memory key
	 */
	async clearStore(memoryKey: string, workflowId: string): Promise<void> {
		const projectId = await this.resolveProjectId(workflowId);
		await this.repository.clearStore(memoryKey, projectId);
	}

	/**
	 * Delete entire store (alias for clearStore)
	 */
	async deleteStore(memoryKey: string, workflowId: string): Promise<void> {
		const projectId = await this.resolveProjectId(workflowId);
		await this.repository.deleteStore(memoryKey, projectId);
	}

	/**
	 * List all unique memory keys for a project
	 */
	async listStores(workflowId: string): Promise<string[]> {
		const projectId = await this.resolveProjectId(workflowId);
		return await this.repository.listStores(projectId);
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
