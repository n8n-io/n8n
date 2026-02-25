import type { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import { VectorStore } from '@langchain/core/vectorstores';
import type { Connection, Table } from '@lancedb/lancedb';
import { nanoid } from 'nanoid';
import { jsonParse, type Logger } from 'n8n-workflow';
import { readFileSync } from 'node:fs';

interface LanceDBRecord extends Record<string, unknown> {
	id: string;
	vector: number[];
	content: string;
	metadata: string; // Store as JSON string to avoid schema inference issues
	createdAt: string; // Store as ISO string to avoid schema inference issues
	updatedAt: string; // Store as ISO string to avoid schema inference issues
}

export interface BinaryDataCredentials {
	mode: 'filesystem' | 's3';
	storagePath: string;
	bucket?: string;
	region?: string;
	accessKeyId?: string;
	secretAccessKey?: string;
	endpoint?: string;
}

function cgroupMemory(): string {
	try {
		const v2 = Number(readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim());
		return ` cgroup=${(v2 / 1024 / 1024).toFixed(1)}MB`;
	} catch {
		try {
			const v1 = Number(readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim());
			return ` cgroup=${(v1 / 1024 / 1024).toFixed(1)}MB`;
		} catch {
			return '';
		}
	}
}

/**
 * A VectorStore implementation that persists vectors using LanceDB with instance's binary data persistence
 *
 * This class bridges LangChain's VectorStore interface with LanceDB backend
 */
export class InternalLanceDBVectorStore extends VectorStore {
	private readonly storageConfig: BinaryDataCredentials;
	private readonly logger: Logger;

	constructor(
		binaryDataCredentials: BinaryDataCredentials,
		embeddings: Embeddings,
		private readonly memoryKey: string,
		logger: Logger,
	) {
		super(embeddings, {});
		this.storageConfig = binaryDataCredentials;
		this.logger = logger;
		this.logMemory(`constructor memoryKey=${memoryKey}`);
	}

	private logMemory(label: string): void {
		const { rss, heapUsed, heapTotal, external } = process.memoryUsage();
		const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)}MB`;
		this.logger.debug(
			`[LanceDB] ${label} | rss=${mb(rss)} heap=${mb(heapUsed)}/${mb(heapTotal)} ext=${mb(external)}${cgroupMemory()}`,
		);
	}

	/**
	 * List all available vector stores (tables) for given credentials
	 */
	static async listStores(
		binaryDataCredentials: BinaryDataCredentials,
		filter?: string,
	): Promise<string[]> {
		const storageConfig = binaryDataCredentials;
		const { connect } = await import('@lancedb/lancedb');

		let connection;
		try {
			if (storageConfig.mode === 's3') {
				connection = await connect({
					uri: storageConfig.storagePath,
					storageOptions: {
						region: storageConfig.region!,
						accessKeyId: storageConfig.accessKeyId!,
						secretAccessKey: storageConfig.secretAccessKey!,
						...(storageConfig.endpoint && { endpoint: storageConfig.endpoint }),
					},
				});
			} else {
				connection = await connect(storageConfig.storagePath);
			}

			let tableNames = await connection.tableNames();

			if (filter) {
				const filterLower = filter.toLowerCase();
				tableNames = tableNames.filter((name) => name.toLowerCase().includes(filterLower));
			}

			return tableNames;
		} catch (error) {
			// Directory doesn't exist yet or connection failed
			return [];
		} finally {
			connection?.close();
		}
	}

	/**
	 * Get or create a LanceDB connection
	 */
	private async withConnection<T>(fn: (conn: Connection) => Promise<T>): Promise<T> {
		const getConn = async () => {
			// Lazy-load LanceDB to avoid startup overhead
			const { connect } = await import('@lancedb/lancedb');

			if (this.storageConfig.mode === 's3') {
				// S3 backend - connect with credentials
				return await connect({
					uri: this.storageConfig.storagePath,
					storageOptions: {
						region: this.storageConfig.region!,
						accessKeyId: this.storageConfig.accessKeyId!,
						secretAccessKey: this.storageConfig.secretAccessKey!,
						...(this.storageConfig.endpoint && { endpoint: this.storageConfig.endpoint }),
					},
				});
			}

			// Filesystem backend - connect directly with path
			return await connect(this.storageConfig.storagePath);
		};

		let conn: Connection | undefined = undefined;

		this.logMemory(`withConnection open memoryKey=${this.memoryKey}`);
		try {
			conn = await getConn();
			return await fn(conn);
		} finally {
			if (conn) {
				conn.close();
			}
			this.logMemory(`withConnection close memoryKey=${this.memoryKey}`);
		}
	}

	/**
	 * Sanitize memory key for use as a table name (filesystem-safe)
	 */
	private sanitizeTableName(memoryKey: string): string {
		// Replace invalid filesystem characters with underscores
		return memoryKey.replace(/[^a-zA-Z0-9_-]/g, '_');
	}

	/**
	 * Get or create a LanceDB table
	 */
	private async withTable<T>(fn: (table: Table | null) => Promise<T>): Promise<T> {
		return await this.withConnection(async (connection) => {
			const tableName = this.sanitizeTableName(this.memoryKey);
			const tableNames = await connection.tableNames();

			if (!tableNames.includes(tableName)) {
				this.logger.debug(`[LanceDB] withTable table=${tableName} not found, passing null`);
				return await fn(null);
			}

			let table: Table | undefined = undefined;

			this.logMemory(`withTable openTable=${tableName}`);
			try {
				table = await connection.openTable(tableName);
				return await fn(table);
			} finally {
				if (table) {
					table.close();
				}
				this.logMemory(`withTable closeTable=${tableName}`);
			}
		});
	}

	/**
	 * Build SQL WHERE clause from metadata filter
	 * Note: Metadata is stored as JSON string, so we use LIKE for simple string matching
	 */
	private buildWhereClause(filter?: Record<string, unknown>): string | undefined {
		if (!filter || Object.keys(filter).length === 0) {
			return undefined;
		}

		const conditions: string[] = [];

		for (const [key, value] of Object.entries(filter)) {
			// Build a JSON pattern to search for the key-value pair
			// This is a simple approach that works for basic filtering
			const escapedKey = key.replace(/'/g, "''");

			// Use LIKE to search for the pattern in the JSON string
			conditions.push(`metadata LIKE '%"${escapedKey}":${JSON.stringify(value)}%'`);
		}

		return conditions.join(' AND ');
	}

	/**
	 * Add documents to the vector store
	 */
	async addDocuments(documents: Document[]): Promise<string[]> {
		this.logger.debug(
			`[LanceDB] addDocuments count=${documents.length} memoryKey=${this.memoryKey}`,
		);
		this.logMemory(`addDocuments start count=${documents.length}`);

		const texts = documents.map((doc) => doc.pageContent);

		this.logMemory('addDocuments before embedDocuments');
		const embeddings = await this.embeddings.embedDocuments(texts);
		this.logMemory(`addDocuments after embedDocuments dims=${embeddings[0]?.length ?? 0}`);

		const result = await this.addVectors(embeddings, documents);
		this.logMemory('addDocuments end');
		return result;
	}

	/**
	 * Add vectors to the store
	 */
	async addVectors(vectors: number[][], documents: Document[]): Promise<string[]> {
		this.logger.debug(`[LanceDB] addVectors count=${vectors.length} memoryKey=${this.memoryKey}`);
		this.logMemory(`addVectors start count=${vectors.length} dim=${vectors[0]?.length ?? 0}`);

		return await this.withConnection(async (connection) => {
			const tableName = this.sanitizeTableName(this.memoryKey);
			const tableNames = await connection.tableNames();
			const tableExists = tableNames.includes(tableName);

			this.logger.debug(`[LanceDB] addVectors table=${tableName} exists=${tableExists}`);

			const now = new Date().toISOString();
			const records: LanceDBRecord[] = documents.map((doc, i) => ({
				id: nanoid(),
				vector: vectors[i],
				content: doc.pageContent,
				metadata: JSON.stringify(doc.metadata), // Serialize metadata to JSON string
				createdAt: now,
				updatedAt: now,
			}));

			const recordsBytes = vectors.length * (vectors[0]?.length ?? 0) * 8;
			this.logMemory(
				`addVectors records built approxVectorBytes=${(recordsBytes / 1024 / 1024).toFixed(1)}MB`,
			);

			if (!tableExists) {
				// Create table with the first batch of records
				if (records.length === 0) {
					throw new Error('Cannot create table with no records');
				}
				this.logMemory(`addVectors before createTable table=${tableName}`);
				const table = await connection.createTable(tableName, records);
				table.close();
				this.logMemory(`addVectors after createTable table=${tableName}`);
			} else {
				let table: Table | undefined = undefined;
				try {
					this.logMemory(`addVectors before openTable table=${tableName}`);
					table = await connection.openTable(tableName);
					this.logMemory(`addVectors before add table=${tableName}`);
					await table.add(records);
					this.logMemory(`addVectors after add table=${tableName}`);
					// Do NOT call optimize() here: it triggers a full table rewrite
					// (~2× peak memory) on every batch, causing OOM on large tables.
					// withConnection() gives each call a fresh connection so fragment
					// mmap pages are released when it closes, preventing accumulation.
				} finally {
					table?.close();
					this.logMemory(`addVectors after closeTable table=${tableName}`);
				}
			}

			this.logMemory('addVectors end');
			return records.map(({ id }) => id);
		});
	}

	/**
	 * Perform similarity search and return documents with scores
	 */
	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<Array<[Document, number]>> {
		this.logger.debug(
			`[LanceDB] similaritySearch k=${k} hasFilter=${!!filter} memoryKey=${this.memoryKey}`,
		);
		this.logMemory('similaritySearch start');

		return await this.withTable(async (table) => {
			if (!table) {
				this.logger.debug('[LanceDB] similaritySearch table not found, returning empty');
				return [];
			}

			let lanceQuery = table.search(query).limit(k);

			const whereClause = this.buildWhereClause(filter);
			if (whereClause) {
				lanceQuery = lanceQuery.where(whereClause);
			}

			this.logMemory('similaritySearch before toArray');
			const results = await lanceQuery.toArray();
			this.logMemory(`similaritySearch after toArray resultCount=${results.length}`);

			return results.map((row: LanceDBRecord & { _distance: number }) => {
				const doc = new Document({
					pageContent: row.content,
					metadata: jsonParse(row.metadata), // Deserialize metadata from JSON string
				});
				const score = 1 - row._distance; // Convert distance to similarity score (cosine: 0=identical, 2=opposite)
				return [doc, score];
			});
		});
	}

	/**
	 * Return documents selected using the maximal marginal relevance
	 * Not implemented for LanceDB vector store
	 */
	async maxMarginalRelevanceSearch(
		_query: string,
		_options: { k: number; fetchK?: number; lambda?: number; filter?: Record<string, unknown> },
	): Promise<Document[]> {
		throw new Error('maxMarginalRelevanceSearch is not supported for DatabaseVectorStore');
	}

	/**
	 * Get type identifier
	 */
	_vectorstoreType(): string {
		return 'lancedb';
	}

	/**
	 * Clear all vectors for this memory key
	 */
	async clearStore(): Promise<void> {
		this.logger.debug(`[LanceDB] clearStore memoryKey=${this.memoryKey}`);
		this.logMemory('clearStore start');
		return await this.withTable(async (table) => {
			await table?.delete('true'); // Delete all rows
			this.logMemory('clearStore after delete');
		});
	}

	/**
	 * Get count of vectors in the store
	 */
	async getVectorCount(): Promise<number> {
		this.logMemory(`getVectorCount start memoryKey=${this.memoryKey}`);
		return await this.withTable(async (table) => {
			const count = (await table?.countRows()) ?? 0;
			this.logger.debug(`[LanceDB] getVectorCount count=${count} memoryKey=${this.memoryKey}`);
			return count;
		});
	}
}
