import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Service accounts share the `user` table with people. The `kind` column tells
 * the two apart.
 *
 * The column is added and dropped with raw SQL, so SQLite never rebuilds
 * `user`. A rebuild copies every row, and in `down` it would run with foreign
 * keys on, so its DROP TABLE would fire the CASCADE rules of the 48 tables
 * that reference `user`.
 *
 * Only PostgreSQL gets a CHECK. SQLite refuses to drop a column that a
 * table-level CHECK names, and any later TypeORM rebuild of `user` turns an
 * inline CHECK into one. `down` would then need a rebuild with foreign keys
 * off, and then the delete of the service accounts would not cascade.
 */
export class AddKindToUserTable1792742505679 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres, tablePrefix }: MigrationContext) {
		const table = escape.tableName('user');
		const kind = escape.columnName('kind');

		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${kind} VARCHAR(16) NOT NULL DEFAULT 'person'`);

		if (isPostgres) {
			const checkName = escape.columnName(`CHK_${tablePrefix}user_kind`);
			// `NOT VALID` skips the scan of existing rows. They all get the default.
			await runQuery(
				`ALTER TABLE ${table} ADD CONSTRAINT ${checkName} CHECK (${kind} IN ('person', 'service')) NOT VALID`,
			);
			await runQuery(`COMMENT ON COLUMN ${table}.${kind} IS 'Kind of account: person or service'`);
		}
	}

	/**
	 * Removes every service account before the column goes. Linked rows follow
	 * the delete rules of their foreign keys, except `auth_identity`, whose key
	 * has no delete rule. On PostgreSQL, the CHECK goes with the column.
	 */
	async down({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('user');
		const kind = escape.columnName('kind');
		const serviceAccountIds = `SELECT id FROM ${table} WHERE ${kind} = 'service'`;

		await runQuery(
			`DELETE FROM ${escape.tableName('auth_identity')} WHERE ${escape.columnName('userId')} IN (${serviceAccountIds})`,
		);
		await runQuery(`DELETE FROM ${table} WHERE ${kind} = 'service'`);
		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${kind}`);
	}
}
