import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddIsPlaceholderToCredentials1794947163394 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const table = escape.tableName('credentials_entity');
		const column = escape.columnName('isPlaceholder');
		// Raw ALTER keeps the rows that reference a credential intact on SQLite.
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} boolean NOT NULL DEFAULT false`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${column} IS 'True for an empty credential that an incomplete promotion Apply created. Cleared when a person saves values.'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('credentials_entity')} DROP COLUMN ${escape.columnName('isPlaceholder')}`,
		);
	}
}
