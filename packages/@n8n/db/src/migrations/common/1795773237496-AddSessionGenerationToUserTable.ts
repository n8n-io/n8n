import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds a per-user `sessionGeneration` counter to the `user` table.
 *
 * The column is added and dropped with raw SQL so SQLite never rebuilds
 * `user` and does not trigger CASCADE deletes on tables referencing `user`.
 */
export class AddSessionGenerationToUserTable1795773237496 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const table = escape.tableName('user');
		const sessionGeneration = escape.columnName('sessionGeneration');

		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${sessionGeneration} INTEGER NOT NULL DEFAULT 0`,
		);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${sessionGeneration} IS 'Monotonic counter incremented on session-invalidating account changes'`,
			);
		}
	}

	/**
	 * Drops the `sessionGeneration` column. Existing generation counters are lost
	 * on rollback.
	 */
	async down({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('user');
		const sessionGeneration = escape.columnName('sessionGeneration');

		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${sessionGeneration}`);
	}
}
