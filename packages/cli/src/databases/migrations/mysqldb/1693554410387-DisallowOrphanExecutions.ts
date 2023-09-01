import type { MigrationContext, ReversibleMigration } from '@db/types';

export class DisallowOrphanExecutions1693554410387 implements ReversibleMigration {
	/**
	 * Ensure all executions point to a workflow.
	 */
	async up({ queryRunner, escape }: MigrationContext) {
		const executionEntity = escape.tableName('execution_entity');
		const workflowId = escape.tableName('workflowId');

		await queryRunner.query(`DELETE FROM ${executionEntity} WHERE ${workflowId} IS NULL;`);
		await queryRunner.query(
			`ALTER TABLE ${executionEntity} MODIFY ${workflowId} VARCHAR(36) NOT NULL;`,
		);
	}

	/**
	 * Reversal excludes restoring deleted rows.
	 */
	async down({ queryRunner, escape }: MigrationContext) {
		const executionEntity = escape.tableName('execution_entity');
		const workflowId = escape.tableName('workflowId');

		await queryRunner.query(`ALTER TABLE ${executionEntity} MODIFY ${workflowId} VARCHAR(36);`);
	}
}
