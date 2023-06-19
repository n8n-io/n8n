import type { MigrationContext, ReversibleMigration } from '@db/types';

export class WebhookModel1592445003908 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('webhook_entity').withColumns(
			column('workflowId').int,
			column('webhookPath').varchar(255).notNull.primary,
			column('method').varchar(255).notNull.primary,
			column('node').varchar(128).notNull,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('webhook_entity');
	}
}
