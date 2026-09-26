import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'agent_chat_subscriptions';
const COLUMN = 'integrationType';
// Includes 'teams': the Teams agent channel's own migration
// (AllowTeamsAgentChatSubscriptions1790231058977) already ran by the time this
// one does and rebuilt the check constraint without 'whatsapp'. Starting from
// the same list Teams left behind — rather than the pre-Teams list — keeps
// both platforms in the constraint instead of this migration silently
// dropping 'teams' the same way that one dropped 'whatsapp'.
const VALUES_BEFORE = ['telegram', 'slack', 'linear', 'discord', 'teams'];
const VALUES_AFTER = [...VALUES_BEFORE, 'whatsapp'];

export class AllowWhatsAppAgentChatSubscriptions1790259626916 implements ReversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(TABLE, COLUMN, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(TABLE, COLUMN, VALUES_AFTER, { recreatesOnSqlite: true });
	}

	async down({ escape, runQuery, schemaBuilder }: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName(TABLE)} WHERE ${escape.columnName(COLUMN)} = 'whatsapp'`,
		);
		await schemaBuilder.dropEnumCheck(TABLE, COLUMN, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(TABLE, COLUMN, VALUES_BEFORE, { recreatesOnSqlite: true });
	}
}
