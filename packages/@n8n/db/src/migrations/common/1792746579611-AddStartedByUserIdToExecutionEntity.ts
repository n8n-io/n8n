import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Records the user who started a manual execution that n8n will not save. Only that user
 * can read the execution after it finishes, until pruning hard-deletes it.
 *
 * The column has no foreign key and no index. Only manual executions that n8n will not
 * save carry a value, and pruning hard-deletes them after `EXECUTIONS_DATA_HARD_DELETE_BUFFER`
 * once they finish. Reads find one execution by its primary key. A foreign key on this large
 * table would lock and scan it to validate, and each user deletion would scan it.
 */
export class AddStartedByUserIdToExecutionEntity1792746579611 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const column = escape.columnName('startedByUserId');

		// Not using the addColumns DSL, because it recreates this large table on SQLite.
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${column} ${isPostgres ? 'UUID' : 'VARCHAR(36)'} DEFAULT NULL`,
		);

		// SQLite has no column comments, so annotate only on Postgres.
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${column} IS 'User who started this manual execution. Set at start only when n8n will not save it, so only that user can read it until pruning hard-deletes it.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const column = escape.columnName('startedByUserId');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${column}`);
	}
}
