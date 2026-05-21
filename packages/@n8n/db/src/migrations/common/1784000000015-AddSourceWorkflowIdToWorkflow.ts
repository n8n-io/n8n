import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSourceWorkflowIdToWorkflow1784000000015 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		await addColumns('workflow_entity', [column('sourceWorkflowId').varchar()]);
		await createIndex('workflow_entity', ['sourceWorkflowId']);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('workflow_entity', ['sourceWorkflowId']);
		await dropColumns('workflow_entity', ['sourceWorkflowId']);
	}
}
