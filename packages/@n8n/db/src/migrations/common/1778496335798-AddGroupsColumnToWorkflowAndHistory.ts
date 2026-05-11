import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddGroupsColumnToWorkflowAndHistory1778496335798 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const workflowEntity = escape.tableName('workflow_entity');
		const workflowHistory = escape.tableName('workflow_history');
		const groups = escape.columnName('groups');

		await runQuery(`ALTER TABLE ${workflowEntity} ADD COLUMN ${groups} TEXT;`);
		await runQuery(`ALTER TABLE ${workflowHistory} ADD COLUMN ${groups} TEXT;`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const workflowEntity = escape.tableName('workflow_entity');
		const workflowHistory = escape.tableName('workflow_history');
		const groups = escape.columnName('groups');

		await runQuery(`ALTER TABLE ${workflowEntity} DROP COLUMN ${groups};`);
		await runQuery(`ALTER TABLE ${workflowHistory} DROP COLUMN ${groups};`);
	}
}
