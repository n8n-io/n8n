import { TableCheck } from '@n8n/typeorm';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'scheduled_job';
const taskTable = 'scheduled_task';
const kindColumn = 'kind';
const kindValuesBefore = ['cron', 'interval', 'one_off'];
const kindValues = [...kindValuesBefore, 'recurring_cron'];
const recurrenceUnitValues = ['hours', 'days', 'weeks', 'months'];

/**
 * Adds the `recurring_cron` schedule kind and its two supporting columns.
 *
 * A `recurring_cron` schedule pairs a cron expression with an "every N periods"
 * filter, so it can express schedules a cron expression cannot on its own, e.g.
 * "every 3 weeks on Mon and Wed" or "every 5 hours". The cron expression lists
 * the candidate run times (reusing the existing `cronExpression` / `timezone`
 * columns); the filter then keeps only every Nth of them. The N and the period
 * it counts live in the two new columns:
 *   - `recurrenceUnit`: the calendar period counted (hours, days, weeks, months)
 *   - `recurrenceSize`: the N, e.g. 3 for "every 3 weeks" (at least 2)
 */
export class AddRecurringCronScheduleKind1784000000045 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.addRecurrenceColumns(context);

		// `addRecurrenceColumns` adds the two columns via raw `ALTER TABLE ADD
		// COLUMN`, which TypeORM doesn't observe, so its cached `Table` metadata is
		// stale. On SQLite the next steps rebuild the whole table from that cache
		// (see `widenKindCheck` / `addRecurringCronPresenceCheck`); without this
		// refresh the rebuild would silently drop the two new columns.
		// `getTable()` reloads the real schema from PRAGMA table_info.
		if (context.isSqlite) {
			await context.queryRunner.getTable(`${context.tablePrefix}${table}`);
		}

		await this.widenKindCheck(context);
		await this.addRecurringCronPresenceCheck(context);
		if (context.isPostgres) {
			await this.commentColumns(context);
		}
	}

	async down(context: MigrationContext) {
		const { escape, queryRunner, tablePrefix, schemaBuilder } = context;
		const jobTable = escape.tableName(table);
		const kind = escape.columnName(kindColumn);

		// recurring_cron rows cannot exist under the narrowed kind CHECK. Their
		// queued occurrences are removed explicitly rather than via the job ->
		// task CASCADE, which is off while SQLite runs with FKs disabled.
		await context.runQuery(
			`DELETE FROM ${escape.tableName(taskTable)} WHERE ${escape.columnName('jobId')} IN ` +
				`(SELECT ${escape.columnName('id')} FROM ${jobTable} WHERE ${kind} = 'recurring_cron')`,
		);
		await context.runQuery(`DELETE FROM ${jobTable} WHERE ${kind} = 'recurring_cron'`);

		await queryRunner.dropCheckConstraint(
			`${tablePrefix}${table}`,
			`CHK_${tablePrefix}scheduled_job_recurring_cron`,
		);

		await schemaBuilder.dropEnumCheck(table, kindColumn, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(table, kindColumn, kindValuesBefore, {
			recreatesOnSqlite: true,
		});

		// The columns' own CHECK constraints must go before the columns: TypeORM's
		// SQLite table rebuild keeps checks referencing dropped columns, and SQLite
		// then reads `"recurrenceUnit"` as a string literal, failing every row copy.
		await queryRunner.dropCheckConstraint(
			`${tablePrefix}${table}`,
			`CHK_${tablePrefix}scheduled_job_recurrence_unit`,
		);
		await queryRunner.dropCheckConstraint(
			`${tablePrefix}${table}`,
			`CHK_${tablePrefix}scheduled_job_recurrence_size`,
		);

		await schemaBuilder.dropColumns(table, ['recurrenceUnit', 'recurrenceSize'], {
			recreatesOnSqlite: true,
		});

		if (context.isPostgres) {
			// Restore the comment `up()` overwrote (wording from CreateSchedulerTables).
			await context.runQuery(
				`COMMENT ON COLUMN ${jobTable}.${escape.columnName('cronExpression')} IS ` +
					"'Cron expression driving recurrence; set only when kind is ''cron''.'",
			);
		}
	}

	/**
	 * Adds the two columns with raw `ADD COLUMN` rather than the schema builder's
	 * `addColumns`, so SQLite doesn't rebuild the whole table just to add two
	 * nullable columns. Each column carries a CHECK on its own value (valid unit,
	 * size >= 2). Enforcing that both are set together on `recurring_cron` rows is
	 * a separate constraint, see `addRecurringCronPresenceCheck`.
	 */
	private async addRecurrenceColumns({ runQuery, escape, tablePrefix }: MigrationContext) {
		const jobTable = escape.tableName(table);
		const recurrenceUnit = escape.columnName('recurrenceUnit');
		const recurrenceSize = escape.columnName('recurrenceSize');

		const unitValues = recurrenceUnitValues.map((value) => `'${value}'`).join(', ');
		await runQuery(
			`ALTER TABLE ${jobTable} ADD COLUMN ${recurrenceUnit} varchar(16) ` +
				`CONSTRAINT "CHK_${tablePrefix}scheduled_job_recurrence_unit" CHECK (${recurrenceUnit} IN (${unitValues}))`,
		);
		await runQuery(
			`ALTER TABLE ${jobTable} ADD COLUMN ${recurrenceSize} int ` +
				`CONSTRAINT "CHK_${tablePrefix}scheduled_job_recurrence_size" CHECK (${recurrenceSize} >= 2)`,
		);
	}

	/**
	 * Adds `recurring_cron` to the values the `kind` CHECK constraint accepts
	 * (recreates the table on SQLite). Drops then re-adds the constraint: the
	 * original was created by the schema builder's `withEnumCheck`, so
	 * `dropEnumCheck` finds it by its deterministic name.
	 */
	private async widenKindCheck({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(table, kindColumn, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(table, kindColumn, kindValues, { recreatesOnSqlite: true });
	}

	private async addRecurringCronPresenceCheck({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.createCheckConstraint(
			`${tablePrefix}${table}`,
			new TableCheck({
				name: `CHK_${tablePrefix}scheduled_job_recurring_cron`,
				expression:
					'"kind" <> \'recurring_cron\' OR ("cronExpression" IS NOT NULL AND "recurrenceUnit" IS NOT NULL AND "recurrenceSize" IS NOT NULL)',
			}),
		);
	}

	private async commentColumns({ runQuery, escape }: MigrationContext) {
		const jobTable = escape.tableName(table);
		await runQuery(
			`COMMENT ON COLUMN ${jobTable}.${escape.columnName('recurrenceUnit')} IS ` +
				"'Calendar period counted by a recurring_cron schedule''s every-N-periods filter (hours, days, weeks, months). Set only when kind is ''recurring_cron''.'",
		);
		await runQuery(
			`COMMENT ON COLUMN ${jobTable}.${escape.columnName('recurrenceSize')} IS ` +
				"'The N in a recurring_cron schedule''s every-N-periods filter, e.g. 3 for every 3 weeks; at least 2. Set only when kind is ''recurring_cron''.'",
		);
		await runQuery(
			`COMMENT ON COLUMN ${jobTable}.${escape.columnName('cronExpression')} IS ` +
				"'Cron expression. For kind ''cron'' it is the schedule; for ''recurring_cron'' it lists the candidate run times that the every-N-periods filter then keeps every Nth of.'",
		);
	}
}
