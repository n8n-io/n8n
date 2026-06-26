import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddUsedPrivateCredentialsToExecutionEntity1784000000038
	implements ReversibleMigration
{
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const column = escape.columnName('usedPrivateCredentials');

		if (isPostgres) {
			await runQuery(
				`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${column} BOOLEAN NOT NULL DEFAULT FALSE`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${column} IS 'Whether this execution ran with at least one dynamically-resolved private credential.'`,
			);
		} else {
			// SQLite does not support IF NOT EXISTS for ADD COLUMN — check manually
			const rows = await runQuery<Array<{ name: string }>>(`PRAGMA table_info(execution_entity)`);
			const exists = rows.some((r) => r.name === 'usedPrivateCredentials');
			if (!exists) {
				await runQuery(
					`ALTER TABLE ${tableName} ADD COLUMN ${column} BOOLEAN NOT NULL DEFAULT FALSE`,
				);
			}
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const column = escape.columnName('usedPrivateCredentials');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${column}`);
	}
}
