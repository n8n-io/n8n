import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddNodeGroupsColumnToWorkflowAndHistory1778496335798 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_entity', [column('nodeGroups').text]);
		await addColumns('workflow_history', [column('nodeGroups').text]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_entity', ['nodeGroups']);
		await dropColumns('workflow_history', ['nodeGroups']);
	}
}
