import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	agents: 'chat_hub_agents',
	sessions: 'chat_hub_sessions',
	messages: 'chat_hub_messages',
} as const;

export class AddIconToAgentTable1765788427674 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		// Add icon column to agents table (nullable)
		await addColumns(table.agents, [column('icon').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		// Drop icon column
		await dropColumns(table.agents, ['icon']);
	}
}
