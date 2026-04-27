import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class MakeExecutionDataWorkflowDataNullable1777400000000 implements ReversibleMigration {
	async up({ schemaBuilder: { dropNotNull } }: MigrationContext) {
		await dropNotNull('execution_data', 'workflowData');
	}

	async down({ schemaBuilder: { addNotNull } }: MigrationContext) {
		await addNotNull('execution_data', 'workflowData');
	}
}
