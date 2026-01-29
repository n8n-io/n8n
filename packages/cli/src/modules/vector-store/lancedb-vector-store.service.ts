import { Service } from '@n8n/di';
import { LanceDBConfig, VectorStoreConfig } from '@n8n/config';
import type { VectorDocument, VectorSearchResult } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';
import { Logger } from '@n8n/backend-common';
import { UserSettings } from 'n8n-core';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { Connection, Table } from '@lancedb/lancedb';
import { nanoid } from 'nanoid';

interface LanceDBRecord {
	id: string;
	vector: number[];
	content: string;
	metadata: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * LanceDB-backed vector store implementation.
 * Stores vectors in file-based LanceDB tables under ~/.n8n/vector-store/projects/{projectId}/{memoryKey}.lance/
 */
@Service()
export class LanceDBVectorStoreService {
	private connectionCache = new Map<string, Connection>();
	private basePath: string;

	constructor(
		private readonly config: LanceDBConfig,
		private readonly vectorStoreConfig: VectorStoreConfig,
		private readonly logger: Logger,
	) {
		// Resolve base path relative to n8n user directory
		const userHome = UserSettings.getUserN8nFolderPath();
		this.basePath = path.join(userHome, this.config.path);
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
				await connection.close();
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
	private async getTable(projectId: string, memoryKey: string): Promise<Table> {
		const connection = await this.getConnection(projectId);
		const tableName = this.sanitizeTableName(memoryKey);

		const tableNames = await connection.tableNames();

		if (!tableNames.includes(tableName)) {
			// Create table with initial empty data
			const emptyData: LanceDBRecord[] = [];
			return await connection.createTable(tableName, emptyData);
		}

		return await connection.openTable(tableName);
	}

	/**
	 * Build SQL WHERE clause from metadata filter
	 */
	private buildWhereClause(filter?: Record<string, unknown>): string | undefined {
		if (!filter || Object.keys(filter).length === 0) {
			return undefined;
		}

		const conditions: string[] = [];

		for (const [key, value] of Object.entries(filter)) {
			if (value === null) {
				conditions.push(`metadata.${key} IS NULL`);
			} else if (typeof value === 'string') {
				// Escape single quotes in SQL string literals
				const escapedValue = value.replace(/'/g, "''");
				conditions.push(`metadata.${key} = '${escapedValue}'`);
			} else if (typeof value === 'number') {
				conditions.push(`metadata.${key} = ${value}`);
			} else if (typeof value === 'boolean') {
				conditions.push(`metadata.${key} = ${value}`);
			} else {
				// For complex types, convert to JSON string comparison
				const escapedValue = JSON.stringify(value).replace(/'/g, "''");
				conditions.push(`metadata.${key} = '${escapedValue}'`);
			}
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
		const table = await this.getTable(projectId, memoryKey);

		if (clearStore) {
			// Delete all records
			await table.delete('true'); // Delete all rows (SQL WHERE clause: true)
		}

		const records: LanceDBRecord[] = documents.map((doc, i) => ({
			id: nanoid(),
			vector: embeddings[i],
			content: doc.content,
			metadata: doc.metadata,
			createdAt: new Date(),
			updatedAt: new Date(),
		}));

		await table.add(records);

		this.logger.debug(`Added ${records.length} vectors to ${memoryKey} in project ${projectId}`);
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
		const table = await this.getTable(projectId, memoryKey);

		let query = table.search(queryEmbedding).metricType('cosine').limit(k);

		const whereClause = this.buildWhereClause(filter);
		if (whereClause) {
			query = query.where(whereClause);
		}

		const results = await query.toArray();

		return results.map((row: LanceDBRecord & { _distance: number }) => ({
			content: row.content,
			metadata: row.metadata,
			score: 1 - row._distance, // Convert distance to similarity score (cosine: 0=identical, 2=opposite)
		}));
	}

	/**
	 * Get count of vectors
	 */
	async getVectorCount(memoryKey: string, projectId: string): Promise<number> {
		try {
			const table = await this.getTable(projectId, memoryKey);
			return await table.countRows();
		} catch (error) {
			// Table doesn't exist yet
			return 0;
		}
	}

	/**
	 * Clear all vectors for a memory key
	 */
	async clearStore(memoryKey: string, projectId: string): Promise<void> {
		try {
			const table = await this.getTable(projectId, memoryKey);
			await table.delete('true'); // Delete all rows
			this.logger.debug(`Cleared store ${memoryKey} in project ${projectId}`);
		} catch (error) {
			// Table doesn't exist, nothing to clear
			this.logger.debug(`Store ${memoryKey} does not exist in project ${projectId}`);
		}
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

		try {
			const table = await this.getTable(projectId, memoryKey);

			// Build WHERE clause for fileName IN (...)
			const escapedFileNames = fileNames.map((name) => `'${name.replace(/'/g, "''")}'`).join(', ');
			const whereClause = `metadata.fileName IN (${escapedFileNames})`;

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
