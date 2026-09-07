import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWorkflowVersionToTestRun1778100001000 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_run');
		const columnName = escape.columnName('workflowVersionId');

		// No FK to workflow_history: workflow history rows can be pruned by retention,
		// but test runs should retain their versionId reference for auditability.
		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR(36);`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_run');
		const columnName = escape.columnName('workflowVersionId');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName};`);
	}
}
