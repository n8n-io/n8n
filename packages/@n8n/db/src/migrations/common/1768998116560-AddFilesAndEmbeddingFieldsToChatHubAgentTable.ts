import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'chat_hub_agents';

export class AddFilesAndEmbeddingFieldsToChatHubAgentTable1768998116560
	implements ReversibleMigration
{
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		// Add files column to agents table
		await addColumns(table, [column('files').json.notNull.default("'[]'")]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		// Drop files column
		await dropColumns(table, ['files']);
	}
}
