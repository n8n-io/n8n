import { Logger } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { jsonParse, type VectorDocument, type VectorSearchResult } from 'n8n-workflow';

import { VectorStoreDataRepositoryBase } from './vector-store-data.repository.base';
import { VectorStoreData } from '../../entities';

interface QueryResultRow {
	content: string;
	score: number;
	metadata: Record<string, unknown> | string;
}

/**
 * SQLite-specific implementation of vector store repository.
 * Uses sqlite-vec extension for efficient similarity search.
 */
@Service()
export class VectorStoreDataSqliteRepository extends VectorStoreDataRepositoryBase {
	constructor(dataSource: DataSource, databaseConfig: DatabaseConfig, logger: Logger) {
		super(dataSource, databaseConfig, logger);
	}

	async addVectors(
		memoryKey: string,
		projectId: string,
		documents: VectorDocument[],
		embeddings: number[][],
		clearStore: boolean = false,
	): Promise<void> {
		if (clearStore) {
			await this.clearStore(memoryKey, projectId);
		}

		const entities = documents.map((document, i) => {
			const entity = new VectorStoreData();

			entity.id = this.generateId();
			entity.memoryKey = memoryKey;
			entity.projectId = projectId;
			entity.content = document.content;
			entity.metadata = document.metadata;
			entity.vector = this.serializeVector(embeddings[i]);

			return entity;
		});

		await this.save(entities);
	}

	async similaritySearch(
		memoryKey: string,
		projectId: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
		const tableName = this.getTableName('vector_store_data');
		const memoryKeyCol = this.getColumnName('memoryKey');
		const projectIdCol = this.getColumnName('projectId');
		const vectorCol = this.getColumnName('vector');
		const contentCol = this.getColumnName('content');
		const metadataCol = this.getColumnName('metadata');

		// Serialize query vector for sqlite-vec
		const queryVectorBlob = this.serializeVector(queryEmbedding);

		// Build WHERE clause
		let whereClause = `${memoryKeyCol} = ? AND ${projectIdCol} = ?`;
		const whereParams: unknown[] = [memoryKey, projectId];

		if (filter) {
			for (const [key, value] of Object.entries(filter)) {
				whereClause += ` AND json_extract(${metadataCol}, '$.${key}') = ?`;
				whereParams.push(value);
			}
		}

		const query = `
				SELECT ${contentCol} as content, ${metadataCol} as metadata,
					   1 - vec_distance_cosine(${vectorCol}, ?) as score
				FROM ${tableName}
				WHERE ${whereClause}
				ORDER BY vec_distance_cosine(${vectorCol}, ?)
				LIMIT ${k}
			`;

		// Parameters must be in the order they appear in the query:
		// 1. First ? in SELECT vec_distance_cosine -> queryVectorBlob
		// 2. WHERE clause parameters -> memoryKey, projectId (and filter values)
		// 3. Second ? in ORDER BY vec_distance_cosine -> queryVectorBlob
		const results = await this.query(query, [queryVectorBlob, ...whereParams, queryVectorBlob]);

		return (results as QueryResultRow[]).map((row) => this.transformRawQueryResult(row));
	}

	private transformRawQueryResult(row: QueryResultRow): VectorSearchResult {
		return {
			document: {
				content: row.content,
				metadata: typeof row.metadata === 'string' ? jsonParse(row.metadata) : row.metadata,
			},
			score: row.score,
		};
	}

	async getTotalSize(): Promise<number> {
		const tableName = this.getTableName('vector_store_data');
		const contentCol = this.getColumnName('content');
		const metadataCol = this.getColumnName('metadata');
		const vectorCol = this.getColumnName('vector');

		// SQLite: use LENGTH for all types
		const query = `
			SELECT
				COALESCE(SUM(LENGTH(${contentCol})), 0) +
				COALESCE(SUM(LENGTH(${metadataCol})), 0) +
				COALESCE(SUM(LENGTH(${vectorCol})), 0) as total_size
			FROM ${tableName}
		`;

		const result = await this.query(query);
		return Number(result[0]?.total_size ?? 0);
	}

	async deleteByFileNames(
		memoryKey: string,
		projectId: string,
		fileNames: string[],
	): Promise<number> {
		if (fileNames.length === 0) {
			return 0;
		}

		const qb = this.createQueryBuilder('vectorStore')
			.delete()
			.where('memoryKey = :memoryKey AND projectId = :projectId', {
				memoryKey,
				projectId,
			});

		const orConditions = fileNames.map((_, index) => {
			const paramName = `fileName${index}`;
			return `json_extract(metadata, '$.fileName') = :${paramName}`;
		});

		qb.andWhere(`(${orConditions.join(' OR ')})`, {
			...Object.fromEntries(fileNames.map((name, index) => [`fileName${index}`, name])),
		});

		const result = await qb.execute();
		return result.affected ?? 0;
	}

	async listStores(projectId: string, filter?: string): Promise<string[]> {
		const qb = this.createQueryBuilder('vectorStore')
			.select('DISTINCT vectorStore.memoryKey', 'memoryKey')
			.where('vectorStore.projectId = :projectId', { projectId });

		if (filter) {
			qb.andWhere('vectorStore.memoryKey LIKE :filter', { filter: `%${filter}%` });
		}

		const result = await qb.getRawMany<{ memoryKey: string }>();
		return result.map((row) => row.memoryKey);
	}

	private serializeVector(vector: number[]): Buffer {
		// Store as binary buffer (Float32Array) for SQLite blob
		const buffer = Buffer.allocUnsafe(vector.length * 4);
		for (let i = 0; i < vector.length; i++) {
			buffer.writeFloatLE(vector[i], i * 4);
		}
		return buffer;
	}
}
