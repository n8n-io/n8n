import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddWebhookId1611071044839 implements ReversibleMigration {
	protected indexName = '742496f199721a057051acf4c2';

	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		await addColumns('webhook_entity', [
			column('webhookId').varchar().primary,
			column('pathLength').int.primary,
		]);
		await createIndex(
			'webhook_entity',
			['webhookId', 'method', 'pathLength'],
			false,
			this.indexName,
		);
	}

	async down({ schemaBuilder: { dropIndex, dropColumns } }: MigrationContext) {
		await dropIndex('webhook_entity', ['webhookId', 'method', 'pathLength'], this.indexName);
		await dropColumns('webhook_entity', ['pathLength', 'webhookId']);
	}
}
