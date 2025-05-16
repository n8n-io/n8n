import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateWorkflowNameIndex1691088862123 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex('workflow_entity', ['name']);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('workflow_entity', ['name']);
	}
}
