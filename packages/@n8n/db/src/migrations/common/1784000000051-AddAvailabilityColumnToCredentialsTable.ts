import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAvailabilityColumnToCredentialsTable1784000000051 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('availability');

		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR(16) NOT NULL DEFAULT 'workflow' CHECK (${columnName} IN ('workflow', 'instance'))`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${columnName} IS 'Where the credential may be consumed: workflow execution or an instance-level feature'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('availability');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
