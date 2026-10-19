import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Service accounts share the `user` table with humans. The `type` column tells
 * the two kinds apart. The table has incoming foreign keys, so the column is
 * added with a raw `ALTER TABLE`: the DSL recreates the table on SQLite and
 * the recreate fires the CASCADE rules of those keys.
 */
export class AddTypeToUserTable1791986966630 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const table = escape.tableName('user');
		const column = escape.columnName('type');

		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${column} VARCHAR(32) NOT NULL DEFAULT 'human' ` +
				`CONSTRAINT "CHK_user_type" CHECK (${column} IN ('human', 'service'))`,
		);

		if (isPostgres) {
			await runQuery(`COMMENT ON COLUMN ${table}.${column} IS 'Kind of caller: human or service'`);
		}
	}

	/** Removes every service account first. Their linked rows follow the delete rules of the foreign keys. */
	async down({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('user');
		const column = escape.columnName('type');

		await runQuery(`DELETE FROM ${table} WHERE ${column} = 'service'`);
		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${column}`);
	}
}
