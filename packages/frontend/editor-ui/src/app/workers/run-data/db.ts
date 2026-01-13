import type { DatabaseConfig } from '@/app/workers/database';

export const databaseConfig: DatabaseConfig = {
	filename: '/n8n.sqlite3',
	tables: {
		executions: {
			name: 'executions',
			schema: `
        CREATE TABLE IF NOT EXISTS executions (
          id INTEGER PRIMARY KEY,
          workflow_id INTEGER NOT NULL,
          data TEXT CHECK (json_valid(data)) NOT NULL,
          workflow TEXT CHECK (json_valid(workflow)) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
		},
		nodeTypes: {
			name: 'nodeTypes',
			schema: `
        CREATE TABLE IF NOT EXISTS nodeTypes (
          id TEXT PRIMARY KEY,
          data TEXT CHECK (json_valid(data)) NOT NULL
        );
      `,
		},
	},
} as const;
