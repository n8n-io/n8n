import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	agents: 'chat_hub_agents',
	sessions: 'chat_hub_sessions',
	messages: 'chat_hub_messages',
	user: 'user',
	credentials: 'credentials_entity',
} as const;

export class CreateChatHubAgentTable1760020000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, addColumns, column } }: MigrationContext) {
		await createTable(table.agents)
			.withColumns(
				column('id').uuid.primary,
				column('name').varchar(256).notNull,
				column('description').varchar(512),
				column('systemPrompt').text.notNull,
				column('ownerId').uuid.notNull,
				// Required for agents to work but can be deleted, so nullable
				column('credentialId').varchar(36),
				column('provider')
					.varchar(16)
					.comment('ChatHubProvider enum: "openai", "anthropic", "google", "n8n"').notNull,
				column('model')
					.varchar(64)
					.comment('Model name used at the respective Model node, ie. "gpt-4"').notNull,
			)
			.withForeignKey('ownerId', {
				tableName: table.user,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('credentialId', {
				tableName: table.credentials,
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;

		// Add agentId and agentName to chat_hub_sessions
		await addColumns(table.sessions, [
			column('agentId')
				.varchar(36)
				.comment('ID of the custom agent (if provider is "custom-agent")'),
			column('agentName')
				.varchar(128)
				.comment('Cached name of the custom agent (if provider is "custom-agent")'),
		]);

		// Add agentId to chat_hub_messages
		await addColumns(table.messages, [
			column('agentId')
				.varchar(36)
				.comment('ID of the custom agent (if provider is "custom-agent")'),
		]);
	}

	async down({ schemaBuilder: { dropTable, dropColumns } }: MigrationContext) {
		await dropColumns(table.messages, ['agentId']);
		await dropColumns(table.sessions, ['agentId', 'agentName']);
		await dropTable(table.agents);
	}
}
