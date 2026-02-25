import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { VectorDocument, VectorSearchResult } from 'n8n-workflow';

import { VectorStoreDataPostgresRepository } from './vector-store-data-postgres.repository';
import { VectorStoreDataSqliteRepository } from './vector-store-data-sqlite.repository';
import { VectorStoreData } from '../../entities';
import { dbType } from '../../entities/abstract-entity';

/**
 * Concrete vector store data repository that delegates to database-specific implementations.
 * This follows the pattern used by other n8n repositories.
 */
@Service()
export class VectorStoreDataRepository extends Repository<VectorStoreData> {
	constructor(
		dataSource: DataSource,
		private readonly postgresRepository: VectorStoreDataPostgresRepository,
		private readonly sqliteRepository: VectorStoreDataSqliteRepository,
	) {
		super(VectorStoreData, dataSource.manager);
	}

	private getImpl(): VectorStoreDataPostgresRepository | VectorStoreDataSqliteRepository {
		if (dbType === 'postgresdb') {
			return this.postgresRepository;
		} else if (dbType === 'sqlite') {
			return this.sqliteRepository;
		} else {
			throw new Error(`Unsupported database type for vector store: ${dbType}`);
		}
	}

	async addVectors(
		memoryKey: string,
		projectId: string,
		documents: VectorDocument[],
		embeddings: number[][],
		clearStore?: boolean,
	): Promise<void> {
		return await this.getImpl().addVectors(memoryKey, projectId, documents, embeddings, clearStore);
	}

	async similaritySearch(
		memoryKey: string,
		projectId: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
		return await this.getImpl().similaritySearch(memoryKey, projectId, queryEmbedding, k, filter);
	}

	async getVectorCount(memoryKey: string, projectId: string): Promise<number> {
		return await this.getImpl().getVectorCount(memoryKey, projectId);
	}

	async clearStore(memoryKey: string, projectId: string): Promise<void> {
		return await this.getImpl().clearStore(memoryKey, projectId);
	}

	async deleteStore(memoryKey: string, projectId: string): Promise<void> {
		return await this.getImpl().deleteStore(memoryKey, projectId);
	}

	async deleteByFileNames(
		memoryKey: string,
		projectId: string,
		fileNames: string[],
	): Promise<number> {
		return await this.getImpl().deleteByFileNames(memoryKey, projectId, fileNames);
	}

	async listStores(projectId: string, filter?: string): Promise<string[]> {
		return await this.getImpl().listStores(projectId, filter);
	}

	async getTotalSize(): Promise<number> {
		return await this.getImpl().getTotalSize();
	}

	async init(): Promise<void> {
		return await this.getImpl().init?.();
	}

	async shutdown(): Promise<void> {
		return await this.getImpl().shutdown?.();
	}
}
