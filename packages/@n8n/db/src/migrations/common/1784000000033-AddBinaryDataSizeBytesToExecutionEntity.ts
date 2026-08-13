import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddBinaryDataSizeBytesToExecutionEntity1784000000033 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const binaryDataSizeBytes = escape.columnName('binaryDataSizeBytes');

		// Not using addColumn DSL to avoid recreating this large table in SQLite.
		// See: https://github.com/n8n-io/n8n/blob/05c554dad53397f735003917f29eac5a5d62bdb4/.claude/plugins/n8n/skills/db-migrations/SKILL.md#sqlite-table-recreation-risk
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${binaryDataSizeBytes} BIGINT NOT NULL DEFAULT 0`,
		);

		// SQLite has no column comments, so annotate only on Postgres.
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${binaryDataSizeBytes} IS 'Byte size of binary data offloaded to separate storage (db/fs/S3), deduplicated by blob; excludes inline binary counted in jsonSizeBytes. 0 means unknown.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const binaryDataSizeBytes = escape.columnName('binaryDataSizeBytes');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${binaryDataSizeBytes}`);
	}
}
