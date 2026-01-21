import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'chat_hub_agents';

export class AddFilesAndEmbeddingFieldsToChatHubAgentTable1768998116560
	implements ReversibleMigration
{
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		// Add files, embeddingProvider, and embeddingCredentialId columns to agents table
		await addColumns(table, [
			column('files').json.notNull.default("'[]'"),
			column('embeddingProvider').varchar(16),
			column('embeddingCredentialId').varchar(36),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		// Drop files, embeddingProvider, and embeddingCredentialId columns
		await dropColumns(table, ['files', 'embeddingProvider', 'embeddingCredentialId']);
	}
}
