import type { MigrationContext, ReversibleMigration } from '../migration-types';

const COLUMN_COMMENT = 'User message that introduced the file, when known';

export class AddMessageIdToAgentChatAttachments1791365056156 implements ReversibleMigration {
	// Raw ALTER TABLE, not addColumns: agent_chat_attachments has cascading FKs
	// and SQLite table recreation would fire them.
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('agent_chat_attachments');
		const columnName = escape.columnName('messageId');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR(128)`);

		if (isPostgres) {
			await runQuery(`COMMENT ON COLUMN ${tableName}.${columnName} IS '${COLUMN_COMMENT}'`);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('agent_chat_attachments');
		const columnName = escape.columnName('messageId');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
