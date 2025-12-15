import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	agents: 'chat_hub_agents',
	sessions: 'chat_hub_sessions',
	messages: 'chat_hub_messages',
} as const;

export class AddIconToAgentTable1765361177092 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, addForeignKey },
		runQuery,
		isPostgres,
		escape,
	}: MigrationContext) {
		// Add icon column to agents table (nullable)
		await addColumns(table.agents, [column('icon').json]);

		// For PostgreSQL: convert agentId from varchar(36) to uuid to match agents.id type
		if (isPostgres) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(table.sessions)} ALTER COLUMN "agentId" TYPE uuid USING "agentId"::uuid`,
			);
			await runQuery(
				`ALTER TABLE ${escape.tableName(table.messages)} ALTER COLUMN "agentId" TYPE uuid USING "agentId"::uuid`,
			);
		}

		// Clean up orphaned agentId references before adding foreign key constraint
		await runQuery(
			`UPDATE ${escape.tableName(table.sessions)} SET "agentId" = NULL WHERE "agentId" IS NOT NULL AND "agentId" NOT IN (SELECT id FROM ${escape.tableName(table.agents)})`,
		);
		await runQuery(
			`UPDATE ${escape.tableName(table.messages)} SET "agentId" = NULL WHERE "agentId" IS NOT NULL AND "agentId" NOT IN (SELECT id FROM ${escape.tableName(table.agents)})`,
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

	async down({
		schemaBuilder: { dropColumns, dropForeignKey },
		runQuery,
		isPostgres,
		escape,
	}: MigrationContext) {
		// Drop foreign key constraints
		await dropForeignKey(
			table.sessions,
			'agentId',
			[table.agents, 'id'],
			'FK_chat_hub_sessions_agentId',
		);
		await dropForeignKey(
			table.messages,
			'agentId',
			[table.agents, 'id'],
			'FK_chat_hub_messages_agentId',
		);

		// For PostgreSQL: revert agentId from uuid back to varchar(36)
		if (isPostgres) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(table.sessions)} ALTER COLUMN "agentId" TYPE varchar(36)`,
			);
			await runQuery(
				`ALTER TABLE ${escape.tableName(table.messages)} ALTER COLUMN "agentId" TYPE varchar(36)`,
			);
		}

		// Drop icon column
		await dropColumns(table.agents, ['icon']);
	}
}
