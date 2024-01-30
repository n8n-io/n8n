import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddWorkflowEntityWithVersionMetadata1690000000040 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_entity_with_version', [column('meta').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_entity_with_version', ['meta']);
	}
}
