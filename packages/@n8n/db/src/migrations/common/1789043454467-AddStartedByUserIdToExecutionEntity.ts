import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddStartedByUserIdToExecutionEntity1789043454467 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const column = escape.columnName('startedByUserId');
		// uuid on Postgres, varchar on SQLite: mirrors how `activity_event.userId` is typed.
		const type = isPostgres ? 'uuid' : 'varchar(36)';

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${column} ${type}`);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${column} IS 'n8n user whose identity started the execution. NULL for schedule, poll and third-party triggers. No foreign key: the audit value must outlive the user.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const column = escape.columnName('startedByUserId');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${column}`);
	}
}
