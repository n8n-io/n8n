import type { MigrationContext, IrreversibleMigration } from '../migration-types';

const UPDATE_SCOPE = 'project:update';
const MANAGE_USERS_SCOPE = 'project:manageUsers';

type ApiKeyRow = { id: string; scopes: string | string[] | null };

/**
 * Companion to AddProjectManageUsersScopeToCustomRoles: public API keys carry
 * their own frozen scope list, so a key that could add project members via
 * `project:update` needs the new `project:manageUsers` scope to keep working.
 *
 * Irreversible: a faithful `down()` would have to know which keys already
 * carried `project:manageUsers` before this ran, and that state isn't captured.
 *
 * Compatible with SQLite and PostgreSQL.
 */
export class AddProjectManageUsersScopeToApiKeys1786526297065 implements IrreversibleMigration {
	async up(context: MigrationContext) {
		const { escape, runQuery, runInBatches, parseJson, logger, migrationName } = context;

		const table = escape.tableName('user_api_keys');
		const idColumn = escape.columnName('id');
		const scopesColumn = escape.columnName('scopes');

		// Rows are filtered in Node rather than SQL: the column is `json` on
		// Postgres and `text` on SQLite, so a portable LIKE would need a cast.
		// The table holds one row per API key, so the scan is cheap.
		await runInBatches<ApiKeyRow>(
			`SELECT ${idColumn} AS "id", ${scopesColumn} AS "scopes" FROM ${table}`,
			async (rows) => {
				for (const row of rows) {
					try {
						const scopes = parseJson<string[]>(row.scopes ?? '[]');
						if (!Array.isArray(scopes)) continue;
						if (!scopes.includes(UPDATE_SCOPE)) continue;
						if (scopes.includes(MANAGE_USERS_SCOPE)) continue;

						await runQuery(
							`UPDATE ${table} SET ${scopesColumn} = :scopes WHERE ${idColumn} = :id`,
							{ scopes: JSON.stringify([...scopes, MANAGE_USERS_SCOPE]), id: row.id },
						);
					} catch (error) {
						logger.warn(
							`[${migrationName}] Could not update scopes for API key ${row.id}: ${(error as Error).message}. Skipping.`,
						);
					}
				}
			},
		);
	}
}
