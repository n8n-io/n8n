import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'chat_hub_agents';

export class AddFilesColumnToChatHubAgents1771500000002 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(table, [column('files').json.notNull.default("'[]'")]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table, ['files']);
	}
}
