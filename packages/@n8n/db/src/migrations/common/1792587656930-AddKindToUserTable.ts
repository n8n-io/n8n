import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Service accounts share the `user` table with humans. The `kind` column tells
 * the two apart. The table has incoming foreign keys, so the column is added
 * with a raw `ALTER TABLE`: the DSL recreates the table on SQLite, and the
 * recreate fires the CASCADE rules of those keys.
 */
export class AddKindToUserTable1792587656930 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres, tablePrefix }: MigrationContext) {
		const table = escape.tableName('user');
		const kind = escape.columnName('kind');
		const checkName = escape.columnName(`CHK_${tablePrefix}user_kind`);
		const check = `CHECK (${kind} IN ('human', 'service'))`;

		if (isPostgres) {
			// `NOT VALID` skips the scan of existing rows. They all get the default.
			await runQuery(
				`ALTER TABLE ${table} ADD COLUMN ${kind} VARCHAR(16) NOT NULL DEFAULT 'human'`,
			);
			await runQuery(`ALTER TABLE ${table} ADD CONSTRAINT ${checkName} ${check} NOT VALID`);
			await runQuery(`COMMENT ON COLUMN ${table}.${kind} IS 'Kind of account: human or service'`);
			return;
		}

		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${kind} VARCHAR(16) NOT NULL DEFAULT 'human' CONSTRAINT ${checkName} ${check}`,
		);
	}

	/**
	 * Removes every service account before the column goes. Linked rows follow
	 * the delete rules of their foreign keys, except `auth_identity`, whose key
	 * has no delete rule.
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
