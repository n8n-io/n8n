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
 */
export const databaseSchema: DatabaseSchema = {
	tables: {
		executions: {
			name: 'executions',
			schema: `
				CREATE TABLE IF NOT EXISTS executions (
					id TEXT PRIMARY KEY,
					workflow_id TEXT NOT NULL,
					data TEXT NOT NULL,
					workflow TEXT NOT NULL,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
				CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
				CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at);
			`,
		},
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
		credentials: {
			name: 'credentials',
			schema: `
				CREATE TABLE IF NOT EXISTS credentials (
					id TEXT PRIMARY KEY,
					data TEXT NOT NULL,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
			`,
		},
		workflows: {
			name: 'workflows',
			schema: `
				CREATE TABLE IF NOT EXISTS workflows (
					id TEXT PRIMARY KEY,
					data TEXT NOT NULL,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
				CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at);
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
