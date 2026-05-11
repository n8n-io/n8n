import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddNodeGroupsColumnToWorkflowAndHistory1778496335798 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const workflowEntity = escape.tableName('workflow_entity');
		const workflowHistory = escape.tableName('workflow_history');
		const nodeGroups = escape.columnName('nodeGroups');

		await runQuery(`ALTER TABLE ${workflowEntity} ADD COLUMN ${nodeGroups} TEXT;`);
		await runQuery(`ALTER TABLE ${workflowHistory} ADD COLUMN ${nodeGroups} TEXT;`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const workflowEntity = escape.tableName('workflow_entity');
		const workflowHistory = escape.tableName('workflow_history');
		const nodeGroups = escape.columnName('nodeGroups');

		await runQuery(`ALTER TABLE ${workflowEntity} DROP COLUMN ${nodeGroups};`);
		await runQuery(`ALTER TABLE ${workflowHistory} DROP COLUMN ${nodeGroups};`);
	}
}
