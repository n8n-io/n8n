import type { MigrationContext, ReversibleMigration } from '../migration-types';

// app.draftVersionId and app.publishedVersionId reference app_version with ON DELETE SET NULL.
// The schema builder recreates the table on SQLite to add a column, which would clear them.
export class AddDescriptionToAppVersion1793373652880 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('app_version')} ADD COLUMN ${escape.columnName('description')} TEXT;`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('app_version')} DROP COLUMN ${escape.columnName('description')};`,
		);
	}
}
