import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddMetadataKeyIndex1714133768520 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex('execution_metadata', ['key']);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('execution_metadata', ['key']);
	}
}
