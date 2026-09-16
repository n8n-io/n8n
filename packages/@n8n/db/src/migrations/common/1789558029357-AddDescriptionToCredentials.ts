import type { MigrationContext, ReversibleMigration } from '../migration-types';

const COLUMN_COMMENT =
	'User-supplied note on what the credential is for and where it belongs. Set and read through the credentials API';

export class AddDescriptionToCredentials1789558029357 implements ReversibleMigration {
	// Raw ALTER TABLE, not schemaBuilder.addColumns: several tables hold cascading
	// foreign keys to credentials_entity, and the SQLite table recreation that
	// addColumns triggers would fire them.
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('description');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} TEXT`);

		if (isPostgres) {
			await runQuery(`COMMENT ON COLUMN ${tableName}.${columnName} IS '${COLUMN_COMMENT}'`);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('credentials_entity');
		const columnName = escape.columnName('description');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
