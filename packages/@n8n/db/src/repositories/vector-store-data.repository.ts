import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import { generateNanoId } from '../utils/generators';

import { VectorStoreData } from '../entities';
import { dbType } from '../entities/abstract-entity';

export interface VectorDocument {
	content: string;
	metadata: Record<string, unknown>;
}

export interface VectorSearchResult {
	document: VectorDocument;
	score: number;
}

@Service()
export class VectorStoreDataRepository extends Repository<VectorStoreData> {
	constructor(
		dataSource: DataSource,
		private readonly databaseConfig: DatabaseConfig,
	) {
		super(VectorStoreData, dataSource.manager);
	}

	/**
	 * Add vectors to the store
	 */
	async addVectors(
		memoryKey: string,
		documents: VectorDocument[],
		embeddings: number[][],
		clearStore: boolean = false,
	): Promise<void> {
		console.log('[VectorStore] Adding vectors:', {
			memoryKey,
			documentCount: documents.length,
			embeddingCount: embeddings.length,
			clearStore,
			firstEmbeddingLength: embeddings[0]?.length,
		});

		if (clearStore) {
			await this.clearStore(memoryKey);
			console.log('[VectorStore] Cleared existing store for:', memoryKey);
		}

		const entities: VectorStoreData[] = [];
		for (let i = 0; i < documents.length; i++) {
			const entity = new VectorStoreData();
			entity.id = generateNanoId();
			entity.memoryKey = memoryKey;
			entity.content = documents[i].content;
			entity.metadata = documents[i].metadata;
			entity.vector = this.serializeVector(embeddings[i]);
			entities.push(entity);
		}

		await this.save(entities);
		console.log('[VectorStore] Successfully saved vectors:', entities.length);
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
		console.log('[VectorStore] Similarity search called:', {
			memoryKey,
			queryEmbeddingLength: queryEmbedding.length,
			k,
			filter,
			dbType,
		});

		if (dbType === 'postgresdb') {
			return await this.similaritySearchPostgres(memoryKey, queryEmbedding, k, filter);
		} else if (dbType === 'sqlite') {
			return await this.similaritySearchSQLite(memoryKey, queryEmbedding, k, filter);
		}

		throw new Error(`Database type ${dbType} does not support vector similarity search`);
	}

	/**
	 * PostgreSQL similarity search using pgvector
	 */
	private async similaritySearchPostgres(
		memoryKey: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
		const tableName = this.getTableName('vector_store_data');
		const memoryKeyCol = this.getColumnName('memoryKey');
		const vectorCol = this.getColumnName('vector');
		const contentCol = this.getColumnName('content');
		const metadataCol = this.getColumnName('metadata');

		// Build WHERE clause
		let whereClause = `${memoryKeyCol} = $1`;
		const params: unknown[] = [memoryKey];
		let paramIndex = 2;

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
		return results.map(
			(row: { content: string; metadata: Record<string, unknown>; score: number }) => ({
				document: {
					content: row.content,
					metadata: row.metadata,
				},
				score: row.score,
			}),
		);
	}

	/**
	 * SQLite similarity search using sqlite-vec
	 */
	private async similaritySearchSQLite(
		memoryKey: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
		const tableName = this.getTableName('vector_store_data');
		const memoryKeyCol = this.getColumnName('memoryKey');
		const vectorCol = this.getColumnName('vector');
		const contentCol = this.getColumnName('content');
		const metadataCol = this.getColumnName('metadata');

		console.log('[VectorStore] SQLite search starting:', {
			memoryKey,
			queryEmbeddingLength: queryEmbedding.length,
			k,
		});

		// First, check if there are any records with this memoryKey
		const countQuery = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${memoryKeyCol} = ?`;
		const countResult = await this.query(countQuery, [memoryKey]);
		console.log('[VectorStore] Records found with memoryKey:', {
			memoryKey,
			count: countResult[0]?.count || 0,
		});

		// Check a sample vector length from database
		const sampleQuery = `SELECT LENGTH(${vectorCol}) as vectorLength FROM ${tableName} WHERE ${memoryKeyCol} = ? LIMIT 1`;
		const sampleResult = await this.query(sampleQuery, [memoryKey]);
		console.log('[VectorStore] Sample stored vector info:', {
			storedVectorLength: sampleResult[0]?.vectorLength,
			expectedLength: queryEmbedding.length * 4,
		});

		// Test if vec_distance_cosine function works with a sample
		try {
			const queryVectorBlob = this.serializeVector(queryEmbedding);
			const testQuery = `SELECT vec_distance_cosine(${vectorCol}, ?) as distance FROM ${tableName} WHERE ${memoryKeyCol} = ? LIMIT 1`;
			const testResult = await this.query(testQuery, [queryVectorBlob, memoryKey]);
			console.log('[VectorStore] vec_distance_cosine test:', {
				works: testResult.length > 0,
				sampleDistance: testResult[0]?.distance,
			});
		} catch (testErr) {
			console.error('[VectorStore] vec_distance_cosine test failed:', testErr);
		}

		// Serialize query vector for sqlite-vec
		const queryVectorBlob = this.serializeVector(queryEmbedding);

		// Build WHERE clause
		let whereClause = `${memoryKeyCol} = ?`;
		const whereParams: unknown[] = [memoryKey];

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
		// 2. WHERE clause parameters -> memoryKey (and filter values)
		// 3. Second ? in ORDER BY vec_distance_cosine -> queryVectorBlob
		const params = [queryVectorBlob, ...whereParams, queryVectorBlob];

		console.log('[VectorStore] Executing SQLite vec query:', {
			query,
			paramsCount: params.length,
			queryVectorBlobLength: queryVectorBlob.length,
			memoryKey,
		});

		const results = await this.query(query, params);

		console.log('[VectorStore] SQLite vec query results:', {
			resultCount: results.length,
			scores: results.map((r: { score: number }) => r.score),
		});

		return results.map((row: { content: string; metadata: string; score: number }) => ({
			document: {
				content: row.content,
				metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
			},
			score: row.score,
		}));
	}

	/**
	 * Get count of vectors for a memory key
	 */
	async getVectorCount(memoryKey: string): Promise<number> {
		return await this.countBy({ memoryKey });
	}

	/**
	 * Clear all vectors for a memory key
	 */
	async clearStore(memoryKey: string): Promise<void> {
		await this.delete({ memoryKey });
	}

	/**
	 * Delete entire store (alias for clearStore)
	 */
	async deleteStore(memoryKey: string): Promise<void> {
		await this.clearStore(memoryKey);
	}

	/**
	 * Delete vectors by file names stored in metadata
	 */
	async deleteByFileNames(memoryKey: string, fileNames: string[]): Promise<number> {
		if (fileNames.length === 0) {
			return 0;
		}

		const qb = this.createQueryBuilder('vectorStore').delete().where('memoryKey = :memoryKey', {
			memoryKey,
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

	/**
	 * List all unique memory keys
	 */
	async listStores(): Promise<string[]> {
		const result = await this.createQueryBuilder('vectorStore')
			.select('DISTINCT vectorStore.memoryKey', 'memoryKey')
			.getRawMany<{ memoryKey: string }>();

		return result.map((row) => row.memoryKey);
	}

	/**
	 * Serialize vector for storage
	 * - PostgreSQL: string format for pgvector "[x,y,z]"
	 * - SQLite: binary buffer for sqlite-vec
	 */
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
