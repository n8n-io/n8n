import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	agents: 'chat_hub_agents',
	sessions: 'chat_hub_sessions',
	messages: 'chat_hub_messages',
} as const;

export class AddAgentIdForeignKeys1765886667897 implements ReversibleMigration {
	async up({ schemaBuilder: { addForeignKey }, runQuery, escape }: MigrationContext) {
		const escapedAgentIdColumn = escape.columnName('agentId');

		// Clean up orphaned agentId references before adding foreign key constraint
		await runQuery(
			`UPDATE ${escape.tableName(table.sessions)} SET ${escapedAgentIdColumn} = NULL WHERE ${escapedAgentIdColumn} IS NOT NULL AND ${escapedAgentIdColumn} NOT IN (SELECT id FROM ${escape.tableName(table.agents)})`,
		);
		await runQuery(
			`UPDATE ${escape.tableName(table.messages)} SET ${escapedAgentIdColumn} = NULL WHERE ${escapedAgentIdColumn} IS NOT NULL AND ${escapedAgentIdColumn} NOT IN (SELECT id FROM ${escape.tableName(table.agents)})`,
		);

		// Add foreign key constraint for agentId in sessions table
		await addForeignKey(
			table.sessions,
			'agentId',
			[table.agents, 'id'],
			'FK_chat_hub_sessions_agentId',
			'SET NULL',
		);
		await addForeignKey(
			table.messages,
			'agentId',
			[table.agents, 'id'],
			'FK_chat_hub_messages_agentId',
			'SET NULL',
		);
	}

	async down({ schemaBuilder: { dropForeignKey } }: MigrationContext) {
		await dropForeignKey(
			table.messages,
			'agentId',
			[table.agents, 'id'],
			'FK_chat_hub_messages_agentId',
		);
		await dropForeignKey(
			table.sessions,
			'agentId',
			[table.agents, 'id'],
			'FK_chat_hub_sessions_agentId',
		);
	}
}
