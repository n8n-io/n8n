import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentRevisionColumn1786666615644 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('agents');
		const column = escape.columnName('revision');
		// Raw ALTER avoids SQLite table recreation, which would fire CASCADE
		// on the incoming FKs from agent_history / agent_task / agent_chat_attachment.
		// NOT NULL DEFAULT 0 backfills every existing row to revision 0.
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} integer NOT NULL DEFAULT 0`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('agents');
		const column = escape.columnName('revision');
		// Raw DROP COLUMN avoids the same recreation/CASCADE hazard as up().
		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${column}`);
	}
}
