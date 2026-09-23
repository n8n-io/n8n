import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'scheduled_job';
const column = 'concurrencyLimit';

const maxInt = 2147483647;

/**
 * Adds the per-job concurrency ceiling to `scheduled_job`, with a partial index
 * over the jobs that carry one. NULL means no limit, so existing rows need no backfill.
 */
export class AddConcurrencyLimitToScheduledJob1790073725529 implements ReversibleMigration {
	// Rollback rebuilds scheduled_job. Disable foreign keys to preserve scheduled_task rows.
	withFKsDisabled = true as const;

	async up({ runQuery, escape, tablePrefix, schemaBuilder: { createIndex } }: MigrationContext) {
		const tableName = escape.tableName(table);
		const columnName = escape.columnName(column);

		// Limits below one would block all runs. CAST rejects fractional limits, which an
		// `int` column stores as-is here. The CHECK takes the name the DSL would give it,
		// so down() can find it with dropCheckConstraint.
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${columnName} int ` +
				`CONSTRAINT "CHK_${tablePrefix}${table}_${column}" CHECK (${columnName} IS NULL OR ` +
				`(${columnName} >= 1 AND ${columnName} <= ${maxInt} AND CAST(${columnName} AS INTEGER) = ${columnName}))`,
		);

		// Each task claim scans limited jobs. Exclude unlimited jobs to keep the index small.
		await createIndex(table, [column], false, undefined, `${columnName} IS NOT NULL`);
	}

	async down({ queryRunner, schemaBuilder, tablePrefix }: MigrationContext) {
		await schemaBuilder.dropIndex(table, [column]);
		// Drop the CHECK first so the rebuild cannot reference the removed column.
		await queryRunner.dropCheckConstraint(
			`${tablePrefix}${table}`,
			`CHK_${tablePrefix}${table}_${column}`,
		);
		await schemaBuilder.dropColumns(table, [column], { recreatesOnSqlite: true });
	}
}
