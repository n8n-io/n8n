import type { MigrationContext, ReversibleMigration } from '@db/types';

export class DisallowOrphanExecutions1693554410387 implements ReversibleMigration {
	transaction = false as const;

	/**
	 * Ensure all executions point to a workflow. Recreate table because sqlite
	 * does not support modifying column.
	 */
	async up({ escape, schemaBuilder: { dropNotNull }, runQuery }: MigrationContext) {
		const executionEntity = escape.tableName('execution_entity');
		const workflowId = escape.columnName('workflowId');

		await runQuery(`DELETE FROM ${executionEntity} WHERE ${workflowId} IS NULL;`);

		await dropNotNull('execution_entity', 'workflowId');
	}

	/**
	 * Reversal excludes restoring deleted rows.
	 */
	async down({ schemaBuilder: { addNotNull } }: MigrationContext) {
		await addNotNull('execution_entity', 'workflowId');
	}
}
