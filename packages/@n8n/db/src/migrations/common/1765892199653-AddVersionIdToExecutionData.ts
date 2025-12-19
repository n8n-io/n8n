import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWorkflowVersionIdToExecutionData1765892199653 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('execution_data', [column('workflowVersionId').varchar(36)]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('execution_data', ['workflowVersionId']);
	}
}
