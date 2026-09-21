import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'scheduled_job';
const column = 'concurrencyLimit';

const MAX_INT = 2147483647;

const COLUMN_COMMENT =
	'How many occurrences of this job may run at the same time. NULL means no limit.';

// The task claim reads the set of limited jobs on every pass. Partial, so the
// index stays as small as that set and costs nothing on unlimited jobs.
const LIMITED_JOBS_ONLY = `"${column}" IS NOT NULL`;

/**
 * Adds the per-job concurrency ceiling to `scheduled_job`, with a partial index
 * over the jobs that carry one.
 *
 * Nullable, with NULL meaning "no limit", so existing rows keep the unlimited
 * behaviour they were written under and need no backfill.
 */
export class AddConcurrencyLimitToScheduledJob1789985459329 implements ReversibleMigration {
	/**
	 * Raw `ADD COLUMN` rather than the schema builder's `addColumns`, so SQLite does
	 * not rebuild a table whose `scheduled_task` rows would cascade away. The CHECK is
	 * named the way the DSL names its own, so a later migration can find it.
	 */
	async up({
		runQuery,
		escape,
		tablePrefix,
		isPostgres,
		isSqlite,
		schemaBuilder: { createIndex },
	}: MigrationContext) {
		const tableName = escape.tableName(table);
		const columnName = escape.columnName(column);

		// SQLite keeps 1.5 as-is in a column declared `int`, so only there does the
		// check need a term to keep the limit whole. Postgres folds the same term into
		// a tautology, because its column type cannot hold a fractional value.
		const whole = isSqlite ? ` AND CAST(${columnName} AS INTEGER) = ${columnName}` : '';

		// A limit below one would hold every occurrence back forever.
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${columnName} int ` +
				`CONSTRAINT "CHK_${tablePrefix}${table}_${column}" CHECK (${columnName} IS NULL OR ` +
				`(${columnName} >= 1 AND ${columnName} <= ${MAX_INT}${whole}))`,
		);

		if (isPostgres) {
			await runQuery(`COMMENT ON COLUMN ${tableName}.${columnName} IS '${COLUMN_COMMENT}'`);
		}

		await createIndex(table, [column], false, undefined, LIMITED_JOBS_ONLY);
	}

	async down({ queryRunner, schemaBuilder, tablePrefix }: MigrationContext) {
		await schemaBuilder.dropIndex(table, [column]);
		// The column's CHECK goes first: TypeORM's SQLite rebuild keeps a check
		// referencing a dropped column, and every row copy then fails.
		await queryRunner.dropCheckConstraint(
			`${tablePrefix}${table}`,
			`CHK_${tablePrefix}${table}_${column}`,
		);
		await schemaBuilder.dropColumns(table, [column], { recreatesOnSqlite: true });
	}
}
