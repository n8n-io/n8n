import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSourceAgentIdToAgents1791218645028 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const table = escape.tableName('agents');
		const column = escape.columnName('sourceAgentId');
		// ALTER avoids SQLite table recreation and preserves incoming references.
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} varchar(36)`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${column} IS 'Agent ID on the source instance; null for locally created agents'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('agents')} DROP COLUMN ${escape.columnName('sourceAgentId')}`,
		);
	}
}
