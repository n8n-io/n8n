import { Logger } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { jsonParse, type VectorDocument, type VectorSearchResult } from 'n8n-workflow';

import { VectorStoreDataRepositoryBase } from './vector-store-data.repository.base';
import { VectorWorkerPool } from './vector-worker-pool';
import { VectorStoreData } from '../../entities';

interface QueryResultRow {
	content: string;
	score: number;
	metadata: Record<string, unknown> | string;
}

/**
 * PostgreSQL-specific implementation of vector store repository.
 * Supports both bytea storage with JS workers and optional pgvector extension.
 */
@Service()
export class VectorStoreDataPostgresRepository extends VectorStoreDataRepositoryBase {
	private workerPool: VectorWorkerPool | null = null;
	private pgvectorAvailable: boolean = false;

	constructor(dataSource: DataSource, databaseConfig: DatabaseConfig, logger: Logger) {
		super(dataSource, databaseConfig, logger);
	}

	/**
	 * Lazily initialize worker pool only when needed.
	 */
	private getWorkerPool(): VectorWorkerPool {
		if (!this.workerPool) {
			this.workerPool = new VectorWorkerPool();
			this.logger.debug('Vector worker pool initialized', this.workerPool.getStats());
		}
		return this.workerPool;
	}

	/**
	 * Cleanup worker pool on shutdown.
	 */
	async shutdown(): Promise<void> {
		if (this.workerPool) {
			await this.workerPool.shutdown();
			this.workerPool = null;
			this.logger.debug('Vector worker pool shut down');
		}
	}

