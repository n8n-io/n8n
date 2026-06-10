/**
 * IBM Db2 Vector Store for n8n
 *
 * Provides vector similarity search capabilities using IBM Db2's native vector support.
 * Supports multiple distance metrics (Euclidean, Cosine, Dot Product) and metadata filtering.
 *
 * @example
 * ```typescript
 * const vectorStore = new DB2VectorStore(embeddings, {
 *   client: db2Connection,
 *   tableName: 'VECTOR_STORE',
 *   distanceStrategy: 'cosine',
 *   batchSize: 100,
 * });
 *
 * await vectorStore.addDocuments([
 *   { pageContent: 'Hello world', metadata: { source: 'doc1' } }
 * ]);
 *
 * const results = await vectorStore.similaritySearch('greeting', 5);
 * ```
 *
 * @see {@link https://www.ibm.com/docs/en/db2/11.5?topic=support-vector-data-type IBM Db2 Vector Documentation}
 */

import { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { maximalMarginalRelevance } from '@langchain/core/utils/math';
import { VectorStore } from '@langchain/core/vectorstores';
import { randomUUID } from 'crypto';
import { OperationalError, UserError } from 'n8n-workflow';

import type { DB2VectorStoreConfig, Db2Connection, SearchFilter } from './types';

export type DistanceStrategy = 'euclidean' | 'cosine' | 'dot_product';

export const DistanceStrategy = {
	EUCLIDEAN: 'euclidean' as DistanceStrategy,
	COSINE: 'cosine' as DistanceStrategy,
	DOT_PRODUCT: 'dot_product' as DistanceStrategy,
};

/**
 * Validate and sanitize table name to prevent SQL injection
 */
export function validateTableName(tableName: string): string {
	if (!tableName || typeof tableName !== 'string') {
		throw new Error('Table name must be a non-empty string');
	}

	if (!/^[a-zA-Z0-9_-]+$/.test(tableName)) {
		throw new Error(
			'Invalid table name: only alphanumeric characters, underscores, and hyphens are allowed',
		);
	}

	if (tableName.length > 128) {
		throw new Error('Table name exceeds maximum length of 128 characters');
	}

	return tableName;
}

export function validatePositiveInteger(value: number, paramName: string): number {
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${paramName} must be a positive integer, got: ${value}`);
	}
	return value;
}

/**
 * Get column value from a DB2 result row, handling various naming conventions
 *
 * DB2 may return column names in different cases (UPPER, lower, Mixed) or with
 * underscores depending on the query and database configuration. This function
 * tries multiple variations to find the correct column value.
 *
 * @param row - The database result row
 * @param columnName - The column name to look for
 * @returns The column value, or undefined if not found
 *
 * @example
 * const row = { TEXT: 'hello', METADATA: '{}' };
 * getColumnValue(row, 'text'); // Returns 'hello'
 * getColumnValue(row, 'metadata'); // Returns '{}'
 */
export function getColumnValue(row: Record<string, unknown>, columnName: string): unknown {
	const directValue = row[columnName];
	if (directValue !== undefined) return directValue;

	const lowerCaseValue = row[columnName.toLowerCase()];
	if (lowerCaseValue !== undefined) return lowerCaseValue;

	const upperCaseValue = row[columnName.toUpperCase()];
	if (upperCaseValue !== undefined) return upperCaseValue;

	const normalizedColumnName = columnName.replace(/_/g, '').toLowerCase();
	const matchingKey = Object.keys(row).find(
		(key) => key.replace(/_/g, '').toLowerCase() === normalizedColumnName,
	);

	return matchingKey ? row[matchingKey] : undefined;
}

/**
 * Check if table exists using SYSCAT.TABLES
 * More reliable than SELECT COUNT(*) approach as it doesn't require table access permissions
 */
export async function checkTableExists(
	client: Db2Connection,
	tableName: string,
	schema?: string | null,
): Promise<boolean> {
	return await new Promise((resolve, reject) => {
		// Build query based on whether schema is provided
		const query = schema
			? `
				SELECT COUNT(*) as count
				FROM SYSCAT.TABLES
				WHERE TABSCHEMA = ?
					AND TABNAME = ?
			`
			: `
				SELECT COUNT(*) as count
				FROM SYSCAT.TABLES
				WHERE TABSCHEMA = CURRENT SCHEMA
					AND TABNAME = ?
			`;

		// Prepare parameters based on whether schema is provided
		const params = schema
			? [schema.toUpperCase(), tableName.toUpperCase()]
			: [tableName.toUpperCase()];

		client.query(query, params, (err, rows) => {
			if (err) {
				// Reject on actual errors (connection issues, permission problems, etc.)
				reject(new Error(`Failed to check table existence: ${err.message}`));
				return;
			}

			if (!rows || rows.length === 0) {
				// No results means table doesn't exist
				resolve(false);
				return;
			}

			const count =
				(rows[0] as Record<string, unknown>).count || (rows[0] as Record<string, unknown>).COUNT;
			resolve(Number(count) > 0);
		});
	});
}

export function getDistanceFunction(distanceStrategy: DistanceStrategy): string {
	const strategyMap: Record<string, string> = {
		euclidean: 'EUCLIDEAN',
		dot_product: 'DOT',
		cosine: 'COSINE',
	};

	const func = strategyMap[distanceStrategy];
	if (!func) {
		throw new Error(`Unsupported distance strategy: ${distanceStrategy}`);
	}

	return func;
}

export async function createTable(
	client: Db2Connection,
	tableName: string,
	embeddingDim: number,
	schema?: string | null,
	columnNames?: {
		idColumnName?: string;
		contentColumnName?: string;
		metadataColumnName?: string;
		embeddingColumnName?: string;
	},
): Promise<void> {
	const validatedTableName = validateTableName(tableName).toUpperCase();
	const validatedDim = validatePositiveInteger(embeddingDim, 'embeddingDim');

	const qualifiedTableName = schema
		? `${schema.toUpperCase()}.${validatedTableName}`
		: validatedTableName;

	const idCol = columnNames?.idColumnName || 'id';
	const contentCol = columnNames?.contentColumnName || 'text';
	const metadataCol = columnNames?.metadataColumnName || 'metadata';
	const embeddingCol = columnNames?.embeddingColumnName || 'embedding';

	const colsDict = {
		[idCol]: 'VARCHAR(255) PRIMARY KEY NOT NULL',
		[contentCol]: 'CLOB',
		[metadataCol]: 'BLOB',
		[embeddingCol]: `vector(${validatedDim}, FLOAT32)`,
	};

	try {
		const exists = await checkTableExists(client, validatedTableName, schema);

		if (!exists) {
			const ddlBody = Object.entries(colsDict)
				.map(([colName, colType]) => `${colName} ${colType}`)
				.join(', ');

			const ddl = `CREATE TABLE ${qualifiedTableName} (${ddlBody})`;

			await new Promise<void>((resolve, reject) => {
				client.query(ddl, (err: Error | null) => {
					if (err) {
						reject(new Error(`Failed to create table '${qualifiedTableName}': ${err.message}`));
					} else {
						resolve();
					}
				});
			});

			await new Promise<void>((resolve, reject) => {
				if (typeof client.commitTransaction === 'function') {
					client.commitTransaction((err?: Error | null) => {
						if (err) {
							reject(new Error(`Failed to commit table creation: ${err.message}`));
						} else {
							resolve();
						}
					});
				} else if (typeof client.commit === 'function') {
					client.commit((err?: Error | null) => {
						if (err) {
							reject(new Error(`Failed to commit table creation: ${err.message}`));
						} else {
							resolve();
						}
					});
				} else {
					resolve();
				}
			});
		}
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Table initialization failed for '${qualifiedTableName}': ${error.message}`);
		}
		throw error;
	}
}

