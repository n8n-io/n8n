import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWorkflowVersionIdToExecutionData1764578434978 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('execution_data', [column('workflowVersionId').varchar(32)]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('execution_data', ['workflowVersionId']);
	}
}
