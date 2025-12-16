import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWorkflowMetadata1695128658538 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_entity', [column('meta').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_entity', ['meta']);
	}
}
