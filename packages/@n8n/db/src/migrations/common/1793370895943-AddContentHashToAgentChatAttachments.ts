import type { MigrationContext, ReversibleMigration } from '../migration-types';

const ATTACHMENTS_TABLE = 'agent_chat_attachments';
const CONTENT_HASH_COLUMN = 'contentHash';

/**
 * Records the SHA-256 of the bytes of each new agent file, so n8n can skip a
 * file that a conversation stored before. Older rows stay null.
 *
 * Raw `ALTER TABLE`, because `agent_file_grants` has a cascading foreign key
 * to this table, and the SQLite table recreation would delete the grants.
 * No new index: the `(projectId, threadId)` index already limits a lookup to
 * the files of one conversation.
 */
export class AddContentHashToAgentChatAttachments1793370895943 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const table = escape.tableName(ATTACHMENTS_TABLE);
		const column = escape.columnName(CONTENT_HASH_COLUMN);

		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} VARCHAR(64)`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${column} IS 'SHA-256 of the file bytes, hex; null for older rows'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName(ATTACHMENTS_TABLE);
		const column = escape.columnName(CONTENT_HASH_COLUMN);

		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${column}`);
	}
}
