import type { MigrationContext, ReversibleMigration } from '../migration-types';

const jobTable = 'scheduled_job';
const taskTable = 'scheduled_task';
const policyColumn = 'misfirePolicy';
const graceColumn = 'misfireGraceSeconds';
const missedAfterColumn = 'missedAfter';

// Pinned rather than read from `ScheduledJobMisfirePolicy`: a migration has to keep
// meaning what it meant when it ran, so a later addition to the enum needs its own
// migration and every instance converges on the same CHECK.
const POLICY_VALUES = ['coalesce', 'skip'];
const DEFAULT_POLICY = 'coalesce';
const DEFAULT_GRACE_SECONDS = 60;

/**
 * Adds the misfire policy to `scheduled_job`, and each occurrence's own deadline to
 * `scheduled_task`.
 *
 * The policy decides what happens to occurrences that came due while nothing was
 * there to run them and are now past their grace window: `coalesce` records a single
 * catch-up run, `skip` records none. `missedAfter` is that grace resolved to an
 * absolute instant, so the claim compares one indexed column against the clock.
 *
 * Both job columns are NOT NULL with defaults, so existing rows need no backfill.
 * `missedAfter` is nullable, which the claim reads as "no deadline".
 */
export class AddMisfirePolicyToScheduler1785247194307 implements ReversibleMigration {
	async up(context: MigrationContext) {
		// A rename of this migration's file leaves an instance that already ran it
		// under the old name with no record of that under the current one, so a
		// plain rerun here would fail on columns that already exist. Guard on the
		// first one instead: it was added atomically with everything else this
		// migration does, so its presence means the rest is already done too.
		const alreadyApplied = await context.queryRunner.hasColumn(
			`${context.tablePrefix}${jobTable}`,
			policyColumn,
		);
		if (alreadyApplied) return;

		await this.addJobPolicyColumns(context);
		await this.addTaskDeadlineColumn(context);
		// Partial, so it holds only the rows the reaper sweeps and orders by, not the
		// whole table.
		await context.schemaBuilder.createIndex(
			taskTable,
			[missedAfterColumn],
			false,
			undefined,
			`"status" = 'pending' AND ${context.escape.columnName(missedAfterColumn)} IS NOT NULL`,
		);
		if (context.isPostgres) {
			await this.commentColumns(context);
		}
	}

	async down({ queryRunner, runQuery, escape, tablePrefix, schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropIndex(taskTable, [missedAfterColumn]);
		// The columns' own CHECKs go first: TypeORM's SQLite rebuild keeps a check
		// referencing a dropped column, and every row copy then fails.
		await queryRunner.dropCheckConstraint(
			`${tablePrefix}${jobTable}`,
			`CHK_${tablePrefix}${jobTable}_${policyColumn}`,
		);
		await queryRunner.dropCheckConstraint(
			`${tablePrefix}${jobTable}`,
			`CHK_${tablePrefix}${jobTable}_${graceColumn}`,
		);
		await schemaBuilder.dropColumns(jobTable, [policyColumn, graceColumn], {
			recreatesOnSqlite: true,
		});
		// Raw `DROP COLUMN`, for the same reason `up` adds it raw: the column carries no
		// constraint, so nothing needs the SQLite rebuild that `dropColumns` would do to
		// the largest table here.
		await runQuery(
			`ALTER TABLE ${escape.tableName(taskTable)} DROP COLUMN ${escape.columnName(missedAfterColumn)}`,
		);
	}

	/**
	 * Raw `ADD COLUMN` rather than the schema builder's `addColumns`, so SQLite does
	 * not rebuild the table to add two columns that carry their own defaults. The
	 * CHECKs are named the way the DSL's `withEnumCheck` names its own, so a later
	 * migration can find them with `dropEnumCheck`.
	 */
	private async addJobPolicyColumns({ runQuery, escape, tablePrefix }: MigrationContext) {
		const tableName = escape.tableName(jobTable);
		const policy = escape.columnName(policyColumn);
		const grace = escape.columnName(graceColumn);
		const policyValues = POLICY_VALUES.map((value) => `'${value}'`).join(', ');

		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${policy} varchar(16) NOT NULL DEFAULT '${DEFAULT_POLICY}' ` +
				`CONSTRAINT "CHK_${tablePrefix}${jobTable}_${policyColumn}" CHECK (${policy} IN (${policyValues}))`,
		);
		// Zero would put every occurrence past its deadline the instant it came due, so
		// `skip` would discard each one and the schedule would never fire again.
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${grace} int NOT NULL DEFAULT ${DEFAULT_GRACE_SECONDS} ` +
				`CONSTRAINT "CHK_${tablePrefix}${jobTable}_${graceColumn}" CHECK (${grace} > 0)`,
		);
	}

	/**
	 * Nullable and unconstrained: the materializer computes the value, and rows that
	 * predate this migration legitimately have none.
	 */
	private async addTaskDeadlineColumn({ runQuery, escape, isPostgres }: MigrationContext) {
		const type = isPostgres ? 'timestamptz(3)' : 'datetime(3)';
		await runQuery(
			`ALTER TABLE ${escape.tableName(taskTable)} ADD COLUMN ${escape.columnName(missedAfterColumn)} ${type}`,
		);
	}

	private async commentColumns({ runQuery, escape }: MigrationContext) {
		// Doubled quotes escape a literal apostrophe inside the SQL string.
		const comments: Array<[string, string, string]> = [
			[
				jobTable,
				policyColumn,
				"What to do with occurrences that came due while nothing ran them: ''coalesce'' records a single catch-up run, ''skip'' records none.",
			],
			[
				jobTable,
				graceColumn,
				'How late an occurrence may be before the misfire policy applies to it; an ordinary restart stays inside it.',
			],
			[
				taskTable,
				missedAfterColumn,
				"When this occurrence stops being worth running (runAt plus the job''s misfire grace). NULL means no deadline.",
			],
		];

		for (const [table, column, comment] of comments) {
			await runQuery(
				`COMMENT ON COLUMN ${escape.tableName(table)}.${escape.columnName(column)} IS '${comment}'`,
			);
		}
	}
}
