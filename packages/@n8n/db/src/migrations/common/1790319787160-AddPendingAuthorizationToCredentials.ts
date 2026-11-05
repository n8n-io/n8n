import type { MigrationContext, ReversibleMigration } from '../migration-types';

const COLUMN_COMMENT =
	'Set on a credential created for an OAuth authorization the user has not completed yet. Cleared when a token is written; rows past this time are deleted by the pending-authorization cleanup task';

export class AddPendingAuthorizationToCredentials1790319787160 implements ReversibleMigration {
	// Raw ALTER TABLE, not addColumns: credentials_entity has cascading FKs and the
	// SQLite table recreation would fire them.
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('pendingAuthorizationExpiresAt');
		const columnType = isPostgres ? 'TIMESTAMPTZ(3)' : 'DATETIME';

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);

		if (isPostgres) {
			await runQuery(`COMMENT ON COLUMN ${tableName}.${columnName} IS '${COLUMN_COMMENT}'`);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('pendingAuthorizationExpiresAt');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
