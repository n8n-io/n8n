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

import { createHash, randomUUID } from 'crypto';
import { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import { maximalMarginalRelevance } from '@langchain/core/utils/math';
import { OperationalError, UserError } from 'n8n-workflow';
import type { DB2VectorStoreConfig, Db2Connection, SearchFilter, Db2Statement } from './types';

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
	// Try direct match first
	const directValue = row[columnName];
	if (directValue !== undefined) return directValue;

	// Try lowercase
	const lowerCaseValue = row[columnName.toLowerCase()];
	if (lowerCaseValue !== undefined) return lowerCaseValue;

	// Try uppercase
	const upperCaseValue = row[columnName.toUpperCase()];
	if (upperCaseValue !== undefined) return upperCaseValue;

	// Try normalized (remove underscores and lowercase)
	const normalizedColumnName = columnName.replace(/_/g, '').toLowerCase();
	const matchingKey = Object.keys(row).find(
		(key) => key.replace(/_/g, '').toLowerCase() === normalizedColumnName,
	);

	return matchingKey ? row[matchingKey] : undefined;
}

/**
 * Check if table exists in Db2
 * Matches Python: _table_exists (db2vs.py:73-83)
 */
export async function tableExists(client: Db2Connection, tableName: string): Promise<boolean> {
	try {
		const validatedTableName = validateTableName(tableName);
		const query = `SELECT COUNT(*) FROM ${validatedTableName}`;
		await new Promise<unknown[]>((resolve, reject) => {
			client.query(query, (err: Error | null, result?: unknown[]) => {
				if (err) reject(err);
				else resolve(result ?? []);
			});
		});
		return true;
	} catch (error: unknown) {
		if (error instanceof Error && error.message.includes('SQL0204N')) {
			return false;
		}
		throw error;
	}
}

