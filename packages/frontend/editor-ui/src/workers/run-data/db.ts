import type { DatabaseConfig } from '@/workers/database';

export const databaseConfig: DatabaseConfig = {
	filename: 'file:n8n.sqlite3?vfs=opfs',
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
	},
} as const;
