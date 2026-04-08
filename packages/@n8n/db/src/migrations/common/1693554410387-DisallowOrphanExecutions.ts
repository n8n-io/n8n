import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class DisallowOrphanExecutions1693554410387 implements ReversibleMigration {
	/**
	 * Ensure all executions point to a workflow.
	 */
	async up({ escape, schemaBuilder: { addNotNull }, runQuery }: MigrationContext) {
		const executionEntity = escape.tableName('execution_entity');
		const workflowId = escape.columnName('workflowId');

		await runQuery(`DELETE FROM ${executionEntity} WHERE ${workflowId} IS NULL;`);

		await addNotNull('execution_entity', 'workflowId');
	}

	/**
	 * Reversal excludes restoring deleted rows.
	 */
	async down({ schemaBuilder: { dropNotNull } }: MigrationContext) {
		await dropNotNull('execution_entity', 'workflowId');
	}
}
