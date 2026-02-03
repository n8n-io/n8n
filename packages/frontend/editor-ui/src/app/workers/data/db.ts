/**
 * Database Configuration
 *
 * This module defines the database schema and table configurations
 * for the SQLite database used by the run-data workers.
 */

export interface TableSchema {
	name: string;
	schema: string;
}

export interface DatabaseSchema {
	tables: Record<string, TableSchema>;
}

/**
 * Database schema definition
 *
 * Currently only includes nodeTypes table. Additional tables (executions,
 * credentials, workflows) will be added when they are needed.
 */
export const databaseSchema: DatabaseSchema = {
	tables: {
		nodeTypes: {
			name: 'nodeTypes',
			schema: `
				CREATE TABLE IF NOT EXISTS nodeTypes (
					id TEXT PRIMARY KEY,
					data TEXT NOT NULL,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
			`,
		},
		metadata: {
			name: 'metadata',
			schema: `
				CREATE TABLE IF NOT EXISTS metadata (
					key TEXT PRIMARY KEY,
					value TEXT NOT NULL,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
			`,
		},
	},
} as const;

/**
 * Get all table creation SQL statements
 */
export function getAllTableSchemas(): string[] {
	return Object.values(databaseSchema.tables).map((table) => table.schema);
}

/**
 * Get a specific table schema by name
 */
export function getTableSchema(tableName: keyof typeof databaseSchema.tables): string {
	return databaseSchema.tables[tableName].schema;
}
