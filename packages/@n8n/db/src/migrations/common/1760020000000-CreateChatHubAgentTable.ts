import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	agents: 'chat_hub_agents',
	user: 'user',
	workflows: 'workflow_entity',
} as const;

export class CreateChatHubAgentTable1760020000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.agents)
			.withColumns(
				column('id').uuid.primary,
				column('name').varchar(256).notNull,
				column('description').varchar(512),
				column('systemPrompt').text.notNull,
				column('ownerId').uuid.notNull,
				column('provider')
					.varchar(16)
					.comment('ChatHubProvider enum: "openai", "anthropic", "google", "n8n"'),
				column('model')
					.varchar(64)
					.comment('Model name used at the respective Model node, ie. "gpt-4"'),
				column('workflowId').varchar(36),
			)
			.withForeignKey('ownerId', {
				tableName: table.user,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('workflowId', {
				tableName: table.workflows,
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table.agents);
	}
}
