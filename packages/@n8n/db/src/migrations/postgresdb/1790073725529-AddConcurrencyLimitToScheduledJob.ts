import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'scheduled_job';
const column = 'concurrencyLimit';

const maxInt = 2147483647;

/**
 * Adds the per-job concurrency ceiling to `scheduled_job`, with a partial index
 * over the jobs that carry one. NULL means no limit, so existing rows need no backfill.
 */
export class AddConcurrencyLimitToScheduledJob1790073725529 implements ReversibleMigration {
	async up({ runQuery, escape, tablePrefix, schemaBuilder: { createIndex } }: MigrationContext) {
		const tableName = escape.tableName(table);
		const columnName = escape.columnName(column);

		// Limits below one would block all runs.
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${columnName} int ` +
				`CONSTRAINT "CHK_${tablePrefix}${table}_${column}" CHECK (${columnName} IS NULL OR ` +
				`(${columnName} >= 1 AND ${columnName} <= ${maxInt}))`,
		);

		await runQuery(
			`COMMENT ON COLUMN ${tableName}.${columnName} IS ` +
				"'How many occurrences of this job may run at the same time. NULL means no limit.'",
		);

		// Each task claim scans limited jobs. Exclude unlimited jobs to keep the index small.
		await createIndex(table, [column], false, undefined, `${columnName} IS NOT NULL`);
	}

	async down({ runQuery, escape, schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropIndex(table, [column]);
		await runQuery(
			`ALTER TABLE ${escape.tableName(table)} DROP COLUMN ${escape.columnName(column)}`,
		);
	}
}
