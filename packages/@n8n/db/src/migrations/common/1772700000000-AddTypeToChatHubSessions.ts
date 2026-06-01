import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddTypeToChatHubSessions1772700000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('chat_hub_sessions', [
			column('type')
				.varchar(16)
				.notNull.default("'production'")
				.withEnumCheck(['production', 'manual']),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('chat_hub_sessions', ['type']);
	}
}
