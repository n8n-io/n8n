import { Service } from '@n8n/di';
import { VectorStoreConfig } from '@n8n/config';
import type { VectorDocument, VectorSearchResult } from 'n8n-workflow';
import { jsonParse, OperationalError } from 'n8n-workflow';
import { Logger } from '@n8n/backend-common';
import { InstanceSettings } from 'n8n-core';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { Connection, Table } from '@lancedb/lancedb';
import { nanoid } from 'nanoid';

interface LanceDBRecord extends Record<string, unknown> {
	id: string;
	vector: number[];
	content: string;
	metadata: string; // Store as JSON string to avoid schema inference issues
	createdAt: string; // Store as ISO string to avoid schema inference issues
	updatedAt: string; // Store as ISO string to avoid schema inference issues
}

/**
 * LanceDB-backed vector store implementation.
 * Stores vectors in file-based LanceDB tables under ~/.n8n/vector-store/projects/{projectId}/{memoryKey}.lance/
 */
@Service()
export class VectorStoreDataRepository {
	private connectionCache = new Map<string, Connection>();
	private basePath: string;
	private readonly logger: Logger;

	constructor(
		private readonly config: VectorStoreConfig,
		private readonly instanceSettings: InstanceSettings,
		logger: Logger,
	) {
		// Resolve base path relative to n8n user directory
		const userHome = this.instanceSettings.n8nFolder;
		this.basePath = path.join(userHome, this.config.lancedbPath);
		this.logger = logger.scoped('vector-store');
	}

