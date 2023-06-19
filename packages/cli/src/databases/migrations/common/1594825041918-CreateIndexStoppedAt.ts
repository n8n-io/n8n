import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreateIndexStoppedAt1594825041918 implements ReversibleMigration {
	protected indexName = 'cefb067df2402f6aed0638a6c1';

	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex('execution_entity', ['stoppedAt'], false, this.indexName);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('execution_entity', ['stoppedAt'], this.indexName);
	}
}
