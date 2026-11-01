import type { MigrationContext, ReversibleMigration } from '../migration-types';

const COLUMN_COMMENT =
	'Version-scoped workflow settings, e.g. {"engineType":"v2"}. An empty object means the version has no version-scoped setting';

/**
 * Adds a `settings` JSON column to `workflow_history`. It holds only the
 * workflow settings that belong to a version, for now `engineType`.
 * Existing versions get an empty object: engine v2 is still in development,
 * so no workflow needs its engine copied.
 *
 * Raw `ALTER TABLE ADD COLUMN`, not the `addColumns` DSL helper: the table has
 * an incoming CASCADE FK from `workflow_publication_trigger_status`, and the
 * DSL recreates the table on SQLite, which would fire it. The default lets
 * SQLite add a NOT NULL column without a recreate.
 */
export class AddSettingsToWorkflowHistory1793371421343 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('workflow_history');
		const columnName = escape.columnName('settings');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} JSON NOT NULL DEFAULT '{}'`);

		if (isPostgres) {
			await runQuery(`COMMENT ON COLUMN ${tableName}.${columnName} IS '${COLUMN_COMMENT}'`);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('workflow_history');
		const columnName = escape.columnName('settings');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
