import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const TABLE = 'agent_chat_subscriptions';
const COLUMN = 'integrationType';
const VALUES = ['telegram', 'slack', 'linear', 'discord'];

export class AllowDiscordAgentChatSubscriptions1785840970000 implements IrreversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(TABLE, COLUMN, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(TABLE, COLUMN, VALUES, { recreatesOnSqlite: true });
	}
}
