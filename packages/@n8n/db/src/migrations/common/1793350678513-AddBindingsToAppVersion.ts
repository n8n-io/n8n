import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddBindingsToAppVersion1793350678513 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const table = escape.tableName('app_version');
		const column = escape.columnName('bindings');

		// ALTER keeps the rows on SQLite. A table rebuild would run the cascades of the foreign keys.
		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${column} ${isPostgres ? 'json' : 'text'} NOT NULL DEFAULT '[]'`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${column} IS 'Resources this app version can use: array of { key, kind, resource id, permissions }'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('app_version')} DROP COLUMN ${escape.columnName('bindings')}`,
		);
	}
}
