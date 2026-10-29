import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentOnlineRubric1793285492626 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const table = escape.tableName('agents');
		const field = escape.columnName('onlineRubric');
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${field} ${isPostgres ? 'JSON' : 'TEXT'}`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${field} IS 'Saved online checks and their generation time'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('agents')} DROP COLUMN ${escape.columnName('onlineRubric')}`,
		);
	}
}
