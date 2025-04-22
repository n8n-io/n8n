import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddWorkflowArchivedColumn1745329094929 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_entity', [column('isArchived').bool.notNull.default(false)]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_entity', ['isArchived']);
	}
}
