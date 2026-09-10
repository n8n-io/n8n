import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'agent_chat_subscriptions';
const COLUMN = 'integrationType';
const VALUES_BEFORE = ['telegram', 'slack', 'linear', 'discord'];
const VALUES_AFTER = [...VALUES_BEFORE, 'twilioVoice'];

export class AllowTwilioVoiceAgentChatSubscriptions1789045213074 implements ReversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(TABLE, COLUMN, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(TABLE, COLUMN, VALUES_AFTER, { recreatesOnSqlite: true });
	}

	async down({ escape, runQuery, schemaBuilder }: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName(TABLE)} WHERE ${escape.columnName(COLUMN)} = 'twilioVoice'`,
		);
		await schemaBuilder.dropEnumCheck(TABLE, COLUMN, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(TABLE, COLUMN, VALUES_BEFORE, { recreatesOnSqlite: true });
	}
}
