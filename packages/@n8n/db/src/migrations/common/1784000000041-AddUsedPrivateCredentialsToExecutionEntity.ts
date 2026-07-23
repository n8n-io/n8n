import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddUsedPrivateCredentialsToExecutionEntity1784000000041
	implements ReversibleMigration
{
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const column = escape.columnName('usedPrivateCredentials');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${column} BOOLEAN NOT NULL DEFAULT FALSE`);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${column} IS 'Whether this execution ran with at least one dynamically-resolved private credential.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const column = escape.columnName('usedPrivateCredentials');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${column}`);
	}
}
