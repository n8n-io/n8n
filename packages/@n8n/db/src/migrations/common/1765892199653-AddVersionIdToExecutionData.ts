import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWorkflowVersionIdToExecutionData1765892199653 implements ReversibleMigration {
	async up({ runQuery, escape }: MigrationContext) {
		const tableName = escape.tableName('execution_data');
		const workflowVersionId = escape.columnName('workflowVersionId');
		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${workflowVersionId} VARCHAR(36)`);
	}

	async down({ runQuery, escape }: MigrationContext) {
		const tableName = escape.tableName('execution_data');
		const workflowVersionId = escape.columnName('workflowVersionId');
		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${workflowVersionId}`);
	}
}
