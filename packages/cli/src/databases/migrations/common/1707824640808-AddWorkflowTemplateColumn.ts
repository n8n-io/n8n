import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddWorkflowTemplateColumn1707824640808 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_entity', [column('template').bool.notNull.default(false)]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_entity', ['template']);
	}
}
