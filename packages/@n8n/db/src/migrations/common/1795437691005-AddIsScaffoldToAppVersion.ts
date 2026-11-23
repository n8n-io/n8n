import type { MigrationContext, ReversibleMigration } from '../migration-types';

// app.draftVersionId and app.publishedVersionId reference app_version with ON DELETE SET NULL.
// The schema builder recreates the table on SQLite to add a column, which would clear them.
export class AddIsScaffoldToAppVersion1795437691005 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('app_version')} ADD COLUMN ${escape.columnName('isScaffold')} BOOLEAN NOT NULL DEFAULT FALSE;`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('app_version')} DROP COLUMN ${escape.columnName('isScaffold')};`,
		);
	}
}