export async function dropTable(client: Db2Connection, tableName: string): Promise<void> {
	const validatedTableName = validateTableName(tableName);
	const ddl = `DROP TABLE ${validatedTableName}`;

	await new Promise<void>((resolve, reject) => {
		client.query(ddl, (err: Error | null) => {
			if (err) reject(err);
			else resolve();
		});
	});
}

/**
 * IBM Db2 Vector Store implementation
 *
 * Provides LangChain-compatible interface for storing and retrieving document embeddings
 * in IBM Db2 using native vector support with multiple distance metrics and metadata filtering.
 */
export class DB2VectorStore extends VectorStore {
	private client: Db2Connection;
	private tableName: string;
	private schema: string | null;
	private qualifiedTableName: string;
	private distanceStrategy: DistanceStrategy;
	private filter?: Record<string, unknown>;
	private initializationState: 'idle' | 'initializing' | 'initialized' | 'failed' = 'idle';
	private initializationPromise: Promise<void> | null = null;
	private batchSize: number;
	private readonly idColumnName: string;
	private readonly contentColumnName: string;
	private readonly metadataColumnName: string;
	private readonly embeddingColumnName: string;
	private cachedEmbeddingDimension: number | null = null;

	_vectorstoreType(): string {
		return 'db2';
	}

	/**
	 * Get the database client for connection pool management
	 *
	 * @returns The Db2 connection instance
	 * @internal
	 */
	getClient(): Db2Connection {
		return this.client;
	}

	/**
	 * Create a new Db2 Vector Store instance
	 *
	 * @param embeddings - The embeddings model to use for generating vectors
	 * @param config - Configuration options for the vector store
	 *
	 * @remarks
	 * The constructor does not initialize the database table. Table initialization
	 * is deferred until the first operation via {@link ensureInitialized}.
	 * This allows the constructor to be synchronous while supporting async initialization.
	 *
	 * @example
	 * ```typescript
	 * const vectorStore = new DB2VectorStore(embeddings, {
	 *   client: db2Connection,
	 *   tableName: 'VECTOR_STORE',
	 *   distanceStrategy: 'cosine',
	 *   batchSize: 100,
	 * });
	 * ```
	 */
	constructor(embeddings: Embeddings, config: DB2VectorStoreConfig) {
		super(embeddings, config.params ?? {});

		this.client = config.client;

		// Always uppercase table name for DB2 (unquoted identifiers are stored as uppercase)
		this.tableName = validateTableName(config.tableName).toUpperCase();

		// Store schema if provided, otherwise use null (will use CURRENT SCHEMA)
		this.schema = config.schema ? config.schema.toUpperCase() : null;

		// Create fully qualified table name for SQL queries
		this.qualifiedTableName = this.schema ? `${this.schema}.${this.tableName}` : this.tableName;

		this.distanceStrategy = config.distanceStrategy ?? DistanceStrategy.EUCLIDEAN;
		this.filter = config.filter;
		this.batchSize = config.batchSize ?? 100;

		// Column names with defaults
		this.idColumnName = config.columns?.idColumnName || 'id';
		this.contentColumnName = config.columns?.contentColumnName || 'text';
		this.metadataColumnName = config.columns?.metadataColumnName || 'metadata';
		this.embeddingColumnName = config.columns?.embeddingColumnName || 'embedding';

		// NOTE: Do not initialize the table in the constructor.
		// Constructors cannot await async work, so initialization is deferred
		// until the first operation via ensureInitialized().
	}

	private async initialize(): Promise<void> {
		// CRITICAL: Check and set state synchronously BEFORE any async work
		// This closes the TOCTOU race window between check and state assignment

		if (this.initializationState === 'initialized') {
			return;
		}

		if (this.initializationState === 'initializing') {
			if (this.initializationPromise) {
				return await this.initializationPromise;
			}
			throw new OperationalError('Invalid initialization state: initializing without promise');
		}

		if (this.initializationState === 'failed') {
			throw new OperationalError('Previous initialization failed. Create a new instance to retry.');
		}

		// Atomically set state and create promise to prevent TOCTOU race
		this.initializationState = 'initializing';
		this.initializationPromise = (async () => {
			try {
				const embeddingDim = await this.getEmbeddingDimension();
				await createTable(this.client, this.tableName, embeddingDim, this.schema, {
					idColumnName: this.idColumnName,
					contentColumnName: this.contentColumnName,
					metadataColumnName: this.metadataColumnName,
					embeddingColumnName: this.embeddingColumnName,
				});
				this.initializationState = 'initialized';
			} catch (error) {
				this.initializationState = 'failed';
				this.initializationPromise = null;
				throw error;
			}
		})();

		return await this.initializationPromise;
	}

