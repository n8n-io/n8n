import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import { jsonParse, type VectorDocument, type VectorSearchResult } from 'n8n-workflow';

import { VectorStoreData } from '../entities';
import { dbType } from '../entities/abstract-entity';
import { generateNanoId } from '../utils/generators';

interface QueryResult {
	document: {
		content: string;
		metadata: Record<string, unknown>;
	};
	score: number;
}

interface QueryResultRow {
	content: string;
	score: number;
	metadata: Record<string, unknown> | string;
}

@Service()
export class VectorStoreDataRepository extends Repository<VectorStoreData> {
	constructor(
		dataSource: DataSource,
		private readonly databaseConfig: DatabaseConfig,
	) {
		super(VectorStoreData, dataSource.manager);
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

			entity.id = generateNanoId();
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
		if (dbType === 'postgresdb') {
			return await this.similaritySearchPostgres(memoryKey, projectId, queryEmbedding, k, filter);
		}

		if (dbType === 'sqlite') {
			return await this.similaritySearchSQLite(memoryKey, projectId, queryEmbedding, k, filter);
		}

		throw new Error(`Database type ${dbType} does not support vector similarity search`);
	}

	private async similaritySearchPostgres(
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

		// Build WHERE clause
		let whereClause = `${memoryKeyCol} = $1 AND ${projectIdCol} = $2`;
		const params: unknown[] = [memoryKey, projectId];
		let paramIndex = 3;

		if (filter) {
			for (const [key, value] of Object.entries(filter)) {
				whereClause += ` AND ${metadataCol}->>'${key}' = $${paramIndex}`;
				params.push(value);
				paramIndex++;
			}
		}

		// Use pgvector cosine distance operator
		const vectorString = `[${queryEmbedding.join(',')}]`;
		params.push(vectorString);

		const query = `
				SELECT ${contentCol} as content, ${metadataCol} as metadata,
					   1 - (${vectorCol} <=> $${paramIndex}::vector) as score
				FROM ${tableName}
				WHERE ${whereClause}
				ORDER BY ${vectorCol} <=> $${paramIndex}::vector
				LIMIT ${k}
			`;

		const results = await this.query(query, params);

		return (results as QueryResultRow[]).map((row) => this.transformRawQueryResult(row));
	}

	private async similaritySearchSQLite(
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

	private transformRawQueryResult(row: QueryResultRow): QueryResult {
		return {
			document: {
				content: row.content,
				metadata: typeof row.metadata === 'string' ? jsonParse(row.metadata) : row.metadata,
			},
			score: row.score,
		};
	}

	async getVectorCount(memoryKey: string, projectId: string): Promise<number> {
		return await this.countBy({ memoryKey, projectId });
	}

	async clearStore(memoryKey: string, projectId: string): Promise<void> {
		await this.delete({ memoryKey, projectId });
	}

	async deleteStore(memoryKey: string, projectId: string): Promise<void> {
		await this.clearStore(memoryKey, projectId);
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

		// For each fileName, add an OR condition to match it in the metadata JSON
		const orConditions = fileNames.map((_, index) => {
			const paramName = `fileName${index}`;
			if (this.manager.connection.options.type === 'postgres') {
				// PostgreSQL JSON query
				return `metadata->>'fileName' = :${paramName}`;
			} else {
				// SQLite JSON query
				return `json_extract(metadata, '$.fileName') = :${paramName}`;
			}
		});

		qb.andWhere(`(${orConditions.join(' OR ')})`, {
			...Object.fromEntries(fileNames.map((name, index) => [`fileName${index}`, name])),
		});

		const result = await qb.execute();
		return result.affected ?? 0;
	}

	async listStores(projectId: string): Promise<string[]> {
		const result = await this.createQueryBuilder('vectorStore')
			.select('DISTINCT vectorStore.memoryKey', 'memoryKey')
			.where('vectorStore.projectId = :projectId', { projectId })
			.getRawMany<{ memoryKey: string }>();

		return result.map((row) => row.memoryKey);
	}

	private serializeVector(vector: number[]): string | Buffer {
		if (dbType === 'postgresdb') {
			// pgvector expects string format
			return `[${vector.join(',')}]`;
		}

		// sqlite-vec expects binary buffer
		const buffer = Buffer.allocUnsafe(vector.length * 4);
		for (let i = 0; i < vector.length; i++) {
			buffer.writeFloatLE(vector[i], i * 4);
		}
		return buffer;
	}

	private getTableName(name: string): string {
		const { tablePrefix } = this.databaseConfig;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}

	private getColumnName(name: string): string {
		return this.manager.connection.driver.escape(name);
	}
}
