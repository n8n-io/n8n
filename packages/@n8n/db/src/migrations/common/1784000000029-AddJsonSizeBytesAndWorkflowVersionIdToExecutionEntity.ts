import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddJsonSizeBytesAndWorkflowVersionIdToExecutionEntity1784000000029
	implements ReversibleMigration
{
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const jsonSizeBytes = escape.columnName('jsonSizeBytes');
		const workflowVersionId = escape.columnName('workflowVersionId');

		// Not using addColumn DSL to avoid recreating this large table in SQLite.
		// See: https://github.com/n8n-io/n8n/blob/05c554dad53397f735003917f29eac5a5d62bdb4/.claude/plugins/n8n/skills/db-migrations/SKILL.md#sqlite-table-recreation-risk
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${jsonSizeBytes} BIGINT NOT NULL DEFAULT 0`,
		);
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${workflowVersionId} VARCHAR(36) DEFAULT NULL`,
		);

		// SQLite has no column comments, so annotate only on Postgres.
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${jsonSizeBytes} IS 'Byte size of the JSON execution data bundle (run data, workflow snapshot, version id); excludes binary data. 0 means unknown.'`,
			);
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${workflowVersionId} IS 'Version id of the workflow run by this execution; denormalized from the data bundle.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const jsonSizeBytes = escape.columnName('jsonSizeBytes');
		const workflowVersionId = escape.columnName('workflowVersionId');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${workflowVersionId}`);
		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${jsonSizeBytes}`);
	}
}