	/**
	 * Initialize the repository and optionally upgrade to pgvector if the extension is available.
	 * This runs on startup but exits early if already upgraded.
	 * Never fails - falls back to JS-based similarity search if pgvector unavailable.
	 */
	async init(): Promise<void> {
		try {
			// Check if already upgraded
			if (await this.checkIfAlreadyUpgraded()) {
				this.pgvectorAvailable = true;
				this.logger.debug('Vector store using pgvector extension');
				return;
			}

			// Try to enable pgvector extension
			if (!(await this.tryEnablePgVectorExtension())) {
				this.pgvectorAvailable = false;
				this.logger.debug(
					'Vector store using JavaScript-based similarity search (pgvector extension not available)',
				);
				return;
			}

			// Perform upgrade
			this.logger.info('Upgrading vector store to use pgvector extension...');

			await this.addVectorPgvColumn();
			await this.migrateExistingVectors();
			await this.createVectorIndex();

			this.pgvectorAvailable = true;
			this.logger.info('Vector store upgraded to pgvector successfully');
		} catch (error) {
			// Log error but don't fail startup
			this.pgvectorAvailable = false;
			this.logger.warn('Failed to upgrade vector store to pgvector, will use JavaScript fallback', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Check if pgvector column already exists
	 */
	private async checkIfAlreadyUpgraded(): Promise<boolean> {
		const rawTableName = `${this.databaseConfig.tablePrefix}vector_store_data`;
		const columnCheck = await this.query(
			`SELECT column_name
			 FROM information_schema.columns
			 WHERE table_name = $1 AND column_name = 'vectorPgv'`,
			[rawTableName],
		);

		return columnCheck.length > 0;
	}

	/**
	 * Try to create and verify pgvector extension
	 */
	private async tryEnablePgVectorExtension(): Promise<boolean> {
		try {
			await this.query('CREATE EXTENSION IF NOT EXISTS vector');
			// Verify it works
			await this.query("SELECT '[1,2,3]'::vector");
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Add vectorPgv column to the table
	 */
	private async addVectorPgvColumn(): Promise<void> {
		const tableName = this.getTableName('vector_store_data');
		const vectorPgvCol = this.getColumnName('vectorPgv');

		await this.query(`ALTER TABLE ${tableName} ADD COLUMN ${vectorPgvCol} vector(1536)`);

		this.logger.info('Added vectorPgv column');
	}

	/**
	 * Migrate existing data from vector (bytea) to vectorPgv
	 */
	private async migrateExistingVectors(): Promise<void> {
		const tableName = this.getTableName('vector_store_data');
		const vectorCol = this.getColumnName('vector');
		const vectorPgvCol = this.getColumnName('vectorPgv');
		const idCol = this.getColumnName('id');

		// Fetch existing vectors
		const existingVectors = (await this.query(
			`SELECT ${idCol} as id, ${vectorCol} as vector
			 FROM ${tableName}
			 WHERE ${vectorCol} IS NOT NULL`,
		)) as Array<{ id: string; vector: Buffer }>;

		if (existingVectors.length === 0) {
			return;
		}

		this.logger.info(`Migrating ${existingVectors.length} existing vectors to pgvector format...`);

		// Batch update in chunks to avoid overwhelming the database
		const BATCH_SIZE = 1000;
		for (let i = 0; i < existingVectors.length; i += BATCH_SIZE) {
			const batch = existingVectors.slice(i, i + BATCH_SIZE);

			for (const row of batch) {
				const vectorBuffer = row.vector;
				const vectorArray = this.deserializeVectorToArray(vectorBuffer);
				const vectorPgv = `[${vectorArray.join(',')}]`;

				await this.query(
					`UPDATE ${tableName}
					 SET ${vectorPgvCol} = $1::vector, ${vectorCol} = NULL
					 WHERE ${idCol} = $2`,
					[vectorPgv, row.id],
				);
			}

			this.logger.debug(
				`Migrated ${Math.min(i + BATCH_SIZE, existingVectors.length)}/${existingVectors.length} vectors`,
			);
		}

		this.logger.info('Migration to pgvector completed');
	}

	/**
	 * Create IVFFlat index for efficient similarity search
	 */
	private async createVectorIndex(): Promise<void> {
		const tableName = this.getTableName('vector_store_data');
		const vectorPgvCol = this.getColumnName('vectorPgv');

		await this.query(`
			CREATE INDEX IF NOT EXISTS idx_vectorPgv_cosine
			ON ${tableName}
			USING ivfflat (${vectorPgvCol} vector_cosine_ops)
			WITH (lists = 100)
		`);
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

		if (this.pgvectorAvailable) {
			// Use raw SQL to insert with vectorPgv (pgvector) column only
			const tableName = this.getTableName('vector_store_data');
			const contentCol = this.getColumnName('content');
			const metadataCol = this.getColumnName('metadata');
			const memoryKeyCol = this.getColumnName('memoryKey');
			const projectIdCol = this.getColumnName('projectId');
			const vectorPgvCol = this.getColumnName('vectorPgv');
			const idCol = this.getColumnName('id');

			for (let i = 0; i < documents.length; i++) {
				const document = documents[i];
				const embedding = embeddings[i];
				const vectorPgv = `[${embedding.join(',')}]`;

				await this.query(
					`INSERT INTO ${tableName}
					 (${idCol}, ${memoryKeyCol}, ${projectIdCol}, ${contentCol}, ${metadataCol}, ${vectorPgvCol})
					 VALUES ($1, $2, $3, $4, $5, $6::vector)`,
					[
						this.generateId(),
						memoryKey,
						projectId,
						document.content,
						JSON.stringify(document.metadata),
						vectorPgv,
					],
				);
			}
		} else {
			// Use TypeORM save with bytea only
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
	}

	async similaritySearch(
		memoryKey: string,
		projectId: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
		if (this.pgvectorAvailable) {
			return await this.similaritySearchWithPgVector(
				memoryKey,
				projectId,
				queryEmbedding,
				k,
				filter,
			);
		} else {
			return await this.similaritySearchWithJS(memoryKey, projectId, queryEmbedding, k, filter);
		}
	}

	private async similaritySearchWithPgVector(
		memoryKey: string,
		projectId: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
		const tableName = this.getTableName('vector_store_data');
		const memoryKeyCol = this.getColumnName('memoryKey');
		const projectIdCol = this.getColumnName('projectId');
		const contentCol = this.getColumnName('content');
		const metadataCol = this.getColumnName('metadata');
		const vectorPgvCol = this.getColumnName('vectorPgv');

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

		const vectorStr = `[${queryEmbedding.join(',')}]`;

		const query = `
			SELECT ${contentCol} as content,
			       ${metadataCol} as metadata,
			       1 - (${vectorPgvCol} <=> $${paramIndex}::vector) as score
			FROM ${tableName}
			WHERE ${whereClause} AND ${vectorPgvCol} IS NOT NULL
			ORDER BY ${vectorPgvCol} <=> $${paramIndex}::vector
			LIMIT ${k}
		`;

		params.push(vectorStr);

		const startTime = performance.now();
		const results = await this.query(query, params);
		const queryTime = performance.now() - startTime;

		this.logger.info('Vector similarity search with pgvector', {
			memoryKey,
			projectId,
			vectorCount: results.length,
			queryTimeMs: queryTime.toFixed(2),
			requestedK: k,
		});

		return (results as QueryResultRow[]).map((row) => this.transformRawQueryResult(row));
	}

	private async similaritySearchWithJS(
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

		const results = await this.query(query, params);

		// Convert to Float32Array for better performance
		const queryVector = new Float32Array(queryEmbedding);
		const vectors = (results as Array<QueryResultRow & { vector: Buffer }>).map((row) =>
			this.deserializeVectorToFloat32Array(row.vector),
		);

		// Offload to worker thread
		const workerPool = this.getWorkerPool();
		const { indices, scores } = await workerPool.calculateSimilarity(queryVector, vectors, k);

		// Map indices back to original rows with scores
		const topK = indices.map((index, i) => ({
			content: (results[index] as QueryResultRow).content,
			metadata: (results[index] as QueryResultRow).metadata,
			score: scores[i],
		}));

		return topK.map((row) => this.transformRawQueryResult(row));
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
		const vectorPgvCol = this.getColumnName('vectorPgv');

		// PostgreSQL: use OCTET_LENGTH for text, pg_column_size for JSONB and pgvector, LENGTH for bytea
		// Note: Only one of vector or vectorPgv is populated per row
		const query = `
			SELECT
				COALESCE(SUM(OCTET_LENGTH(${contentCol})), 0) +
				COALESCE(SUM(pg_column_size(${metadataCol})), 0) +
				COALESCE(SUM(LENGTH(${vectorCol})), 0) +
				COALESCE(SUM(pg_column_size(${vectorPgvCol})), 0) as total_size
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

		// PostgreSQL: use ->> operator for JSON extraction
		const orConditions = fileNames.map((_, index) => {
			const paramName = `fileName${index}`;
			return `metadata->>'fileName' = :${paramName}`;
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
			// PostgreSQL: use ILIKE for case-insensitive matching
			qb.andWhere('vectorStore.memoryKey ILIKE :filter', { filter: `%${filter}%` });
		}

		const result = await qb.getRawMany<{ memoryKey: string }>();
		return result.map((row) => row.memoryKey);
	}

	private serializeVector(vector: number[]): Buffer {
		// Store as binary buffer (Float32Array) for PostgreSQL bytea
		const buffer = Buffer.allocUnsafe(vector.length * 4);
		for (let i = 0; i < vector.length; i++) {
			buffer.writeFloatLE(vector[i], i * 4);
		}
		return buffer;
	}

	private deserializeVectorToFloat32Array(buffer: Buffer): Float32Array {
		// Convert binary buffer to Float32Array for better performance in workers
		const length = buffer.length / 4;
		const vector = new Float32Array(length);
		for (let i = 0; i < length; i++) {
			vector[i] = buffer.readFloatLE(i * 4);
		}
		return vector;
	}

	private deserializeVectorToArray(buffer: Buffer): number[] {
		// Convert binary buffer to number array for pgvector migration
		const length = buffer.length / 4;
		const vector: number[] = [];
		for (let i = 0; i < length; i++) {
			vector.push(buffer.readFloatLE(i * 4));
		}
		return vector;
	}
}
