import type { MigrationContext, ReversibleMigration } from '../migration-types';

const COLUMN_COMMENT =
	'Version-scoped workflow settings, e.g. {"engineType":"v2"}. Null means no version-scoped setting was saved with this version';

/**
 * Adds a nullable `settings` JSON column to `workflow_history`. It holds only
 * the workflow settings that belong to a version, for now `engineType`.
 *
 * Raw `ALTER TABLE ADD COLUMN`, not the `addColumns` DSL helper: the table has
 * an incoming CASCADE FK from `workflow_publication_trigger_status`, and the
 * DSL recreates the table on SQLite, which would fire it.
 */
export class AddSettingsToWorkflowHistory1793356114810 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { escape, runQuery, isPostgres } = context;
		const tableName = escape.tableName('workflow_history');
		const columnName = escape.columnName('settings');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} JSON`);

		if (isPostgres) {
			await runQuery(`COMMENT ON COLUMN ${tableName}.${columnName} IS '${COLUMN_COMMENT}'`);
		}

		await this.backfillDraftAndPublishedVersions(context);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('workflow_history');
		const columnName = escape.columnName('settings');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}

	/**
	 * Copies the workflow's engine to its draft, active and published versions.
	 * Older versions stay null: they ran on the engine of their time.
	 */
	private async backfillDraftAndPublishedVersions({
		escape,
		runQuery,
		isSqlite,
	}: MigrationContext) {
		const history = escape.tableName('workflow_history');
		const workflow = escape.tableName('workflow_entity');
		const published = escape.tableName('workflow_published_version');
		const id = escape.columnName('id');
		const settings = escape.columnName('settings');
		const versionId = escape.columnName('versionId');
		const activeVersionId = escape.columnName('activeVersionId');
		const workflowId = escape.columnName('workflowId');
		const publishedVersionId = escape.columnName('publishedVersionId');

		const workflowSettings = `${workflow}.${settings}`;
		// SQLite: the CASE skips malformed JSON, because json_type throws on it.
		const hasEngine = isSqlite
			? `CASE WHEN json_valid(${workflowSettings}) THEN json_type(${workflowSettings}, '$.engineType') END = 'text'`
			: `jsonb_typeof(${workflowSettings}::jsonb -> 'engineType') = 'string'`;
		const engineSettings = isSqlite
			? `json_object('engineType', json_extract(${workflowSettings}, '$.engineType'))`
			: `json_build_object('engineType', ${workflowSettings}::jsonb ->> 'engineType')`;

		await runQuery(
			`UPDATE ${history}
			SET ${settings} = (
				SELECT ${engineSettings} FROM ${workflow}
				WHERE ${workflow}.${id} = ${history}.${workflowId}
			)
			WHERE ${history}.${versionId} IN (
				SELECT ${workflow}.${versionId} FROM ${workflow} WHERE ${hasEngine}
				UNION
				SELECT ${workflow}.${activeVersionId} FROM ${workflow} WHERE ${hasEngine}
				UNION
				SELECT ${published}.${publishedVersionId} FROM ${published}
				JOIN ${workflow} ON ${workflow}.${id} = ${published}.${workflowId}
				WHERE ${hasEngine}
			)`,
		);
	}
}
