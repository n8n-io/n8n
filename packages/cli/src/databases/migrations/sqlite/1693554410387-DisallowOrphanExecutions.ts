import type { MigrationContext, ReversibleMigration } from '@db/types';

export class DisallowOrphanExecutions1693554410387 implements ReversibleMigration {
	transaction = false as const;

	/**
	 * Ensure all executions point to a workflow. Recreate table because sqlite
	 * does not support modifying column.
	 */
	async up({ escape, schemaBuilder: { createTable, column }, runQuery }: MigrationContext) {
		const executionEntity = escape.tableName('execution_entity');
		const workflowId = escape.tableName('workflowId');

		await runQuery(`DELETE FROM ${executionEntity} WHERE ${workflowId} IS NULL;`);

		await createTable('temp')
			.withColumns(
				column('id').int.primary.autoGenerate.notNull,
				column('workflowId').varchar(36).notNull, // only change
				column('finished').bool.notNull,
				column('mode').varchar().notNull,
				column('retryOf').varchar(),
				column('retrySuccessId').varchar(),
				column('startedAt').timestamp().notNull,
				column('stoppedAt').timestamp(),
				column('waitTill').timestamp(),
				column('status').varchar(),
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		await runQuery(
			`INSERT INTO "temp" ("id", "workflowId", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", "status") SELECT "id", "workflowId", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", "status" FROM ${executionEntity};`,
		);

		await runQuery(`DROP TABLE ${executionEntity};`);

		await runQuery(`ALTER TABLE "temp" RENAME TO ${executionEntity};`);
	}

	/**
	 * Reversal excludes restoring deleted rows.
	 */
	async down({ escape, schemaBuilder: { createTable, column }, runQuery }: MigrationContext) {
		const executionEntity = escape.tableName('execution_entity');

		await createTable('temp')
			.withColumns(
				column('id').int.primary.autoGenerate.notNull,
				column('workflowId').varchar(36), // only change
				column('finished').bool.notNull,
				column('mode').varchar().notNull,
				column('retryOf').varchar(),
				column('retrySuccessId').varchar(),
				column('startedAt').timestamp().notNull,
				column('stoppedAt').timestamp(),
				column('waitTill').timestamp(),
				column('status').varchar(),
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		await runQuery(
			`INSERT INTO "temp" ("id", "workflowId", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", "status") SELECT "id", "workflowId", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", "status" FROM ${executionEntity};`,
		);

		await runQuery(`DROP TABLE ${executionEntity};`);

		await runQuery(`ALTER TABLE "temp" RENAME TO ${executionEntity};`);
	}
}
