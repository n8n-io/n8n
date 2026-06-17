import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	sessions: 'chat_hub_sessions',
	messages: 'chat_hub_messages',
} as const;

export class ConvertAgentIdToUuid1765804780000 implements ReversibleMigration {
	async up({ runQuery, escape }: MigrationContext) {
		// Convert agentId from varchar(36) to uuid to match agents.id type
		await runQuery(
			`ALTER TABLE ${escape.tableName(table.sessions)} ALTER COLUMN "agentId" TYPE uuid USING "agentId"::uuid`,
		);
		await runQuery(
			`ALTER TABLE ${escape.tableName(table.messages)} ALTER COLUMN "agentId" TYPE uuid USING "agentId"::uuid`,
		);
	}

	async down({ runQuery, escape }: MigrationContext) {
		// Revert agentId from uuid back to varchar(36)
		await runQuery(
			`ALTER TABLE ${escape.tableName(table.sessions)} ALTER COLUMN "agentId" TYPE varchar(36)`,
		);
		await runQuery(
			`ALTER TABLE ${escape.tableName(table.messages)} ALTER COLUMN "agentId" TYPE varchar(36)`,
		);
	}
}
