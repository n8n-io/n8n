import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddNodeGroupsColumnToWorkflowAndHistory1778496335798 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_entity', [column('nodeGroups').json.notNull.default("'[]'")]);
		await addColumns('workflow_history', [column('nodeGroups').json.notNull.default("'[]'")]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_entity', ['nodeGroups']);
		await dropColumns('workflow_history', ['nodeGroups']);
	}
}