	/**
	 * Initialize LanceDB storage directory
	 */
	async init(): Promise<void> {
		try {
			await fs.mkdir(this.basePath, { recursive: true });
			this.logger.debug(`LanceDB storage initialized at: ${this.basePath}`);
		} catch (error) {
			throw new OperationalError(
				`Failed to initialize LanceDB storage: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Cleanup connections on shutdown
	 */
	async shutdown(): Promise<void> {
		for (const [projectId, connection] of this.connectionCache.entries()) {
			try {
				connection.close();
				this.logger.debug(`Closed LanceDB connection for project: ${projectId}`);
			} catch (error) {
				this.logger.error(`Error closing LanceDB connection for project ${projectId}`, {
					error: error as Error,
				});
			}
		}
		this.connectionCache.clear();
	}

	/**
	 * Get or create a LanceDB connection for a project
	 */
	private async getConnection(projectId: string): Promise<Connection> {
		let connection = this.connectionCache.get(projectId);

		if (!connection) {
			// Lazy-load LanceDB to avoid startup overhead
			const { connect } = await import('@lancedb/lancedb');

			const projectPath = path.join(this.basePath, 'projects', projectId);
			await fs.mkdir(projectPath, { recursive: true });

			connection = await connect(projectPath);
			this.connectionCache.set(projectId, connection);

			this.logger.debug(`Created LanceDB connection for project: ${projectId}`);
		}

		return connection;
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
	private async getTable(
		projectId: string,
		memoryKey: string,
		createIfMissing: boolean = false,
	): Promise<Table | null> {
		const connection = await this.getConnection(projectId);
		const tableName = this.sanitizeTableName(memoryKey);

		const tableNames = await connection.tableNames();

		if (!tableNames.includes(tableName)) {
			if (!createIfMissing) {
				return null;
			}
			// Table will be created in addVectors when we have actual data
			throw new OperationalError(`Table ${tableName} does not exist yet`);
		}

		return await connection.openTable(tableName);
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
	 * Add vectors to the store
	 */
	async addVectors(
		memoryKey: string,
		projectId: string,
		documents: VectorDocument[],
		embeddings: number[][],
		clearStore: boolean = false,
	): Promise<void> {
		const startTime = performance.now();

		const connection = await this.getConnection(projectId);
		const tableName = this.sanitizeTableName(memoryKey);
		const tableNames = await connection.tableNames();
		const tableExists = tableNames.includes(tableName);

		const now = new Date().toISOString();
		const records: LanceDBRecord[] = documents.map((doc, i) => ({
			id: nanoid(),
			vector: embeddings[i],
			content: doc.content,
			metadata: JSON.stringify(doc.metadata), // Serialize metadata to JSON string
			createdAt: now,
			updatedAt: now,
		}));

		const vectorDimension = embeddings.length > 0 ? embeddings[0].length : 0;

		if (!tableExists) {
			// Create table with the first batch of records
			if (records.length === 0) {
				throw new OperationalError('Cannot create table with no records');
			}
			await connection.createTable(tableName, records);

			const duration = performance.now() - startTime;
			this.logger.info(
				`Created table ${tableName} with ${records.length} vectors (${vectorDimension}d) in ${duration.toFixed(2)}ms`,
			);
		} else {
			const table = await connection.openTable(tableName);

			if (clearStore) {
				// Delete all records
				await table.delete('true'); // Delete all rows (SQL WHERE clause: true)
			}

			if (records.length > 0) {
				await table.add(records);

				const duration = performance.now() - startTime;
				this.logger.info(
					`Indexed ${records.length} vectors (${vectorDimension}d) to ${memoryKey} in ${duration.toFixed(2)}ms (${(records.length / (duration / 1000)).toFixed(0)} vectors/sec)`,
				);
			}
		}
	}

	/**
	 * Perform similarity search
	 */
	async similaritySearch(
		memoryKey: string,
		projectId: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<VectorSearchResult[]> {
		const startTime = performance.now();

		const table = await this.getTable(projectId, memoryKey);

		if (!table) {
			// Table doesn't exist yet, return empty results
			return [];
		}

		let query = table.search(queryEmbedding).limit(k);

		const whereClause = this.buildWhereClause(filter);
		if (whereClause) {
			query = query.where(whereClause);
		}

		const results = await query.toArray();

		const duration = performance.now() - startTime;
		const vectorDimension = queryEmbedding.length;
		const filterInfo = filter ? ' with filter' : '';

		this.logger.info(
			`Similarity search in ${memoryKey}: found ${results.length}/${k} results (${vectorDimension}d)${filterInfo} in ${duration.toFixed(2)}ms`,
		);

		return results.map((row: LanceDBRecord & { _distance: number }) => ({
			document: {
				content: row.content,
				metadata: jsonParse(row.metadata), // Deserialize metadata from JSON string
			},
			score: 1 - row._distance, // Convert distance to similarity score (cosine: 0=identical, 2=opposite)
		}));
	}

	/**
	 * Get count of vectors
	 */
	async getVectorCount(memoryKey: string, projectId: string): Promise<number> {
		const table = await this.getTable(projectId, memoryKey);
		if (!table) {
			// Table doesn't exist yet
			return 0;
		}
		return await table.countRows();
	}

	/**
	 * Clear all vectors for a memory key
	 */
	async clearStore(memoryKey: string, projectId: string): Promise<void> {
		const table = await this.getTable(projectId, memoryKey);
		if (!table) {
			// Table doesn't exist, nothing to clear
			this.logger.debug(`Store ${memoryKey} does not exist in project ${projectId}`);
			return;
		}
		await table.delete('true'); // Delete all rows
		this.logger.debug(`Cleared store ${memoryKey} in project ${projectId}`);
	}

	/**
	 * Delete entire store (removes table directory)
	 */
	async deleteStore(memoryKey: string, projectId: string): Promise<void> {
		try {
			const connection = await this.getConnection(projectId);
			const tableName = this.sanitizeTableName(memoryKey);

			// Drop the table
			await connection.dropTable(tableName);

			this.logger.debug(`Deleted store ${memoryKey} from project ${projectId}`);
		} catch (error) {
			// Table doesn't exist, nothing to delete
			this.logger.debug(`Store ${memoryKey} does not exist in project ${projectId}`);
		}
	}

	/**
	 * Delete vectors by file names in metadata
	 */
	async deleteByFileNames(
		memoryKey: string,
		projectId: string,
		fileNames: string[],
	): Promise<number> {
		if (fileNames.length === 0) {
			return 0;
		}

		const table = await this.getTable(projectId, memoryKey);
		if (!table) {
			// Table doesn't exist, nothing to delete
			return 0;
		}

		try {
			// Build WHERE clause for fileName using LIKE (since metadata is JSON string)
			const conditions = fileNames.map((name) => {
				const escapedName = name.replace(/'/g, "''");
				return `metadata LIKE '%"fileName":"${escapedName}"%'`;
			});
			const whereClause = conditions.join(' OR ');

			// Count before deletion
			const countBefore = await table.countRows(whereClause);

			// Delete matching rows
			await table.delete(whereClause);

			this.logger.debug(
				`Deleted ${countBefore} vectors by fileName from ${memoryKey} in project ${projectId}`,
			);

			return countBefore;
		} catch (error) {
			this.logger.error('Error deleting vectors by file names', { error: error as Error });
			return 0;
		}
	}

	/**
	 * List all memory keys for a project
	 */
	async listStores(projectId: string, filter?: string): Promise<string[]> {
		try {
			const connection = await this.getConnection(projectId);
			let tableNames = await connection.tableNames();

			if (filter) {
				const filterLower = filter.toLowerCase();
				tableNames = tableNames.filter((name) => name.toLowerCase().includes(filterLower));
			}

			return tableNames;
		} catch (error) {
			// Project directory doesn't exist yet
			return [];
		}
	}

	/**
	 * Get total size of all vector stores (instance-wide)
	 */
	async getTotalSize(): Promise<number> {
		try {
			return await this.getDirectorySize(this.basePath);
		} catch (error) {
			this.logger.error('Error calculating total vector store size', { error: error as Error });
			return 0;
		}
	}

	/**
	 * Recursively calculate directory size
	 */
	private async getDirectorySize(dirPath: string): Promise<number> {
		let totalSize = 0;

		try {
			const entries = await fs.readdir(dirPath, { withFileTypes: true });

			for (const entry of entries) {
				const entryPath = path.join(dirPath, entry.name);

				if (entry.isDirectory()) {
					totalSize += await this.getDirectorySize(entryPath);
				} else if (entry.isFile()) {
					const stats = await fs.stat(entryPath);
					totalSize += stats.size;
				}
			}
		} catch (error) {
			// Directory doesn't exist or is inaccessible
			return 0;
		}

		return totalSize;
	}
}