	protected async ensureInitialized(): Promise<void> {
		try {
			await this.initialize();
		} catch (error) {
			throw new Error(
				`Failed to initialize DB2 Vector Store: ${error instanceof Error ? error.message : String(error)}. Ensure the database is accessible and you have permission to create tables.`,
			);
		}
	}

	private async getEmbeddingDimension(): Promise<number> {
		// Return cached dimension if available
		if (this.cachedEmbeddingDimension !== null) {
			return this.cachedEmbeddingDimension;
		}

		try {
			const embeddedDocument = await this.embeddings.embedQuery('test');

			if (!Array.isArray(embeddedDocument)) {
				throw new OperationalError('Embedding provider returned non-array result');
			}

			if (embeddedDocument.length === 0) {
				throw new OperationalError('Embedding provider returned empty array');
			}

			if (!embeddedDocument.every((v) => typeof v === 'number' && isFinite(v))) {
				throw new OperationalError('Embedding contains invalid values (NaN or Infinity)');
			}

			if (embeddedDocument.length > 16000) {
				throw new UserError(
					`Embedding dimension ${embeddedDocument.length} exceeds Db2 maximum of 16000`,
				);
			}

			// Cache the dimension for future use
			this.cachedEmbeddingDimension = embeddedDocument.length;
			return this.cachedEmbeddingDimension;
		} catch (error) {
			if (error instanceof OperationalError || error instanceof UserError) {
				throw error;
			}
			throw new OperationalError(
				`Failed to get embedding dimension: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Add documents to the vector store
	 *
	 * @param documents - Array of documents to add
	 * @param options - Optional configuration
	 * @param options.ids - Optional array of IDs for the documents
	 * @returns Array of document IDs (generated or provided)
	 *
	 * @remarks
	 * Documents are processed in batches using the configured batch size.
	 * If IDs are not provided, they will be generated automatically.
	 *
	 * @example
	 * ```typescript
	 * const ids = await vectorStore.addDocuments([
	 *   { pageContent: 'Hello world', metadata: { source: 'doc1' } },
	 *   { pageContent: 'Goodbye world', metadata: { source: 'doc2' } }
	 * ]);
	 * ```
	 *
	 * @throws {UserError} If documents array is empty or contains invalid data
	 * @throws {OperationalError} If embedding generation or database operation fails
	 */
	async addDocuments(documents: Document[], options?: { ids?: string[] }): Promise<string[]> {
		await this.ensureInitialized();
		const texts = documents.map((doc) => doc.pageContent);
		const metadatas = documents.map((doc) => doc.metadata);
		return await this.addTexts(texts, metadatas, options);
	}

	/**
	 * Add vectors to the vector store (required by VectorStore abstract class)
	 *
	 * @param vectors - Pre-computed embedding vectors to store
	 * @param documents - Array of documents to add
	 * @param options - Optional configuration
	 * @param options.ids - Optional array of IDs for the documents
	 * @returns Array of successfully inserted document IDs
	 *
	 * @remarks
	 * **Partial Failure Behavior:**
	 * - Processes documents in batches for optimal performance
	 * - On batch failure, continues processing remaining batches
	 * - Returns IDs only for successfully inserted documents
	 * - Logs warnings to console for failed batches
	 * - **Returned array may be shorter than input if batches fail**
	 * - Check console warnings or compare return length to detect partial failures
	 *
	 * **Dimension Handling:**
	 * - Uses dimension from first vector (no API call needed)
	 * - Validates all vectors have consistent dimensions
	 *
	 * @throws {UserError} If vectors array is empty, length mismatches, or dimension inconsistencies
	 *
	 * @internal
	 */
	async addVectors(
		vectors: number[][],
		documents: Document[],
		options?: { ids?: string[] },
	): Promise<string[]> {
		await this.ensureInitialized();

		// Validate that vectors are provided and match documents
		if (!vectors || vectors.length === 0) {
			throw new UserError('vectors array cannot be empty');
		}

		if (vectors.length !== documents.length) {
			throw new UserError(
				`vectors length (${vectors.length}) must match documents length (${documents.length})`,
			);
		}

		// Use the provided vectors directly instead of re-embedding
		const texts = documents.map((doc) => doc.pageContent);
		const metadatas = documents.map((doc) => doc.metadata);

		// Handle ID generation
		let processedIds: string[];
		if (options?.ids) {
			if (options.ids.length !== texts.length) {
				throw new UserError(
					`ids length (${options.ids.length}) must match texts length (${texts.length})`,
				);
			}
			processedIds = options.ids;
		} else if (metadatas) {
			const allHaveIds = metadatas.every((metadata) => 'id' in metadata);
			if (allHaveIds) {
				processedIds = metadatas.map((metadata) => String(metadata.id));
			} else {
				processedIds = metadatas.map((metadata) =>
					'id' in metadata ? String(metadata.id) : randomUUID(),
				);
			}
		} else {
			processedIds = texts.map(() => randomUUID());
		}

		const metadatasArray = metadatas || texts.map(() => ({}));

		// Get dimension from first vector (no API call needed)
		const embeddingLen = vectors[0].length;
		const validatedEmbeddingLen = validatePositiveInteger(embeddingLen, 'embeddingLen');

		// Validate all vectors have consistent dimension
		for (let i = 0; i < vectors.length; i++) {
			if (!Array.isArray(vectors[i]) || vectors[i].length !== validatedEmbeddingLen) {
				throw new UserError(
					`Vector at index ${i} has dimension ${vectors[i]?.length ?? 0}, expected ${validatedEmbeddingLen} (from first vector)`,
				);
			}
		}

		// Validate dimension against cached schema if available
		if (
			this.cachedEmbeddingDimension !== null &&
			validatedEmbeddingLen !== this.cachedEmbeddingDimension
		) {
			throw new UserError(
				`Vector dimension mismatch: provided vectors have dimension ${validatedEmbeddingLen}, but table schema expects ${this.cachedEmbeddingDimension}`,
			);
		}

		// Process in batches
		const batchSize = validatePositiveInteger(this.batchSize, 'batchSize');
		const successfulIds: string[] = [];
		const failedBatches: Array<{ batchIndex: number; error: string }> = [];

		for (let i = 0; i < texts.length; i += batchSize) {
			const batchEnd = Math.min(i + batchSize, texts.length);
			const currentBatchSize = batchEnd - i;
			const batchIndex = Math.floor(i / batchSize);

			const batchIds = processedIds.slice(i, batchEnd);
			const batchVectors = vectors.slice(i, batchEnd);
			const batchMetadatas = metadatasArray.slice(i, batchEnd);
			const batchTexts = texts.slice(i, batchEnd);

			try {
				await this.insertBatch(
					batchIds,
					batchVectors,
					batchMetadatas,
					batchTexts,
					validatedEmbeddingLen,
					currentBatchSize,
				);
				// Only add IDs for successful batches
				successfulIds.push(...batchIds);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				failedBatches.push({ batchIndex, error: errorMessage });
				console.error(`Batch ${batchIndex} (items ${i}-${batchEnd - 1}) failed: ${errorMessage}`);
			}
		}

		// Log warnings for failed batches but return successful IDs
		if (failedBatches.length > 0) {
			const totalBatches = Math.ceil(texts.length / batchSize);
			const failureDetails = failedBatches
				.slice(0, 3)
				.map((f) => `Batch ${f.batchIndex}: ${f.error}`)
				.join('; ');

			console.warn(
				`[addVectors] Partial failure: ${failedBatches.length}/${totalBatches} batches failed. ` +
					`Successfully inserted ${successfulIds.length} items. ` +
					`First failures: ${failureDetails}${failedBatches.length > 3 ? '...' : ''}`,
			);
		}

		return successfulIds;
	}

	/**
	 * Add texts to the vector store using batch insert optimization
	 *
	 * @param texts - Array of text strings to add
	 * @param metadatas - Optional array of metadata objects
	 * @param options - Optional configuration
	 * @param options.ids - Optional array of IDs for the texts
	 * @returns Array of successfully inserted document IDs
	 *
	 * @remarks
	 * **Partial Failure Behavior:**
	 * - Processes texts in batches for optimal performance
	 * - On batch failure, continues processing remaining batches
	 * - Returns IDs only for successfully inserted documents
	 * - Logs warnings to console for failed batches
	 * - **Returned array may be shorter than input if batches fail**
	 * - Check console warnings or compare return length to detect partial failures
	 *
	 * **Implementation Notes:**
	 * - Matches Python implementation: add_texts (db2vs.py:248-346)
	 * - Generates embeddings automatically using configured embedding function
	 * - Uses configured batch size for optimal performance
	 *
	 * @throws {UserError} If texts array is empty, contains invalid data, or length mismatches
	 * @throws {OperationalError} If embedding generation fails completely
	 */
	async addTexts(
		texts: string[],
		metadatas?: Array<Record<string, unknown>>,
		options?: { ids?: string[] },
	): Promise<string[]> {
		await this.ensureInitialized();

		// Validate inputs
		if (!Array.isArray(texts) || texts.length === 0) {
			throw new UserError('texts must be a non-empty array');
		}

		// Check for empty or invalid texts
		const invalidIndices = texts
			.map((text, idx) => ({ text, idx }))
			.filter(({ text }) => typeof text !== 'string' || text.trim().length === 0)
			.map(({ idx }) => idx);

		if (invalidIndices.length > 0) {
			throw new UserError(
				`Invalid texts at indices: ${invalidIndices.slice(0, 5).join(', ')}${invalidIndices.length > 5 ? '...' : ''}. All texts must be non-empty strings.`,
			);
		}

		// Validate metadata length
		if (metadatas && metadatas.length !== texts.length) {
			throw new UserError(
				`metadatas length (${metadatas.length}) must match texts length (${texts.length})`,
			);
		}

		// Validate IDs length
		if (options?.ids && options.ids.length !== texts.length) {
			throw new UserError(
				`ids length (${options.ids.length}) must match texts length (${texts.length})`,
			);
		}

		// Handle ID generation logic matching Python implementation (db2vs.py:276-320)
		let processedIds: string[];

		if (options?.ids) {
			processedIds = options.ids;
		} else if (metadatas) {
			const allHaveIds = metadatas.every((metadata) => 'id' in metadata);
			if (allHaveIds) {
				processedIds = metadatas.map((metadata) => String(metadata.id));
			} else {
				processedIds = metadatas.map((metadata) =>
					'id' in metadata ? String(metadata.id) : randomUUID(),
				);
			}
		} else {
			processedIds = texts.map(() => randomUUID());
		}

		// Wrap embedding generation in try-catch
		let embeddings: number[][];
		try {
			embeddings = await this.embeddings.embedDocuments(texts);
		} catch (error) {
			throw new OperationalError(
				`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}

		// Validate embeddings result
		if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
			throw new OperationalError(
				`Embedding provider returned invalid result: expected ${texts.length} embeddings, got ${embeddings?.length ?? 0}`,
			);
		}

		// Ensure metadatas array exists
		const metadatasArray = metadatas || texts.map(() => ({}));

		// Get embedding dimension
		const embeddingLen = await this.getEmbeddingDimension();
		const validatedEmbeddingLen = validatePositiveInteger(embeddingLen, 'embeddingLen');

		// Process in batches using configured batch size
		const batchSize = validatePositiveInteger(this.batchSize, 'batchSize');
		const successfulIds: string[] = [];
		const failedBatches: Array<{ batchIndex: number; error: string }> = [];

		for (let i = 0; i < texts.length; i += batchSize) {
			const batchEnd = Math.min(i + batchSize, texts.length);
			const currentBatchSize = batchEnd - i;
			const batchIndex = Math.floor(i / batchSize);

			// Prepare batch data
			const batchIds = processedIds.slice(i, batchEnd);
			const batchEmbeddings = embeddings.slice(i, batchEnd);
			const batchMetadatas = metadatasArray.slice(i, batchEnd);
			const batchTexts = texts.slice(i, batchEnd);

			try {
				await this.insertBatch(
					batchIds,
					batchEmbeddings,
					batchMetadatas,
					batchTexts,
					validatedEmbeddingLen,
					currentBatchSize,
				);
				// Only add IDs for successful batches
				successfulIds.push(...batchIds);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				failedBatches.push({ batchIndex, error: errorMessage });
				console.error(`Batch ${batchIndex} (items ${i}-${batchEnd - 1}) failed: ${errorMessage}`);
			}
		}

		// Log warnings for failed batches but return successful IDs
		if (failedBatches.length > 0) {
			const totalBatches = Math.ceil(texts.length / batchSize);
			const failureDetails = failedBatches
				.slice(0, 3)
				.map((f) => `Batch ${f.batchIndex}: ${f.error}`)
				.join('; ');

			console.warn(
				`[addTexts] Partial failure: ${failedBatches.length}/${totalBatches} batches failed. ` +
					`Successfully inserted ${successfulIds.length} items. ` +
					`First failures: ${failureDetails}${failedBatches.length > 3 ? '...' : ''}`,
			);
		}

		return successfulIds;
	}

