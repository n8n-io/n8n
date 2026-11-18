import type { MigrationContext, ReversibleMigration } from '../migration-types';

const COLUMN_COMMENT =
	'Facts from the published workflow or agent, such as triggers, URLs and model. Null on child pages';

/**
 * Adds a `properties` JSON column to `doc_page`.
 *
 * Raw `ALTER TABLE ADD COLUMN`, not the `addColumns` DSL helper: the table has
 * a CASCADE FK to itself, and the DSL recreates the table on SQLite.
 */
export class AddPropertiesToDocPage1795000000000 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('doc_page');
		const columnName = escape.columnName('properties');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} JSON`);

		if (isPostgres) {
			await runQuery(`COMMENT ON COLUMN ${tableName}.${columnName} IS '${COLUMN_COMMENT}'`);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('doc_page');
		const columnName = escape.columnName('properties');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
