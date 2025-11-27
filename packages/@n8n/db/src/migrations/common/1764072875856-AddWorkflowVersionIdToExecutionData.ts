import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWorkflowVersionIdToExecutionData1764072875856 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('execution_data', [column('workflowVersionId').varchar()]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('execution_data', ['workflowVersionId']);
	}
}
