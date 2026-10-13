import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddInstanceAiThreadHistoryIndex1789131391410 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex('instance_ai_threads', ['resourceId', 'updatedAt', 'id']);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('instance_ai_threads', ['resourceId', 'updatedAt', 'id']);
	}
}
