import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddBindingsToApp1793187301311 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const table = escape.tableName('app');
		const column = escape.columnName('bindings');

		// ALTER preserves the app versions on SQLite. A table rebuild would cascade-delete them.
		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${column} ${isPostgres ? 'json' : 'text'} NOT NULL DEFAULT '[]'`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${column} IS 'Resources the app can use: array of { key, kind, resource id, permissions }'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('app')} DROP COLUMN ${escape.columnName('bindings')}`,
		);
	}
}
