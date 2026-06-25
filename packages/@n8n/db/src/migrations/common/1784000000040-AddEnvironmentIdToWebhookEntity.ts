import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddEnvironmentIdToWebhookEntity1784000000040 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('webhook_entity', [column('environmentId').varchar(36)], {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('webhook_entity', ['environmentId'], { recreatesOnSqlite: true });
	}
}
