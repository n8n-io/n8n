import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentVersionMetadata1793035272968 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		// Raw ALTER preserves incoming SQLite foreign keys and their rows.
		for (const name of ['name', 'description']) {
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_history')} ADD COLUMN ${escape.columnName(name)} text`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		for (const name of ['name', 'description']) {
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_history')} DROP COLUMN ${escape.columnName(name)}`,
			);
		}
	}
}
