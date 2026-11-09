import type { MigrationContext, ReversibleMigration } from '../migration-types';

const COLUMN_COMMENT =
	'Version-scoped workflow settings, e.g. {"engineType":"v2"}. An empty object means the version has no version-scoped setting';

/**
 * Adds a `settings` JSON column to `workflow_history`. It holds only the
 * workflow settings that belong to a version, for now `engineType`.
 *
 * Raw `ALTER TABLE ADD COLUMN`, not the `addColumns` DSL helper: the table has
 * an incoming CASCADE FK from `workflow_publication_trigger_status`, and the
 * DSL recreates the table on SQLite, which would fire it. The default lets
 * SQLite add a NOT NULL column without a recreate.
 */
export class AddSettingsToWorkflowHistory1794238813000 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { escape, runQuery, isPostgres } = context;
		const tableName = escape.tableName('workflow_history');
		const columnName = escape.columnName('settings');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} JSON NOT NULL DEFAULT '{}'`);

		if (isPostgres) {
			await runQuery(`COMMENT ON COLUMN ${tableName}.${columnName} IS '${COLUMN_COMMENT}'`);
		}

		await this.backfillEngineOfLiveVersions(context);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('workflow_history');
		const columnName = escape.columnName('settings');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}

	/**
	 * Copies the workflow's engine to its draft, active and published versions.
	 * An empty object falls back to the draft's engine, so without a pin a draft
	 * engine change would also change the live version. The backend runs every
	 * value except `v2` on v1, so those get an explicit `v1`. Older versions keep
	 * `{}`: a publish writes their settings before they go live again.
	 */
	private async backfillEngineOfLiveVersions({ escape, runQuery, isSqlite }: MigrationContext) {
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

		const isEngineTypeV2 = isSqlite
			? `json_valid(${workflowSettings}) AND json_extract(${workflowSettings}, '$.engineType') = 'v2'`
			: `${workflowSettings} ->> 'engineType' = 'v2'`;

		const engine = `CASE WHEN ${isEngineTypeV2} THEN 'v2' ELSE 'v1' END`;

		const engineSettings = isSqlite
			? `json_object('engineType', ${engine})`
			: `json_build_object('engineType', ${engine})`;

		await runQuery(
			`UPDATE ${history}
			SET ${settings} = (
				SELECT ${engineSettings} FROM ${workflow}
				WHERE ${workflow}.${id} = ${history}.${workflowId}
			)
			WHERE ${history}.${versionId} IN (
				SELECT ${versionId} FROM ${workflow} WHERE ${versionId} IS NOT NULL
				UNION
				SELECT ${activeVersionId} FROM ${workflow} WHERE ${activeVersionId} IS NOT NULL
				UNION
				SELECT ${publishedVersionId} FROM ${published} WHERE ${publishedVersionId} IS NOT NULL
			)`,
		);
	}
}