/**
 * Check if table exists using SYSCAT.TABLES
 * More reliable method for checking table existence
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
		[idCol]: 'CHAR(16) PRIMARY KEY NOT NULL',
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
				client.commitTransaction((err?: Error | null) => {
					if (err) {
						reject(new Error(`Failed to commit table creation: ${err.message}`));
					} else {
						resolve();
					}
				});
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
	private initialized = false;
	private initializationPromise: Promise<void> | null = null;
	private batchSize: number;
	private readonly idColumnName: string;
	private readonly contentColumnName: string;
	private readonly metadataColumnName: string;
	private readonly embeddingColumnName: string;

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
		if (this.initialized) {
			return;
		}

		if (this.initializationPromise) {
			return await this.initializationPromise;
		}

		this.initializationPromise = (async () => {
			try {
				const embeddingDim = await this.getEmbeddingDimension();
				await createTable(this.client, this.tableName, embeddingDim, this.schema, {
					idColumnName: this.idColumnName,
					contentColumnName: this.contentColumnName,
					metadataColumnName: this.metadataColumnName,
					embeddingColumnName: this.embeddingColumnName,
				});
				this.initialized = true;
			} catch (error) {
				this.initializationPromise = null;
				throw error;
			}
		})();

		return await this.initializationPromise;
	}

	protected async ensureInitialized(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			await this.initialize();
		} catch (error) {
			throw new Error(
				`Failed to initialize DB2 Vector Store: ${error instanceof Error ? error.message : String(error)}. Ensure the database is accessible and you have permission to create tables.`,
			);
		}
	}

	private async getEmbeddingDimension(): Promise<number> {
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

			return embeddedDocument.length;
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
	 * @param _vectors - Pre-computed embedding vectors (not used, embeddings are regenerated)
	 * @param documents - Array of documents to add
	 * @param options - Optional configuration
	 * @returns Array of document IDs
	 *
	 * @remarks
	 * This method is required by the VectorStore interface but regenerates embeddings
	 * from document content rather than using the provided vectors.
	 *
	 * @internal
	 */
	async addVectors(
		_vectors: number[][],
		documents: Document[],
		options?: { ids?: string[] },
	): Promise<string[]> {
		await this.ensureInitialized();
		// This method is not in Python, but required by VectorStore interface
		// We'll implement it by converting vectors back to texts and using addTexts
		const texts = documents.map((doc) => doc.pageContent);
		const metadatas = documents.map((doc) => doc.metadata);
		return await this.addTexts(texts, metadatas, options);
	}

	/**
	 * Add texts to the vector store using batch insert optimization
	 *
	 * @param texts - Array of text strings to add
	 * @param metadatas - Optional array of metadata objects
	 * @param options - Optional configuration
	 * @param options.ids - Optional array of IDs for the texts
	 * @returns Array of document IDs
	 *
	 * @remarks
	 * Matches Python implementation: add_texts (db2vs.py:248-346)
	 * Processes texts in batches using the configured batch size for optimal performance.
	 *
	 * @throws {UserError} If texts array is empty, contains invalid data, or length mismatches
	 * @throws {OperationalError} If embedding generation or database operation fails
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
			// Validate IDs length
			if (options.ids.length !== texts.length) {
				throw new Error(
					'ids must be the same length as texts. ' +
						`Got ${options.ids.length} ids and ${texts.length} texts.`,
				);
			}
			// Hash provided IDs
			processedIds = options.ids.map((id) => this.hashAndTruncateId(id));
		} else if (metadatas) {
			// Check if all metadatas have 'id' field
			const allHaveIds = metadatas.every((metadata) => 'id' in metadata);
			if (allHaveIds) {
				// Generate IDs from metadata
				processedIds = metadatas.map((metadata) => this.hashAndTruncateId(String(metadata.id)));
			} else {
				// Partial metadata has id, generate new id if metadata doesn't have it
				processedIds = metadatas.map((metadata) =>
					'id' in metadata
						? this.hashAndTruncateId(String(metadata.id))
						: this.hashAndTruncateId(randomUUID()),
				);
			}
		} else {
			// Generate new random IDs
			processedIds = texts.map(() => this.hashAndTruncateId(randomUUID()));
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
		for (let i = 0; i < texts.length; i += batchSize) {
			const batchEnd = Math.min(i + batchSize, texts.length);
			const currentBatchSize = batchEnd - i;

			// Prepare batch data
			const batchIds = processedIds.slice(i, batchEnd);
			const batchEmbeddings = embeddings.slice(i, batchEnd);
			const batchMetadatas = metadatasArray.slice(i, batchEnd);
			const batchTexts = texts.slice(i, batchEnd);

			await this.insertBatch(
				batchIds,
				batchEmbeddings,
				batchMetadatas,
				batchTexts,
				validatedEmbeddingLen,
				currentBatchSize,
			);
		}

		return processedIds;
	}

	async clearTable(): Promise<void> {
		await this.ensureInitialized();

		const truncateQuery = `TRUNCATE TABLE ${this.qualifiedTableName} IMMEDIATE`;

		return await new Promise<void>((resolve, reject) => {
			this.client.query(truncateQuery, (err: Error | null) => {
				if (err) {
					const deleteQuery = `DELETE FROM ${this.qualifiedTableName} WHERE 1=1`;
					this.client.query(deleteQuery, (deleteErr: Error | null) => {
						if (deleteErr) {
							reject(new OperationalError(`Failed to clear table: ${deleteErr.message}`));
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
		const sqlInsert = `INSERT INTO ${this.qualifiedTableName} (${this.idColumnName}, ${this.embeddingColumnName}, ${this.metadataColumnName}, ${this.contentColumnName}) VALUES (?, VECTOR(?, ${embeddingLen}, FLOAT32), SYSTOOLS.JSON2BSON(?), ?)`;

		if (
			ids.length !== batchSize ||
			embeddings.length !== batchSize ||
			metadatas.length !== batchSize ||
			texts.length !== batchSize
		) {
			throw new OperationalError('Batch data length mismatch');
		}

		return await new Promise<void>((resolve, reject) => {
			if (typeof this.client.prepare !== 'function') {
				void this.insertBatchFallback(ids, embeddings, metadatas, texts, embeddingLen).then(
					resolve,
					reject,
				);
				return;
			}

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

				this.client.prepare!(sqlInsert, (prepareErr: Error | null, stmt: Db2Statement) => {
					if (prepareErr) {
						rollbackTransaction(() => {
							reject(new OperationalError(`Failed to prepare statement: ${prepareErr.message}`));
						});
						return;
					}

					let statementClosed = false;
					const closeStatement = () => {
						if (!statementClosed) {
							try {
								stmt.closeSync();
								statementClosed = true;
							} catch (closeErr) {
								console.error('Failed to close statement:', closeErr);
							}
						}
					};

					let currentIndex = 0;

					// Execute row by row within transaction
					const executeNext = (): void => {
						if (currentIndex >= batchSize) {
							// All rows inserted, commit transaction
							closeStatement();
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
							return;
						}

						const i = currentIndex;
						currentIndex++;

						// Validate each item
						if (typeof ids[i] !== 'string' || ids[i].length === 0) {
							closeStatement();
							rollbackTransaction(() => {
								reject(new UserError(`Invalid ID at index ${i}`));
							});
							return;
						}
						if (!Array.isArray(embeddings[i]) || embeddings[i].length !== embeddingLen) {
							closeStatement();
							rollbackTransaction(() => {
								reject(
									new UserError(
										`Invalid embedding at index ${i}: expected length ${embeddingLen}, got ${embeddings[i]?.length ?? 0}`,
									),
								);
							});
							return;
						}
						if (!embeddings[i].every((v) => typeof v === 'number' && isFinite(v))) {
							closeStatement();
							rollbackTransaction(() => {
								reject(new UserError(`Embedding at index ${i} contains NaN or Infinity`));
							});
							return;
						}
						if (typeof texts[i] !== 'string') {
							closeStatement();
							rollbackTransaction(() => {
								reject(new UserError(`Invalid text at index ${i}: must be string`));
							});
							return;
						}

						// Prepare row parameters
						const params = [
							ids[i],
							`[${embeddings[i].join(',')}]`,
							JSON.stringify(metadatas[i] ?? {}),
							texts[i],
						];

						try {
							// Bind parameters for this row
							stmt.bindSync(params);

							// Execute this row
							stmt.execute((execErr: Error | null) => {
								if (execErr) {
									closeStatement();
									rollbackTransaction(() => {
										reject(new OperationalError(`Insert failed at index ${i}: ${execErr.message}`));
									});
								} else {
									// Continue to next row
									executeNext();
								}
							});
						} catch (err) {
							closeStatement();
							rollbackTransaction(() => {
								reject(
									new OperationalError(
										`Failed to bind/execute at index ${i}: ${err instanceof Error ? err.message : 'Unknown error'}`,
									),
								);
							});
						}
					};

					// Start executing rows
					executeNext();
				});
			});
		});
	}

	/**
	 * Fallback method for batch insert when prepare() is not available
	 * Uses row-by-row inserts within a transaction
	 */
	private async insertBatchFallback(
		ids: string[],
		embeddings: number[][],
		metadatas: Array<Record<string, unknown>>,
		texts: string[],
		embeddingLen: number,
	): Promise<void> {
		const sqlInsert = `INSERT INTO ${this.qualifiedTableName} (${this.idColumnName}, ${this.embeddingColumnName}, ${this.metadataColumnName}, ${this.contentColumnName}) VALUES (?, VECTOR(?, ${embeddingLen}, FLOAT32), SYSTOOLS.JSON2BSON(?), ?)`;

		return await new Promise<void>((resolve, reject) => {
			const rollback = (callback: (err?: Error) => void) => {
				if (typeof this.client.rollbackTransaction === 'function') {
					this.client.rollbackTransaction((rollbackErr) => {
						if (rollbackErr) {
							console.error('Rollback failed:', rollbackErr);
						}
						callback(rollbackErr ?? undefined);
					});
				} else if (typeof this.client.rollback === 'function') {
					this.client.rollback((rollbackErr) => {
						if (rollbackErr) {
							console.error('Rollback failed:', rollbackErr);
						}
						callback(rollbackErr ?? undefined);
					});
				} else {
					callback();
				}
			};

			const commit = (callback: (err?: Error | null) => void) => {
				if (typeof this.client.commitTransaction === 'function') {
					this.client.commitTransaction(callback);
				} else if (typeof this.client.commit === 'function') {
					this.client.commit(callback);
				} else {
					this.client.query('COMMIT', callback);
				}
			};

			const begin = (callback: (err?: Error | null) => void) => {
				if (typeof this.client.beginTransaction === 'function') {
					this.client.beginTransaction(callback);
				} else {
					callback(null);
				}
			};

			begin((beginError?: Error | null) => {
				if (beginError) {
					reject(new OperationalError(`Failed to begin transaction: ${beginError.message}`));
					return;
				}

				let currentIndex = 0;

				const executeNext = (): void => {
					if (currentIndex >= ids.length) {
						commit((commitError?: Error | null) => {
							if (commitError) {
								rollback(() => {
									reject(
										new OperationalError(`Failed to commit transaction: ${commitError.message}`),
									);
								});
							} else {
								resolve();
							}
						});
						return;
					}

					const index = currentIndex;
					currentIndex++;

					// Validate data
					if (!ids[index] || !embeddings[index] || !texts[index]) {
						rollback(() => {
							reject(new UserError(`Invalid data at index ${index}`));
						});
						return;
					}

					const params = [
						ids[index],
						`[${embeddings[index].join(',')}]`,
						JSON.stringify(metadatas[index] ?? {}),
						texts[index],
					];

					this.client.query(sqlInsert, params, (err: Error | null) => {
						if (err) {
							rollback(() => {
								reject(new OperationalError(`Insert failed at index ${index}: ${err.message}`));
							});
						} else {
							executeNext();
						}
					});
				};

				executeNext();
			});
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
	 * Similarity search by vector with score
	 * Matches Python implementation with post-query filtering (db2vs.py:428-446)
	 */
	async similaritySearchVectorWithScore(
		embedding: number[],
		k: number = 4,
		filter?: SearchFilter,
	): Promise<Array<[Document, number]>> {
		await this.ensureInitialized();

		// Validate inputs
		const validatedK = validatePositiveInteger(k, 'k');
		const vectorDimension = validatePositiveInteger(embedding.length, 'vectorDimension');
		const distanceFunc = getDistanceFunction(this.distanceStrategy);

		// Merge instance filter with parameter filter
		const effectiveFilter = { ...this.filter, ...filter };

		// Prepare embedding as JSON array string for parameterized query
		const embeddingList = `[${embedding.join(',')}]`;

		// No filter clause in SQL - filtering happens after query (matching Python)
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
			FETCH FIRST ${validatedK} ROWS ONLY
			OPTIMIZE FOR ${validatedK} ROWS
		`;

		return await new Promise<Array<[Document, number]>>((resolve, reject) => {
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

					const queryResults = results ?? [];
					const documents: Array<[Document, number]> = [];

					// Apply filtering in application code after query (matching Python db2vs.py:428-446)
					for (const result of queryResults) {
						const metaRaw = getColumnValue(result, 'metadata');
						let metadata = {};
						try {
							metadata =
								typeof metaRaw === 'string'
									? JSON.parse(metaRaw || '{}')
									: ((metaRaw ?? {}) as Record<string, unknown>);
						} catch {
							metadata = {};
						}

						// Apply filtering based on the 'filter' dictionary
						if (effectiveFilter && Object.keys(effectiveFilter).length > 0) {
							// Check if all filter conditions match
							const matches = Object.entries(effectiveFilter).every(([key, value]) => {
								const metadataValue = (metadata as Record<string, unknown>)[key];
								// Handle array values (for "in" operations)
								if (Array.isArray(value)) {
									return value.includes(metadataValue);
								}
								return metadataValue === value;
							});

							if (!matches) {
								continue;
							}
						}

						const doc = new Document({
							pageContent: String(getColumnValue(result, 'text') ?? ''),
							metadata,
						});

						const distanceValue = getColumnValue(result, 'distance');
						const distance =
							typeof distanceValue === 'number'
								? distanceValue
								: Number(distanceValue ?? Number.NaN);

						documents.push([doc, distance]);
					}

					resolve(documents);
				},
			);
		});
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
		const vectorDimension = validatePositiveInteger(embedding.length, 'vectorDimension');
		const distanceFunc = getDistanceFunction(this.distanceStrategy);

		const effectiveFilter = { ...this.filter, ...filter };

		const embeddingList = `[${embedding.join(',')}]`;

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
			FETCH FIRST ${validatedK} ROWS ONLY
			OPTIMIZE FOR ${validatedK} ROWS
		`;

		return await new Promise<Array<[Document, number, number[]]>>((resolve, reject) => {
			this.client.query<Record<string, unknown>>(
				query,
				[embeddingList],
				(err: Error | null, results?: Array<Record<string, unknown>>) => {
					if (err) {
						const message = err.message;

						// Check for table not found error (SQL0204N)
						if (message.includes('SQL0204N') || message.includes('undefined name')) {
							reject(
								new Error(
									`Table '${this.qualifiedTableName}' not found. Please ensure the table exists.`,
								),
							);
						}
						// Check for column not found error (SQL0206N)
						else if (message.includes('SQL0206N') || message.includes('not valid in the context')) {
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

					const queryResults = results ?? [];
					const documents: Array<[Document, number, number[]]> = [];

					// Apply filtering in application code after query (matching Python db2vs.py:486-490)
					for (const result of queryResults) {
						const metaRaw = getColumnValue(result, 'metadata');
						let metadata = {};
						try {
							metadata =
								typeof metaRaw === 'string'
									? JSON.parse(metaRaw || '{}')
									: ((metaRaw ?? {}) as Record<string, unknown>);
						} catch {
							metadata = {};
						}

						// Apply filter if provided and matches; otherwise, add all documents
						if (effectiveFilter && Object.keys(effectiveFilter).length > 0) {
							// Check if all filter conditions match
							const matches = Object.entries(effectiveFilter).every(([key, value]) => {
								const metadataValue = (metadata as Record<string, unknown>)[key];
								// Handle array values (for "in" operations)
								if (Array.isArray(value)) {
									return value.includes(metadataValue);
								}
								return metadataValue === value;
							});

							if (!matches) {
								continue;
							}
						}

						const doc = new Document({
							pageContent: String(getColumnValue(result, 'text') ?? ''),
							metadata,
						});

						const distanceValue = getColumnValue(result, 'distance');
						const distance =
							typeof distanceValue === 'number'
								? distanceValue
								: Number(distanceValue ?? Number.NaN);

						const embeddingRaw = getColumnValue(result, 'embedding');
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

						documents.push([doc, distance, resultEmbedding]);
					}

					resolve(documents);
				},
			);
		});
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
	 * Matches Python implementation - hashes IDs before deletion (db2vs.py:659-662)
	 */
	async delete(options: { ids: string[] }): Promise<void> {
		await this.ensureInitialized();

		const { ids } = options;
		if (!ids || ids.length === 0) {
			throw new Error('No IDs provided for deletion');
		}

		// Hash IDs before deletion to match Python implementation (db2vs.py:659-662)
		const hashedIds = ids.map((id) => this.hashAndTruncateId(id));

		// Use parameterized query with placeholders
		const placeholders = hashedIds.map(() => '?').join(',');
		const ddl = `DELETE FROM ${this.qualifiedTableName} WHERE ${this.idColumnName} IN (${placeholders})`;

		try {
			// Begin transaction
			await new Promise<void>((resolve, reject) => {
				this.client.beginTransaction((err?: Error | null) => {
					if (err) reject(err);
					else resolve();
				});
			});

			await new Promise<void>((resolve, reject) => {
				this.client.query(ddl, hashedIds, (err: Error | null) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});

			await new Promise<void>((resolve, reject) => {
				this.client.commitTransaction((err?: Error | null) => {
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
				this.client.rollbackTransaction(() => resolve(null));
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

		// Get embedding dimension
		const embeddingLen = await this.getEmbeddingDimension();
		const validatedEmbeddingLen = validatePositiveInteger(embeddingLen, 'embeddingLen');

		return await new Promise((resolve, reject) => {
			this.client.beginTransaction((beginErr?: Error | null) => {
				if (beginErr) {
					reject(new Error(`Failed to begin transaction: ${beginErr.message}`));
					return;
				}

				const commit = (commitCallback: (err?: Error | null) => void) => {
					this.client.commitTransaction(commitCallback);
				};

				const rollback = () => {
					this.client.rollbackTransaction((rollbackErr?: Error | null) => {
						if (rollbackErr) {
							console.error('Rollback failed:', rollbackErr);
						}
					});
				};

				let completed = 0;
				let hasError = false;

				const executeUpdate = (index: number): void => {
					if (hasError || index >= ids.length) {
						if (!hasError) {
							commit((commitErr?: Error | null) => {
								if (commitErr) {
									reject(new Error(`Failed to commit transaction: ${commitErr.message}`));
								} else {
									resolve();
								}
							});
						}
						return;
					}

					const id = this.hashAndTruncateId(ids[index]);
					const text = texts[index];
					const metadata = metadatas ? metadatas[index] : {};
					const embedding = embeddings[index];
					const embeddingList = `[${embedding.join(',')}]`;

					const sqlUpdate = `
						UPDATE ${this.qualifiedTableName}
						SET ${this.contentColumnName} = ?,
								${this.embeddingColumnName} = VECTOR(?, ${validatedEmbeddingLen}, FLOAT32),
								${this.metadataColumnName} = SYSTOOLS.JSON2BSON(?)
						WHERE ${this.idColumnName} = ?
					`;

					const params = [text, embeddingList, JSON.stringify(metadata), id];

					this.client.query(sqlUpdate, params, (err: Error | null) => {
						if (err) {
							hasError = true;
							rollback();
							reject(new Error(`Failed to update document ${ids[index]}: ${err.message}`));
							return;
						}

						completed++;
						executeUpdate(index + 1);
					});
				};

				executeUpdate(0);
			});
		});
	}

	/**
	 * Hash and truncate ID to 16 characters (matching Python implementation)
	 * Python: hashlib.sha256(_id.encode()).hexdigest()[:16].upper()
	 * This ensures IDs fit in CHAR(16) column
	 */
	private hashAndTruncateId(id: string): string {
		const hash = createHash('sha256').update(id).digest('hex');
		return hash.substring(0, 16).toUpperCase();
	}

	/**
	 * Create Db2VectorStore from texts
	 * Matches Python: from_texts (db2vs.py:674-713)
	 */
	static async fromTexts(
		texts: string[],
		metadatas: Array<Record<string, unknown>> | Record<string, unknown>,
		embeddings: Embeddings,
		dbConfig: Omit<DB2VectorStoreConfig, 'embeddingFunction'>,
	): Promise<DB2VectorStore> {
		// Drop table before creating new instance (matching Python db2vs.py:702)
		await dropTable(dbConfig.client, dbConfig.tableName);

		const instance = new DB2VectorStore(embeddings, {
			...dbConfig,
			embeddingFunction: embeddings,
		});

		const metadatasArray = Array.isArray(metadatas) ? metadatas : texts.map(() => metadatas);

		await instance.initialize();
		await instance.addTexts(texts, metadatasArray);

		return instance;
	}
}

// Made with Bob

/**
 * Extended DB2 Vector Store with automatic filter merging
 * Implements the standard n8n vector store pattern for filter handling
 */
export class ExtendedDB2VectorStore extends DB2VectorStore {
	private defaultFilter?: Record<string, unknown>;

	/**
	 * Create an ExtendedDB2VectorStore from an existing table
	 * @param embeddings - Embeddings instance
	 * @param config - DB2 vector store configuration
	 * @param defaultFilter - Default filter to merge with query filters
	 */
	static async fromExistingTable(
		embeddings: Embeddings,
		config: DB2VectorStoreConfig,
		defaultFilter?: Record<string, unknown>,
	): Promise<ExtendedDB2VectorStore> {
		const store = new ExtendedDB2VectorStore(embeddings, config);
		store.defaultFilter = defaultFilter;
		await store.ensureInitialized();
		return store;
	}

	/**
	 * Override similaritySearchVectorWithScore to merge default filter with query filter
	 */
	async similaritySearchVectorWithScore(
		embedding: number[],
		k: number = 4,
		filter?: SearchFilter,
	): Promise<Array<[Document, number]>> {
		// Merge default filter with query filter
		const mergedFilter = { ...this.defaultFilter, ...filter };
		return await super.similaritySearchVectorWithScore(embedding, k, mergedFilter);
	}
}
