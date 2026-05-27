import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	sessions: 'chat_hub_sessions',
	agents: 'chat_hub_agents',
} as const;

export class AddToolsColumnToChatHubTables1761830340990 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			table.sessions,
			[
				column('tools')
					.json.notNull.default("'[]'")
					.comment('Tools available to the agent as JSON node definitions'),
			],
			{ ackThisRecreatesOnSqlite: true },
		);
		await addColumns(
			table.agents,
			[
				column('tools')
					.json.notNull.default("'[]'")
					.comment('Tools available to the agent as JSON node definitions'),
			],
			{ ackThisRecreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table.sessions, ['tools'], { ackThisRecreatesOnSqlite: true });
		await dropColumns(table.agents, ['tools'], { ackThisRecreatesOnSqlite: true });
	}
}
