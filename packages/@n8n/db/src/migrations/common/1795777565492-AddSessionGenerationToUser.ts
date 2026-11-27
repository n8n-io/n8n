import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds a monotonic session generation counter to the `user` table.
 *
 * Raw ALTER TABLE avoids SQLite table recreation, which would copy the table
 * and fire incoming foreign-key CASCADE rules.
 */
export class AddSessionGenerationToUser1795777565492 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const table = escape.tableName('user');
		const column = escape.columnName('sessionGeneration');

		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} integer NOT NULL DEFAULT 0`);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${column} IS 'Monotonic counter incremented on MFA state changes to invalidate prior sessions'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('user');
		const column = escape.columnName('sessionGeneration');

		// Dropping the column removes each user's stored session generation counter.
		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${column}`);
	}
}
