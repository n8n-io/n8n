import { Logger } from '@n8n/backend-common';
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
		private readonly logger: Logger,
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

		// Fetch all matching vectors to calculate similarity in JavaScript
		const query = `
				SELECT ${contentCol} as content, ${metadataCol} as metadata, ${vectorCol} as vector
				FROM ${tableName}
				WHERE ${whereClause}
			`;

		// Track query time
		const queryStartTime = performance.now();
		const memBefore = process.memoryUsage();

		const results = await this.query(query, params);

		const queryTime = performance.now() - queryStartTime;
		const vectorCount = results.length;

		this.logger.info('Vector similarity search - query completed', {
			memoryKey,
			projectId,
			vectorCount,
			queryTimeMs: queryTime.toFixed(2),
			requestedK: k,
		});

		// Calculate cosine similarity for each result
		const calcStartTime = performance.now();

		const resultsWithScores = (results as Array<QueryResultRow & { vector: Buffer }>).map((row) => {
			const vectorBuffer = row.vector;
			const vectorArray = this.deserializeVector(vectorBuffer);
			const score = this.cosineSimilarity(queryEmbedding, vectorArray);

			return {
				content: row.content,
				metadata: row.metadata,
				score,
			};
		});

		const calcTime = performance.now() - calcStartTime;
		const memAfter = process.memoryUsage();

		// Sort by score descending and take top k
		const sortStartTime = performance.now();
		resultsWithScores.sort((a, b) => b.score - a.score);
		const topK = resultsWithScores.slice(0, k);
		const sortTime = performance.now() - sortStartTime;

		const totalTime = performance.now() - queryStartTime;
		const memDelta = {
			heapUsed: ((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2),
			external: ((memAfter.external - memBefore.external) / 1024 / 1024).toFixed(2),
		};

		this.logger.info('Vector similarity search - calculation completed', {
			memoryKey,
			projectId,
			vectorCount,
			returnedK: topK.length,
			timings: {
				queryMs: queryTime.toFixed(2),
				calculationMs: calcTime.toFixed(2),
				sortMs: sortTime.toFixed(2),
				totalMs: totalTime.toFixed(2),
				avgPerVectorMs: vectorCount > 0 ? (calcTime / vectorCount).toFixed(3) : '0',
			},
			memory: {
				heapUsedDeltaMB: memDelta.heapUsed,
				externalDeltaMB: memDelta.external,
				heapUsedMB: (memAfter.heapUsed / 1024 / 1024).toFixed(2),
				heapTotalMB: (memAfter.heapTotal / 1024 / 1024).toFixed(2),
			},
		});

		return topK.map((row) => this.transformRawQueryResult(row));
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

	async listStores(projectId: string, filter?: string): Promise<string[]> {
		const qb = this.createQueryBuilder('vectorStore')
			.select('DISTINCT vectorStore.memoryKey', 'memoryKey')
			.where('vectorStore.projectId = :projectId', { projectId });

		if (filter) {
			// Filter memory keys that contain the filter string (case-insensitive)
			if (this.manager.connection.options.type === 'postgres') {
				qb.andWhere('vectorStore.memoryKey ILIKE :filter', { filter: `%${filter}%` });
			} else {
				// SQLite uses LIKE for case-insensitive search by default
				qb.andWhere('vectorStore.memoryKey LIKE :filter', { filter: `%${filter}%` });
			}
		}

		const result = await qb.getRawMany<{ memoryKey: string }>();

		return result.map((row) => row.memoryKey);
	}

	/**
	 * Get the total size of all vectors in bytes (instance-wide)
	 */
	async getTotalSize(): Promise<number> {
		const tableName = this.getTableName('vector_store_data');
		const contentCol = this.getColumnName('content');
		const metadataCol = this.getColumnName('metadata');
		const vectorCol = this.getColumnName('vector');

		let query: string;
		if (dbType === 'postgresdb') {
			// PostgreSQL: use OCTET_LENGTH for text, pg_column_size for JSONB, LENGTH for bytea
			query = `
				SELECT
					COALESCE(SUM(OCTET_LENGTH(${contentCol})), 0) +
					COALESCE(SUM(pg_column_size(${metadataCol})), 0) +
					COALESCE(SUM(LENGTH(${vectorCol})), 0) as total_size
				FROM ${tableName}
			`;
		} else {
			// SQLite: use LENGTH for all types
			query = `
				SELECT
					COALESCE(SUM(LENGTH(${contentCol})), 0) +
					COALESCE(SUM(LENGTH(${metadataCol})), 0) +
					COALESCE(SUM(LENGTH(${vectorCol})), 0) as total_size
				FROM ${tableName}
			`;
		}

		const result = await this.query(query);
		return Number(result[0]?.total_size ?? 0);
	}

	private serializeVector(vector: number[]): Buffer {
		// Store as binary buffer (Float32Array) for both PostgreSQL and SQLite
		const buffer = Buffer.allocUnsafe(vector.length * 4);
		for (let i = 0; i < vector.length; i++) {
			buffer.writeFloatLE(vector[i], i * 4);
		}
		return buffer;
	}

	private deserializeVector(buffer: Buffer): number[] {
		// Convert binary buffer back to number array
		const length = buffer.length / 4;
		const vector: number[] = [];
		for (let i = 0; i < length; i++) {
			vector.push(buffer.readFloatLE(i * 4));
		}
		return vector;
	}

	private cosineSimilarity(a: number[], b: number[]): number {
		// Calculate cosine similarity: (a · b) / (||a|| * ||b||)
		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		for (let i = 0; i < a.length; i++) {
			dotProduct += a[i] * b[i];
			normA += a[i] * a[i];
			normB += b[i] * b[i];
		}

		normA = Math.sqrt(normA);
		normB = Math.sqrt(normB);

		if (normA === 0 || normB === 0) {
			return 0;
		}

		return dotProduct / (normA * normB);
	}

	private getTableName(name: string): string {
		const { tablePrefix } = this.databaseConfig;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}

	private getColumnName(name: string): string {
		return this.manager.connection.driver.escape(name);
	}
}
