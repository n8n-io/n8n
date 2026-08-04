import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'user';
const columnName = 'type';

/**
 * Distinguishes human users from non-human service accounts.
 *
 * Raw DDL rather than `schemaBuilder.addColumns(..., { recreatesOnSqlite: true })`:
 * the DSL recreates the `user` table on SQLite, and `user` is the target of
 * CASCADE foreign keys from `project_relation`, `shared_workflow`,
 * `shared_credentials`, `auth_identity` and `user_api_keys`. An `ADD COLUMN`
 * with a default works on every supported engine and touches no FKs.
 */
export class AddTypeToUser1785763124126 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(
			`ALTER TABLE ${escapedTableName} ADD COLUMN ${escapedColumnName} VARCHAR(32) NOT NULL DEFAULT 'user'`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(`ALTER TABLE ${escapedTableName} DROP COLUMN ${escapedColumnName}`);
	}
}
