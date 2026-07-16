import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Add the `availability` usage-surface column to `credentials_entity`.
 *
 * `workflow` (default) marks a normal canvas credential; `instance` marks a
 * credential consumable only by instance-level features (e.g. the Instance AI
 * model) and never in the workflow canvas. Varchar rather than a DB enum so
 * future surfaces can be added without a table rebuild.
 */
export class AddAvailabilityColumnToCredentialsTable1784000000049 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('availability');

		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR(16) NOT NULL DEFAULT 'workflow'`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('availability');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
