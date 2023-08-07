import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreateWorkflowNameIndex1691088862123 implements ReversibleMigration {
	private indexName = '48f450ec4a8536fbd7d8e7d094';

	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex(this.indexName, 'workflow_entity', ['name']);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex(this.indexName, 'workflow_entity');
	}
}
