import type { MigrationContext, ReversibleMigration } from '@db/types';

export class DisallowOrphanExecutions1693554410387 implements ReversibleMigration {
	transaction = false as const;

	/**
	 * Ensure all executions point to a workflow. Recreate table because sqlite
	 * does not support modifying column.
	 */
	async up({
		escape,
		schemaBuilder: { createTable, column, createIndex, dropIndex },
		runQuery,
	}: MigrationContext) {
		const executionEntity = escape.tableName('execution_entity');
		const workflowId = escape.columnName('workflowId');

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

		const isUnique = false;

		await dropIndex('execution_entity', ['waitTill'], 'idx_execution_entity_wait_till');
		await dropIndex('execution_entity', ['stoppedAt'], 'idx_execution_entity_stopped_at');
		await dropIndex('execution_entity', ['waitTill', 'id'], 'IDX_b94b45ce2c73ce46c54f20b5f9');
		await dropIndex(
			'execution_entity',
			['status', 'workflowId'],
			'IDX_8b6f3f9ae234f137d707b98f3bf43584',
		);
		await dropIndex('execution_entity', ['workflowId', 'id'], 'IDX_81fc04c8a17de15835713505e4');

		await createIndex('temp', ['waitTill'], isUnique, 'idx_execution_entity_wait_till');
		await createIndex('temp', ['stoppedAt'], isUnique, 'idx_execution_entity_stopped_at');
		await createIndex('temp', ['waitTill', 'id'], isUnique, 'IDX_b94b45ce2c73ce46c54f20b5f9');
		await createIndex(
			'temp',
			['status', 'workflowId'],
			isUnique,
			'IDX_8b6f3f9ae234f137d707b98f3bf43584',
		);
		await createIndex('temp', ['workflowId', 'id'], isUnique, 'IDX_81fc04c8a17de15835713505e4');

		await runQuery(
			`INSERT INTO "temp" ("id", "workflowId", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", "status") SELECT "id", "workflowId", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", "status" FROM ${executionEntity};`,
		);

		await runQuery(`DROP TABLE ${executionEntity};`);

		await runQuery(`ALTER TABLE "temp" RENAME TO ${executionEntity};`);
	}

	/**
	 * Reversal excludes restoring deleted rows.
	 */
	async down({
		escape,
		schemaBuilder: { createTable, column, createIndex, dropIndex },
		runQuery,
	}: MigrationContext) {
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

		await dropIndex('execution_entity', ['waitTill'], 'idx_execution_entity_wait_till');
		await dropIndex('execution_entity', ['stoppedAt'], 'idx_execution_entity_stopped_at');
		await dropIndex('execution_entity', ['waitTill', 'id'], 'IDX_b94b45ce2c73ce46c54f20b5f9');
		await dropIndex(
			'execution_entity',
			['status', 'workflowId'],
			'IDX_8b6f3f9ae234f137d707b98f3bf43584',
		);
		await dropIndex('execution_entity', ['workflowId', 'id'], 'IDX_81fc04c8a17de15835713505e4');

		const isUnique = false;

		await createIndex('temp', ['waitTill'], isUnique, 'idx_execution_entity_wait_till');
		await createIndex('temp', ['stoppedAt'], isUnique, 'idx_execution_entity_stopped_at');
		await createIndex('temp', ['waitTill', 'id'], isUnique, 'IDX_b94b45ce2c73ce46c54f20b5f9');
		await createIndex(
			'temp',
			['status', 'workflowId'],
			isUnique,
			'IDX_8b6f3f9ae234f137d707b98f3bf43584',
		);
		await createIndex('temp', ['workflowId', 'id'], isUnique, 'IDX_81fc04c8a17de15835713505e4');

		await runQuery(
			`INSERT INTO "temp" ("id", "workflowId", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", "status") SELECT "id", "workflowId", "finished", "mode", "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", "status" FROM ${executionEntity};`,
		);

		await runQuery(`DROP TABLE ${executionEntity};`);

		await runQuery(`ALTER TABLE "temp" RENAME TO ${executionEntity};`);
	}
}