	async clearTable(): Promise<void> {
		await this.ensureInitialized();

		const truncateQuery = `TRUNCATE TABLE ${this.qualifiedTableName} IMMEDIATE`;

		return await new Promise<void>((resolve, reject) => {
			this.client.query(truncateQuery, (err: Error | null) => {
				if (err) {
					// Log original TRUNCATE error before falling back to DELETE
					console.warn(`[clearTable] TRUNCATE failed, falling back to DELETE: ${err.message}`);

					const deleteQuery = `DELETE FROM ${this.qualifiedTableName} WHERE 1=1`;
					this.client.query(deleteQuery, (deleteErr: Error | null) => {
						if (deleteErr) {
							reject(
								new OperationalError(`Failed to clear table: ${deleteErr.message}`, { cause: err }),
							);
							return;
						}
						resolve();
					});
					return;
				}
				resolve();
			});
		});
	}

	private async insertBatch(
		ids: string[],
		embeddings: number[][],
		metadatas: Array<Record<string, unknown>>,
		texts: string[],
		embeddingLen: number,
		batchSize: number,
	): Promise<void> {
		if (
			ids.length !== batchSize ||
			embeddings.length !== batchSize ||
			metadatas.length !== batchSize ||
			texts.length !== batchSize
		) {
			throw new OperationalError('Batch data length mismatch');
		}

		// Validate all items before attempting insert
		for (let i = 0; i < batchSize; i++) {
			if (typeof ids[i] !== 'string' || ids[i].length === 0) {
				throw new UserError(`Invalid ID at index ${i}`);
			}
			if (!Array.isArray(embeddings[i]) || embeddings[i].length !== embeddingLen) {
				throw new UserError(
					`Invalid embedding at index ${i}: expected length ${embeddingLen}, got ${embeddings[i]?.length ?? 0}`,
				);
			}
			if (!embeddings[i].every((v) => typeof v === 'number' && isFinite(v))) {
				throw new UserError(`Embedding at index ${i} contains NaN or Infinity`);
			}
			if (typeof texts[i] !== 'string') {
				throw new UserError(`Invalid text at index ${i}: must be string`);
			}
		}

		// Build multi-row INSERT with parameterized VECTOR values
		const valuesClauses: string[] = [];
		const params: unknown[] = [];

		for (let i = 0; i < batchSize; i++) {
			// Use parameterized binding for vector data to reduce string allocation
			// Format: VECTOR(?, dimension, type) where ? is bound to JSON array string
			const embeddingJson = `[${embeddings[i].join(',')}]`;
			const metadataStr = JSON.stringify(metadatas[i] ?? {});

			valuesClauses.push(`(?, VECTOR(?, ${embeddingLen}, FLOAT32), SYSTOOLS.JSON2BSON(?), ?)`);
			params.push(
				ids[i],
				embeddingJson, // Parameterized vector data
				metadataStr,
				texts[i],
			);
		}

		const sqlInsert = `INSERT INTO ${this.qualifiedTableName} (${this.idColumnName}, ${this.embeddingColumnName}, ${this.metadataColumnName}, ${this.contentColumnName}) VALUES ${valuesClauses.join(', ')}`;

		return await new Promise<void>((resolve, reject) => {
			const beginTransaction = (callback: (err?: Error | null) => void) => {
				if (typeof this.client.beginTransaction === 'function') {
					this.client.beginTransaction(callback);
				} else {
					callback(null);
				}
			};

			const commitTransaction = (callback: (err?: Error | null) => void) => {
				if (typeof this.client.commitTransaction === 'function') {
					this.client.commitTransaction(callback);
				} else if (typeof this.client.commit === 'function') {
					this.client.commit(callback);
				} else {
					callback(null);
				}
			};

			const rollbackTransaction = (callback: (err?: Error | null) => void) => {
				if (typeof this.client.rollbackTransaction === 'function') {
					this.client.rollbackTransaction(callback);
				} else if (typeof this.client.rollback === 'function') {
					this.client.rollback(callback);
				} else {
					callback(null);
				}
			};

			beginTransaction((beginErr?: Error | null) => {
				if (beginErr) {
					reject(new OperationalError(`Failed to begin transaction: ${beginErr.message}`));
					return;
				}

				this.client.query(sqlInsert, params, (execErr: Error | null) => {
					if (execErr) {
						rollbackTransaction(() => {
							reject(new OperationalError(`Batch insert failed: ${execErr.message}`));
						});
					} else {
						commitTransaction((commitErr?: Error | null) => {
							if (commitErr) {
								rollbackTransaction(() => {
									reject(
										new OperationalError(`Failed to commit transaction: ${commitErr.message}`),
									);
								});
							} else {
								resolve();
							}
						});
					}
				});
			});
		});
	}

