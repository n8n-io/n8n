import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds `sharedCredentialsOnly` to `service_account_details`. When it is on, an
 * agent's account can use only the credentials shared with it directly, and
 * global ones. Its project memberships still give it workflows and data
 * tables, but no credentials.
 *
 * A raw `ADD COLUMN`, so SQLite does not recreate the table.
 */
export class AddSharedCredentialsOnlyToServiceAccountDetails1795504682688
	implements ReversibleMigration
{
	async up({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('service_account_details');
		const column = escape.columnName('sharedCredentialsOnly');
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} BOOLEAN NOT NULL DEFAULT FALSE`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('service_account_details');
		const column = escape.columnName('sharedCredentialsOnly');
		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${column}`);
	}
}
