/**
 * DB2 Vector Store implementation for n8n
 * Ported from db2vs.py
 */

import { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';

import {
	validateIdentifier,
	getQuotedIdentifier,
	sanitizeSqlString,
	createSafeErrorMessage,
} from './db2Security';
import type { DistanceStrategy, DB2VectorStoreConfig, ColumnMapping, SearchFilter } from './types';
import { DistanceStrategy as DS } from './types';

/**
 * Get quoted table identifier
 */
function getQuotedTableIdentifier(tableName: string): string {
	return getQuotedIdentifier(tableName);
}

/**
 * Check if table exists in DB2
 */
async function tableExists(client: any, tableName: string): Promise<boolean> {
	const quotedTable = getQuotedTableIdentifier(tableName);
	try {
		const query = `SELECT COUNT(*) FROM ${quotedTable}`;
		await new Promise((resolve, reject) => {
			client.query(query, (err: Error, result: any) => {
				if (err) reject(err);
				else resolve(result);
			});
		});
		return true;
	} catch (error: any) {
		if (error.message && error.message.includes('SQL0204N')) {
			return false;
		}
		throw error;
	}
}

/**
 * Get column names from DB2 table
 */
async function getColumnNames(client: any, tableName: string): Promise<ColumnMapping> {
	const query = `
		SELECT COLNAME
		FROM SYSCAT.COLUMNS
		WHERE TABNAME = ?
		ORDER BY COLNO
	`;

	return new Promise((resolve, reject) => {
		client.query(query, [tableName.toUpperCase()], (err: Error, results: any[]) => {
			if (err) {
				reject(err);
				return;
			}

			if (!results || results.length === 0) {
				// Return default quoted column names
				resolve({
					id: '"id"',
					text: '"text"',
					metadata: '"metadata"',
					embedding: '"embedding"',
				});
				return;
			}

			const actualColumns: Record<string, string> = {};
			for (const row of results) {
				const colName = row.COLNAME.trim();
				const colLower = colName.toLowerCase();

				// Check if column is uppercase (unquoted) or mixed case (quoted)
				if (colName === colName.toUpperCase()) {
					actualColumns[colLower] = colName;
				} else {
					actualColumns[colLower] = `"${colName}"`;
				}
			}

			// Map logical names to actual column names
			const columnMap: ColumnMapping = {
				id: actualColumns.id || actualColumns._id || '"id"',
				text: actualColumns.text || actualColumns.content || actualColumns.data || '"text"',
				metadata:
					actualColumns.metadata || actualColumns.meta || actualColumns.properties || '"metadata"',
				embedding:
					actualColumns.embedding ||
					actualColumns.vector ||
					actualColumns.embeddings ||
					'"embedding"',
			};

			resolve(columnMap);
		});
	});
}

/**
 * Get distance function name for DB2
 */
function getDistanceFunction(distanceStrategy: DistanceStrategy): string {
	const strategyMap: Record<DistanceStrategy, string> = {
		[DS.EUCLIDEAN]: 'EUCLIDEAN',
		[DS.DOT_PRODUCT]: 'DOT',
		[DS.COSINE]: 'COSINE',
	};

	const func = strategyMap[distanceStrategy];
	if (!func) {
		throw new Error(`Unsupported distance strategy: ${distanceStrategy}`);
	}

	return func;
}

/**
 * Create table for vector storage
 */
async function createTable(client: any, tableName: string, embeddingDim: number): Promise<void> {
	const validatedTableName = validateIdentifier(tableName, 'table name');

	const colsDict = {
		id: 'VARCHAR(100) PRIMARY KEY NOT NULL',
		text: 'CLOB(10M)',
		metadata: 'CLOB(1M)',
		embedding: `vector(${embeddingDim}, FLOAT32)`,
	};

	const exists = await tableExists(client, validatedTableName);
	if (!exists) {
		const ddlBody = Object.entries(colsDict)
			.map(([colName, colType]) => `"${colName}" ${colType}`)
			.join(', ');

		const quotedTable = getQuotedTableIdentifier(validatedTableName);
		const ddl = `CREATE TABLE ${quotedTable} (${ddlBody})`;

		await new Promise((resolve, reject) => {
			client.query(ddl, (err: Error) => {
				if (err) reject(err);
				else resolve(null);
			});
		});

		await new Promise((resolve, reject) => {
			client.query('COMMIT', (err: Error) => {
				if (err) reject(err);
				else resolve(null);
			});
		});
	}
}

/**
 * Drop table from DB2
 */
export async function dropTable(client: any, tableName: string): Promise<void> {
	const validatedTableName = validateIdentifier(tableName, 'table name');
	const quotedTableName = getQuotedTableIdentifier(validatedTableName);
	const ddl = `DROP TABLE ${quotedTableName}`;

	await new Promise((resolve, reject) => {
		client.query(ddl, (err: Error) => {
			if (err) reject(err);
			else resolve(null);
		});
	});
}

/**
 * DB2 Vector Store class
 */
export class DB2VectorStore extends VectorStore {
	private client: any;
	private tableName: string;
	private distanceStrategy: DistanceStrategy;
	private columnNames: ColumnMapping;

	_vectorstoreType(): string {
		return 'db2';
	}

	constructor(embeddings: Embeddings, config: DB2VectorStoreConfig) {
		super(embeddings, config);

		// Validate table name
		const validatedTableName = validateIdentifier(config.tableName, 'table name');

		this.client = config.client;
		this.tableName = validatedTableName;
		this.distanceStrategy = config.distanceStrategy || DS.EUCLIDEAN;
		this.columnNames = {
			id: '"id"',
			text: '"text"',
			metadata: '"metadata"',
			embedding: '"embedding"',
		};
	}

	/**
	 * Initialize the vector store
	 */
	async initialize(): Promise<void> {
		try {
			// Get embedding dimension
			const embeddingDim = await this.getEmbeddingDimension();

			// Create table if it doesn't exist
			await createTable(this.client, this.tableName, embeddingDim);

			// Get actual column names
			this.columnNames = await getColumnNames(this.client, this.tableName);
		} catch (error) {
			const safeMsg = createSafeErrorMessage(error as Error, 'while initializing vector store');
			throw new Error(safeMsg);
		}
	}

	/**
	 * Get embedding dimension
	 */
	private async getEmbeddingDimension(): Promise<number> {
		const embeddedDocument = await this.embeddings.embedQuery('test');
		return embeddedDocument.length;
	}

	/**
	 * Validate embedding dimension
	 */
	private validateEmbeddingDimension(embeddings: number[][]): void {
		if (embeddings.length === 0) return;

		const expectedDim = embeddings[0].length;

		for (const embedding of embeddings) {
			if (embedding.length !== expectedDim) {
				throw new Error(
					`Embedding dimension mismatch: expected ${expectedDim}, got ${embedding.length}`,
				);
			}
		}
	}

	/**
	 * Filter metadata to keep only essential fields
	 */
	private filterMetadata(metadata: Record<string, any>): Record<string, any> {
		// Extract only essential fields for storage
		const filtered: Record<string, any> = {};

		// Keep source information if available
		if (metadata.source) {
			filtered.source = metadata.source;
		}

		// Keep line number if available (useful for CSV)
		if (metadata.line !== undefined) {
			filtered.line = metadata.line;
		}

		// Keep any custom fields that are simple types (not nested objects)
		const allowedFields = ['id', 'title', 'author', 'date', 'category', 'tags'];
		for (const field of allowedFields) {
			if (metadata[field] !== undefined && typeof metadata[field] !== 'object') {
				filtered[field] = metadata[field];
			}
		}

		return filtered;
	}

	/**
	 * Add documents to the vector store
	 */
	async addDocuments(documents: Document[], options?: { ids?: string[] }): Promise<string[]> {
		const texts = documents.map((doc) => doc.pageContent);
		const metadatas = documents.map((doc) => this.filterMetadata(doc.metadata || {}));
		return this.addTexts(texts, metadatas, options);
	}

	/**
	 * Add vectors to the vector store
	 */
	async addVectors(
		vectors: number[][],
		documents: Document[],
		options?: { ids?: string[] },
	): Promise<string[]> {
		if (vectors.length === 0 || documents.length === 0) {
			throw new Error('No vectors or documents provided');
		}

		if (vectors.length !== documents.length) {
			throw new Error('Number of vectors and documents must match');
		}

		// Generate or use provided IDs
		const ids = options?.ids || vectors.map(() => this.generateId());

		this.validateEmbeddingDimension(vectors);

		// Insert into database
		const quotedTable = getQuotedTableIdentifier(this.tableName);

		for (let i = 0; i < vectors.length; i++) {
			const id = ids[i];
			const embedding = vectors[i];
			const text = documents[i].pageContent;
			const metadata = this.filterMetadata(documents[i].metadata || {});

			const embeddingList = `[${embedding.join(',')}]`;
			const textSanitized = sanitizeSqlString(text);
			const metadataJson = JSON.stringify(metadata);
			const metadataSanitized = sanitizeSqlString(metadataJson);
			const idSanitized = sanitizeSqlString(id);
			const embeddingSanitized = sanitizeSqlString(embeddingList);

			const sqlInsert = `
				INSERT INTO ${quotedTable}
				(${this.columnNames.id}, ${this.columnNames.text}, ${this.columnNames.metadata}, ${this.columnNames.embedding})
				VALUES ('${idSanitized}', '${textSanitized}', '${metadataSanitized}', '${embeddingSanitized}')
			`;

			console.log('\n=== [DB2VectorStore] INSERT SQL (addVectors) - FULL QUERY ===');
			console.log('Query:', sqlInsert);
			console.log('Embedding value:', embeddingSanitized);
			console.log('Embedding length:', embedding.length);
			console.log('First 5 values:', embedding.slice(0, 5));
			console.log('=== END QUERY ===\n');

			try {
				await new Promise((resolve, reject) => {
					this.client.query(sqlInsert, (err: Error) => {
						if (err) {
							console.error('\n=== [DB2VectorStore] INSERT ERROR (addVectors) ===');
							console.error('Error message:', err.message);
							console.error('Error stack:', err.stack);
							console.error('Failed query:', sqlInsert);
							console.error('Embedding value that failed:', embeddingSanitized);
							console.error('=== END ERROR ===\n');
							reject(err);
						} else {
							console.log('[DB2VectorStore] Insert successful for ID:', id);
							resolve(null);
						}
					});
				});
			} catch (error: any) {
				console.error('\n=== [DB2VectorStore] CAUGHT INSERT ERROR (addVectors) ===');
				console.error('Error:', error);
				console.error('Error message:', error.message);
				console.error('Error code:', error.code);
				console.error('SQLSTATE:', error.state);
				console.error('Failed SQL:', sqlInsert);
				console.error('=== END CAUGHT ERROR ===\n');
				throw error;
			}
		}

		// Commit transaction
		await new Promise((resolve, reject) => {
			this.client.query('COMMIT', (err: Error) => {
				if (err) reject(err);
				else resolve(null);
			});
		});

		return ids;
	}

	/**
	 * Add texts to the vector store
	 */
	async addTexts(
		texts: string[],
		metadatas?: Record<string, any>[],
		options?: { ids?: string[] },
	): Promise<string[]> {
		if (texts.length === 0) {
			throw new Error('No texts provided');
		}

		// Generate or use provided IDs
		const ids = options?.ids || texts.map(() => this.generateId());

		// Generate embeddings
		const embeddings = await this.embeddings.embedDocuments(texts);
		this.validateEmbeddingDimension(embeddings);

		// Insert into database
		const quotedTable = getQuotedTableIdentifier(this.tableName);

		for (let i = 0; i < texts.length; i++) {
			const id = ids[i];
			const embedding = embeddings[i];
			const text = texts[i];
			const metadata = metadatas?.[i] || {};

			const embeddingList = `[${embedding.join(',')}]`;
			const textSanitized = sanitizeSqlString(text);
			const metadataJson = JSON.stringify(metadata);
			const metadataSanitized = sanitizeSqlString(metadataJson);
			const idSanitized = sanitizeSqlString(id);
			const embeddingSanitized = sanitizeSqlString(embeddingList);

			const sqlInsert = `
				INSERT INTO ${quotedTable}
				(${this.columnNames.id}, ${this.columnNames.text}, ${this.columnNames.metadata}, ${this.columnNames.embedding})
				VALUES ('${idSanitized}', '${textSanitized}', '${metadataSanitized}', '${embeddingSanitized}')
			`;

			console.log('\n=== [DB2VectorStore] INSERT SQL (addTexts) - FULL QUERY ===');
			console.log('Query:', sqlInsert);
			console.log('Embedding value:', embeddingSanitized);
			console.log('Embedding length:', embedding.length);
			console.log('First 5 values:', embedding.slice(0, 5));
			console.log('=== END QUERY ===\n');

			try {
				await new Promise((resolve, reject) => {
					this.client.query(sqlInsert, (err: Error) => {
						if (err) {
							console.error('\n=== [DB2VectorStore] INSERT ERROR (addTexts) ===');
							console.error('Error message:', err.message);
							console.error('Error stack:', err.stack);
							console.error('Failed query:', sqlInsert);
							console.error('Embedding value that failed:', embeddingSanitized);
							console.error('=== END ERROR ===\n');
							reject(err);
						} else {
							console.log('[DB2VectorStore] Insert successful for ID:', id);
							resolve(null);
						}
					});
				});
			} catch (error: any) {
				console.error('\n=== [DB2VectorStore] CAUGHT INSERT ERROR (addTexts) ===');
				console.error('Error:', error);
				console.error('Error message:', error.message);
				console.error('Error code:', error.code);
				console.error('SQLSTATE:', error.state);
				console.error('Failed SQL:', sqlInsert);
				console.error('=== END CAUGHT ERROR ===\n');
				throw error;
			}
		}

		// Commit transaction
		await new Promise((resolve, reject) => {
			this.client.query('COMMIT', (err: Error) => {
				if (err) reject(err);
				else resolve(null);
			});
		});

		return ids;
	}

	/**
	 * Similarity search
	 */
	async similaritySearch(query: string, k: number = 4, filter?: SearchFilter): Promise<Document[]> {
		const embedding = await this.embeddings.embedQuery(query);
		return this.similaritySearchVectorWithScore(embedding, k, filter).then((results) =>
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
	): Promise<[Document, number][]> {
		const embedding = await this.embeddings.embedQuery(query);
		return this.similaritySearchVectorWithScore(embedding, k, filter);
	}

	/**
	 * Similarity search by vector with score
	 */
	async similaritySearchVectorWithScore(
		embedding: number[],
		k: number = 4,
		_filter?: SearchFilter,
	): Promise<[Document, number][]> {
		const distanceFunc = getDistanceFunction(this.distanceStrategy);
		const quotedTable = getQuotedTableIdentifier(this.tableName);

		const embeddingList = `[${embedding.join(',')}]`;
		const embeddingSanitized = sanitizeSqlString(embeddingList);
		const vectorDimension = embedding.length;

		// DB2 requires the VECTOR() constructor function to create a vector from string
		// Format: VECTOR('[1,2,3,...]', dimension, FLOAT32)
		// Function name is lowercase: vector_distance
		const query = `
			SELECT ${this.columnNames.id}, ${this.columnNames.text},
			       ${this.columnNames.metadata}, ${this.columnNames.embedding},
			       vector_distance(
			           ${this.columnNames.embedding},
			           VECTOR('${embeddingSanitized}', ${vectorDimension}, FLOAT32),
			           ${distanceFunc}
			       ) AS distance
			FROM ${quotedTable}
			ORDER BY distance
			FETCH FIRST ${k} ROWS ONLY
		`;

		console.log('\n=== [DB2VectorStore] SIMILARITY SEARCH SQL - FULL QUERY ===');
		console.log('Query:', query);
		console.log('Embedding value:', embeddingSanitized);
		console.log('Embedding length:', embedding.length);
		console.log('Distance function:', distanceFunc);
		console.log('=== END QUERY ===\n');

		return new Promise((resolve, reject) => {
			this.client.query(query, (err: Error, results: any[]) => {
				if (err) {
					console.error('\n=== [DB2VectorStore] SIMILARITY SEARCH ERROR ===');
					console.error('Error message:', err.message);
					console.error('Error stack:', err.stack);
					console.error('Failed query:', query);
					console.error('Embedding value that failed:', embeddingSanitized);
					console.error('=== END ERROR ===\n');
					reject(err);
					return;
				}

				const documents: [Document, number][] = results.map((result) => {
					const metaRaw = result[this.columnNames.metadata.replace(/"/g, '').toUpperCase()];
					let metadata = {};
					try {
						metadata = JSON.parse(metaRaw);
					} catch {
						metadata = {};
					}

					const doc = new Document({
						pageContent: result[this.columnNames.text.replace(/"/g, '').toUpperCase()],
						metadata,
					});

					const distance = result.DISTANCE;
					return [doc, distance];
				});

				resolve(documents);
			});
		});
	}

	/**
	 * Maximum marginal relevance search
	 */
	async maxMarginalRelevanceSearch(
		query: string,
		options: {
			k: number;
			fetchK?: number;
			lambda?: number;
			filter?: SearchFilter;
		},
	): Promise<Document[]> {
		const { k, fetchK = 20 } = options;
		const embedding = await this.embeddings.embedQuery(query);

		// Fetch more documents than needed
		const docsAndScores = await this.similaritySearchVectorWithScore(embedding, fetchK);

		// Extract embeddings (we need to fetch them separately in a real implementation)
		const documents = docsAndScores.map(([doc]) => doc);

		// For now, return top k documents
		// Full MMR implementation would require fetching embeddings
		return documents.slice(0, k);
	}

	/**
	 * Delete documents by IDs
	 */
	async delete(options: { ids: string[] }): Promise<void> {
		const { ids } = options;
		if (!ids || ids.length === 0) {
			throw new Error('No IDs provided for deletion');
		}

		const quotedTable = getQuotedTableIdentifier(this.tableName);
		const placeholders = ids.map((id) => `'${sanitizeSqlString(id)}'`).join(',');
		const ddl = `DELETE FROM ${quotedTable} WHERE ${this.columnNames.id} IN (${placeholders})`;

		await new Promise((resolve, reject) => {
			this.client.query(ddl, (err: Error) => {
				if (err) reject(err);
				else resolve(null);
			});
		});

		await new Promise((resolve, reject) => {
			this.client.query('COMMIT', (err: Error) => {
				if (err) reject(err);
				else resolve(null);
			});
		});
	}

	/**
	 * Generate a unique ID
	 */
	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
	}

	/**
	 * Create DB2VectorStore from texts
	 */
	static async fromTexts(
		texts: string[],
		metadatas: Record<string, any>[] | Record<string, any>,
		embeddings: Embeddings,
		dbConfig: Omit<DB2VectorStoreConfig, 'embeddingFunction'>,
	): Promise<DB2VectorStore> {
		const instance = new DB2VectorStore(embeddings, {
			...dbConfig,
			embeddingFunction: embeddings,
		});

		await instance.initialize();

		const metadatasArray = Array.isArray(metadatas) ? metadatas : texts.map(() => metadatas);

		await instance.addTexts(texts, metadatasArray);

		return instance;
	}

	/**
	 * Create DB2VectorStore from documents
	 */
	static async fromDocuments(
		docs: Document[],
		embeddings: Embeddings,
		dbConfig: Omit<DB2VectorStoreConfig, 'embeddingFunction'>,
	): Promise<DB2VectorStore> {
		const instance = new DB2VectorStore(embeddings, {
			...dbConfig,
			embeddingFunction: embeddings,
		});

		await instance.initialize();
		await instance.addDocuments(docs);

		return instance;
	}

	/**
	 * Create DB2VectorStore from existing index
	 */
	static async fromExistingIndex(
		embeddings: Embeddings,
		dbConfig: Omit<DB2VectorStoreConfig, 'embeddingFunction'>,
	): Promise<DB2VectorStore> {
		const instance = new DB2VectorStore(embeddings, {
			...dbConfig,
			embeddingFunction: embeddings,
		});

		await instance.initialize();

		return instance;
	}
}

// Made with Bob