	/**
	 * Check if metadata matches the given filter
	 *
	 * @param metadata - Document metadata to check
	 * @param filter - Filter criteria to match against
	 * @returns true if metadata matches all filter conditions
	 *
	 * @remarks
	 * **Supported operators:**
	 * - Scalar values use strict equality (===)
	 * - Array values use Array.includes (SQL IN semantics)
	 * - Nested keys and operators like gt/lt are not supported
	 *
	 * **Extension point:** To add new filter operators (range, regex, exists),
	 * modify this method's logic and update the SearchFilter type definition.
	 */
	private matchesFilter(
		metadata: Record<string, unknown>,
		filter: SearchFilter | undefined,
	): boolean {
		if (!filter || Object.keys(filter).length === 0) {
			return true;
		}

		return Object.entries(filter).every(([key, value]) => {
			const metadataValue = metadata[key];
			if (Array.isArray(value)) {
				return value.includes(metadataValue);
			}
			return metadataValue === value;
		});
	}

	/**
	 * Similarity search
	 */
	async similaritySearch(query: string, k: number = 4, filter?: SearchFilter): Promise<Document[]> {
		await this.ensureInitialized();
		const embedding = await this.embeddings.embedQuery(query);
		return await this.similaritySearchVectorWithScore(embedding, k, filter).then((results) =>
			results.map((result) => result[0]),
		);
	}

	/**
	 * Similarity search with score
	 */
	async similaritySearchWithScore(
		query: string,
		k: number = 4,
		filter?: SearchFilter,
	): Promise<Array<[Document, number]>> {
		await this.ensureInitialized();
		const embedding = await this.embeddings.embedQuery(query);
		return await this.similaritySearchVectorWithScore(embedding, k, filter);
	}

	/**
	 * Similarity search by vector
	 * Matches Python implementation (db2vs.py:370-380)
	 */
	async similaritySearchByVector(
		embedding: number[],
		k: number = 4,
		filter?: SearchFilter,
	): Promise<Document[]> {
		await this.ensureInitialized();
		const docsAndScores = await this.similaritySearchVectorWithScore(embedding, k, filter);
		return docsAndScores.map(([doc]) => doc);
	}
	/**
	 * Execute similarity search query with optional filtering
	 *
	 * @param embedding - Query embedding vector
	 * @param k - Number of results to return
	 * @param filter - Optional metadata filter
	 * @returns Raw query results before document construction
	 *
	 * @remarks
	 * **Why filtering happens in application code:**
	 * DB2's BSON metadata column cannot be efficiently filtered in SQL without JSON path
	 * functions, which may not be available in all target DB2 versions. Application-level
	 * filtering ensures compatibility across DB2 deployments while maintaining the Python
	 * implementation's behavior. Over-fetching compensates for post-query filtering.
	 */
	private async executeSearchQuery(
		embedding: number[],
		k: number,
		filter?: SearchFilter,
	): Promise<Array<Record<string, unknown>>> {
		const validatedK = validatePositiveInteger(k, 'k');
		const vectorDimension = validatePositiveInteger(embedding.length, 'vectorDimension');
		const distanceFunc = getDistanceFunction(this.distanceStrategy);

		// Merge instance filter with parameter filter
		const effectiveFilter = { ...this.filter, ...filter };
		const hasFilter = Object.keys(effectiveFilter).length > 0;

		// Prepare embedding as JSON array string for parameterized query
		const embeddingList = `[${embedding.join(',')}]`;

		// Over-fetch when filtering to ensure we get k results after post-filter
		// Hardcoded 3x multiplier; no selectivity information available at query time
		const fetchLimit = hasFilter ? validatedK * 3 : validatedK;

		// No filter clause in SQL - filtering happens after query
		// Over-fetching compensates for post-query filter reducing result count
		// Table name is already validated in constructor
		// OPTIMIZE FOR clause hints to Db2 optimizer for better query plan
		const query = `
			SELECT ${this.idColumnName}, ${this.contentColumnName},
			       SYSTOOLS.BSON2JSON(${this.metadataColumnName}) AS metadata,
			       ${this.embeddingColumnName},
			       vector_distance(
			           ${this.embeddingColumnName},
			           VECTOR(?, ${vectorDimension}, FLOAT32),
			           ${distanceFunc}
			       ) AS distance
			FROM ${this.qualifiedTableName}
			ORDER BY distance
			FETCH FIRST ${fetchLimit} ROWS ONLY
			OPTIMIZE FOR ${fetchLimit} ROWS
		`;

		return await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
			this.client.query<Record<string, unknown>>(
				query,
				[embeddingList],
				(err: Error | null, results?: Array<Record<string, unknown>>) => {
					if (err) {
						const message = err.message.toLowerCase();

						if (message.includes('table') && message.includes('not found')) {
							reject(
								new Error(
									`Table '${this.qualifiedTableName}' not found. Please ensure the table exists.`,
								),
							);
						} else if (message.includes('column')) {
							reject(
								new Error(
									'Invalid table structure. The table must have columns: id, text, embedding, and metadata.',
								),
							);
						} else {
							reject(new Error(`Similarity search failed: ${err.message}`));
						}
						return;
					}

					resolve(results ?? []);
				},
			);
		});
	}

	/**
	 * Similarity search by vector with score
	 * Matches Python implementation with post-query filtering (db2vs.py:428-446)
	 */
	async similaritySearchVectorWithScore(
		embedding: number[],
		k: number = 4,
		filter?: SearchFilter,
	): Promise<Array<[Document, number]>> {
		await this.ensureInitialized();

		const validatedK = validatePositiveInteger(k, 'k');
		const effectiveFilter = { ...this.filter, ...filter };

		// Execute search query using shared helper
		const queryResults = await this.executeSearchQuery(embedding, k, filter);
		const documents: Array<[Document, number]> = [];

		// Apply filtering in application code after query (matching Python db2vs.py:428-446)
		for (const result of queryResults) {
			const parsed = this.parseResultRow(result);

			// Apply filtering based on the 'filter' dictionary
			if (!this.matchesFilter(parsed.metadata, effectiveFilter)) {
				continue;
			}

			const doc = new Document({
				pageContent: parsed.text,
				metadata: parsed.metadata,
			});

			documents.push([doc, parsed.distance]);
		}

		// Trim to exactly k results after filtering
		return documents.slice(0, validatedK);
	}

	/**
	 * Similarity search by vector returning embeddings
	 * This method returns documents with their similarity scores and embeddings
	 * Useful for MMR (Maximal Marginal Relevance) calculations
	 * Matches Python implementation with post-query filtering (db2vs.py:486-490)
	 */
	async similaritySearchVectorWithScoreAndEmbeddings(
		embedding: number[],
		k: number = 4,
		filter?: SearchFilter,
	): Promise<Array<[Document, number, number[]]>> {
		await this.ensureInitialized();

		const validatedK = validatePositiveInteger(k, 'k');
		const effectiveFilter = { ...this.filter, ...filter };

		// Execute search query using shared helper
		const queryResults = await this.executeSearchQuery(embedding, k, filter);
		const documents: Array<[Document, number, number[]]> = [];

		// Apply filtering in application code after query (matching Python db2vs.py:486-490)
		for (const result of queryResults) {
			const parsed = this.parseResultRow(result);

			// Apply filter if provided and matches; otherwise, add all documents
			if (!this.matchesFilter(parsed.metadata, effectiveFilter)) {
				continue;
			}

			const doc = new Document({
				pageContent: parsed.text,
				metadata: parsed.metadata,
			});

			const embeddingRaw = getColumnValue(result, this.embeddingColumnName);
			let resultEmbedding: number[] = [];
			try {
				if (Array.isArray(embeddingRaw)) {
					resultEmbedding = embeddingRaw.map((value) => Number(value));
				} else if (typeof embeddingRaw === 'string') {
					resultEmbedding = JSON.parse(embeddingRaw) as number[];
				}
			} catch {
				resultEmbedding = [];
			}

			documents.push([doc, parsed.distance, resultEmbedding]);
		}

		// Trim to exactly k results after filtering
		return documents.slice(0, validatedK);
	}

	/**
	 * Parse a result row from similarity search query
	 * @private
	 */
	private parseResultRow(result: Record<string, unknown>): {
		text: string;
		metadata: Record<string, unknown>;
		distance: number;
	} {
		const metaRaw = getColumnValue(result, this.metadataColumnName);
		let metadata: Record<string, unknown> = {};
		try {
			metadata =
				typeof metaRaw === 'string'
					? JSON.parse(metaRaw || '{}')
					: ((metaRaw ?? {}) as Record<string, unknown>);
		} catch {
			metadata = {};
		}

		const text = String(getColumnValue(result, this.contentColumnName) ?? '');

		const distanceValue = getColumnValue(result, 'distance');
		const distance =
			typeof distanceValue === 'number' ? distanceValue : Number(distanceValue ?? Number.NaN);

		return { text, metadata, distance };
	}

	/**
	 * Maximal Marginal Relevance (MMR) search with scores
	 * Optimizes for similarity to query AND diversity among selected documents
	 *
	 * @param embedding - Embedding vector to search for
	 * @param k - Number of documents to return (default: 4)
	 * @param fetchK - Number of documents to fetch before filtering with MMR (default: 20)
	 * @param lambdaMult - Diversity factor between 0 and 1 (0 = max diversity, 1 = min diversity, default: 0.5)
	 * @param filter - Optional metadata filter
	 * @returns Array of [Document, score] tuples selected by MMR
	 */
	async maximalMarginalRelevanceSearch(
		query: string,
		options?: {
			k?: number;
			fetchK?: number;
			lambdaMult?: number;
			filter?: SearchFilter;
		},
	): Promise<Document[]> {
		await this.ensureInitialized();
		const embedding = await this.embeddings.embedQuery(query);
		const k = options?.k ?? 4;
		const fetchK = options?.fetchK ?? 20;
		const lambdaMult = options?.lambdaMult ?? 0.5;
		const filter = options?.filter;

		const docsAndScores = await this.maximalMarginalRelevanceSearchWithScoreByVector(
			embedding,
			k,
			fetchK,
			lambdaMult,
			filter,
		);

		return docsAndScores.map(([doc]) => doc);
	}

	/**
	 * MMR search by vector
	 */
	async maximalMarginalRelevanceSearchByVector(
		embedding: number[],
		k: number = 4,
		fetchK: number = 20,
		lambdaMult: number = 0.5,
		filter?: SearchFilter,
	): Promise<Document[]> {
		await this.ensureInitialized();
		const docsAndScores = await this.maximalMarginalRelevanceSearchWithScoreByVector(
			embedding,
			k,
			fetchK,
			lambdaMult,
			filter,
		);

		return docsAndScores.map(([doc]) => doc);
	}

	/**
	 * MMR search with scores by vector
	 * Core MMR implementation that fetches documents with embeddings and applies MMR algorithm
	 */
	async maximalMarginalRelevanceSearchWithScoreByVector(
		embedding: number[],
		k: number = 4,
		fetchK: number = 20,
		lambdaMult: number = 0.5,
		filter?: SearchFilter,
	): Promise<Array<[Document, number]>> {
		await this.ensureInitialized();

		// Fetch more documents than needed for MMR selection
		const docsScoresEmbeddings = await this.similaritySearchVectorWithScoreAndEmbeddings(
			embedding,
			fetchK,
			filter,
		);

		if (docsScoresEmbeddings.length === 0) {
			return [];
		}

		// Extract documents, scores, and embeddings
		const documents = docsScoresEmbeddings.map(([doc]) => doc);
		const scores = docsScoresEmbeddings.map(([, score]) => score);
		const embeddings = docsScoresEmbeddings.map(([, , emb]) => emb);

		// Apply MMR algorithm to select diverse documents
		const mmrIndices = maximalMarginalRelevance(embedding, embeddings, lambdaMult, k);

		// Return selected documents with their scores
		return mmrIndices.map((idx) => [documents[idx], scores[idx]]);
	}

	/**
	 * Delete documents by IDs
	 */
	async delete(options: { ids: string[] }): Promise<void> {
		await this.ensureInitialized();

		const { ids } = options;
		if (!ids || ids.length === 0) {
			throw new Error('No IDs provided for deletion');
		}

		const placeholders = ids.map(() => '?').join(',');
		const ddl = `DELETE FROM ${this.qualifiedTableName} WHERE ${this.idColumnName} IN (${placeholders})`;

		const beginTransaction = (callback: (err?: Error | null) => void) => {
			if (typeof this.client.beginTransaction === 'function') {
				this.client.beginTransaction(callback);
			} else {
				callback(null);
			}
		};

		const commitTransaction = (callback: (err?: Error | null) => void) => {
			if (typeof this.client.commitTransaction === 'function') {
				this.client.commitTransaction(callback);
			} else if (typeof this.client.commit === 'function') {
				this.client.commit(callback);
			} else {
				callback(null);
			}
		};

		const rollbackTransaction = (callback: (err?: Error | null) => void) => {
			if (typeof this.client.rollbackTransaction === 'function') {
				this.client.rollbackTransaction(callback);
			} else if (typeof this.client.rollback === 'function') {
				this.client.rollback(callback);
			} else {
				callback(null);
			}
		};

		try {
			// Begin transaction
			await new Promise<void>((resolve, reject) => {
				beginTransaction((err?: Error | null) => {
					if (err) reject(err);
					else resolve();
				});
			});

			await new Promise<void>((resolve, reject) => {
				this.client.query(ddl, ids, (err: Error | null) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});

			await new Promise<void>((resolve, reject) => {
				commitTransaction((err?: Error | null) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
		} catch (error) {
			// Rollback on error
			await new Promise((resolve) => {
				rollbackTransaction(() => resolve(null));
			});
			throw error;
		}
	}

	/**
	 * Update existing documents by ID
	 * @param ids - Array of document IDs to update
	 * @param texts - New text content for documents
	 * @param metadatas - New metadata for documents
	 * @returns Promise resolving when update is complete
	 */
	async update(
		ids: string[],
		texts: string[],
		metadatas?: Array<Record<string, unknown>>,
	): Promise<void> {
		await this.ensureInitialized();

		if (ids.length !== texts.length) {
			throw new Error('Number of IDs must match number of texts');
		}

		if (metadatas && metadatas.length !== ids.length) {
			throw new Error('Number of metadatas must match number of IDs');
		}

		// Generate embeddings for new texts
		const embeddings = await this.embeddings.embedDocuments(texts);

		// Get embedding dimension (uses cache)
		const embeddingLen = await this.getEmbeddingDimension();
		const validatedEmbeddingLen = validatePositiveInteger(embeddingLen, 'embeddingLen');

		const beginTransaction = (callback: (err?: Error | null) => void) => {
			if (typeof this.client.beginTransaction === 'function') {
				this.client.beginTransaction(callback);
			} else {
				callback(null);
			}
		};

		const commitTransaction = (callback: (err?: Error | null) => void) => {
			if (typeof this.client.commitTransaction === 'function') {
				this.client.commitTransaction(callback);
			} else if (typeof this.client.commit === 'function') {
				this.client.commit(callback);
			} else {
				callback(null);
			}
		};

		const rollbackTransaction = (callback: (err?: Error | null) => void) => {
			if (typeof this.client.rollbackTransaction === 'function') {
				this.client.rollbackTransaction(callback);
			} else if (typeof this.client.rollback === 'function') {
				this.client.rollback(callback);
			} else {
				callback(null);
			}
		};

		try {
			// Begin transaction
			await new Promise<void>((resolve, reject) => {
				beginTransaction((err?: Error | null) => {
					if (err)
						reject(new Error(`Failed to begin transaction: ${err?.message ?? 'Unknown error'}`));
					else resolve();
				});
			});

			// Execute updates sequentially using for...of loop
			for (let i = 0; i < ids.length; i++) {
				const id = ids[i];
				const text = texts[i];
				const metadata = metadatas ? metadatas[i] : {};
				const embedding = embeddings[i];
				const embeddingList = `[${embedding.join(',')}]`;

				const sqlUpdate = `
					UPDATE ${this.qualifiedTableName}
					SET ${this.contentColumnName} = ?,
							${this.embeddingColumnName} = VECTOR(?, ${validatedEmbeddingLen}, FLOAT32),
							${this.metadataColumnName} = SYSTOOLS.JSON2BSON(?)
					WHERE ${this.idColumnName} = ?
				`;

				const params = [text, embeddingList, JSON.stringify(metadata), id];

				await new Promise<void>((resolve, reject) => {
					this.client.query(sqlUpdate, params, (err: Error | null) => {
						if (err) {
							reject(new Error(`Failed to update document ${ids[i]}: ${err.message}`));
						} else {
							resolve();
						}
					});
				});
			}

			// Commit transaction
			await new Promise<void>((resolve, reject) => {
				commitTransaction((err?: Error | null) => {
					if (err)
						reject(new Error(`Failed to commit transaction: ${err?.message ?? 'Unknown error'}`));
					else resolve();
				});
			});
		} catch (error) {
			// Rollback on error
			await new Promise<void>((resolve) => {
				rollbackTransaction((rollbackErr?: Error | null) => {
					if (rollbackErr) {
						console.error('Rollback failed:', rollbackErr?.message ?? 'Unknown error');
					}
					resolve();
				});
			});
			throw error;
		}
	}

	/**
	 * Create Db2VectorStore from texts
	 * Matches Python: from_texts (db2vs.py:674-713)
	 *
	 * @param texts - Array of text documents to add
	 * @param metadatas - Metadata for each document
	 * @param embeddings - Embedding function
	 * @param dbConfig - Database configuration
	 * @param dbConfig.dropTableBeforeCreate - If true, drops existing table (WARNING: destroys all data)
	 */
	static async fromTexts(
		texts: string[],
		metadatas: Array<Record<string, unknown>> | Record<string, unknown>,
		embeddings: Embeddings,
		dbConfig: Omit<DB2VectorStoreConfig, 'embeddingFunction'>,
	): Promise<DB2VectorStore> {
		// Only drop table if explicitly requested
		if (dbConfig.dropTableBeforeCreate === true) {
			console.warn(
				`[DB2VectorStore] Dropping table '${dbConfig.tableName}' - all existing data will be permanently deleted`,
			);
			await dropTable(dbConfig.client, dbConfig.tableName);
		}

		const instance = new DB2VectorStore(embeddings, {
			...dbConfig,
			embeddingFunction: embeddings,
		});

		const metadatasArray = Array.isArray(metadatas) ? metadatas : texts.map(() => metadatas);

		await instance.ensureInitialized();
		await instance.addTexts(texts, metadatasArray);

		return instance;
	}

	/**
	 * Static factory method to create a DB2VectorStore from an existing table
	 * @param embeddings - Embeddings instance
	 * @param config - DB2 vector store configuration
	 * @returns Promise resolving to initialized DB2VectorStore instance
	 */
	static async fromExistingTable(
		embeddings: Embeddings,
		config: DB2VectorStoreConfig,
	): Promise<DB2VectorStore> {
		const store = new DB2VectorStore(embeddings, config);
		await store.ensureInitialized();
		return store;
	}
}
