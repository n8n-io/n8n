import type { MigrationContext, ReversibleMigration } from '../migration-types';

const jobTable = 'scheduled_job';
const policyColumn = 'misfirePolicy';
const taskTypeColumn = 'taskType';

// Pinned like the policy values below: this migration must keep targeting the
// same rows even if the constant in `packages/cli` moves or changes.
const SCHEDULE_TRIGGER_TASK_TYPE = 'workflow:schedule-trigger';

// Pinned rather than read from `ScheduledJobMisfirePolicy`: a migration has to keep
// meaning what it meant when it ran, so a later addition to the enum needs its own
// migration and every instance converges on the same CHECK.
const POLICY_VALUES_BEFORE = ['coalesce', 'skip'];
const POLICY_VALUES = [...POLICY_VALUES_BEFORE, 'coalesce_owner'];

const POLICY_COMMENT_BEFORE =
	"What to do with occurrences that came due while nothing ran them: ''coalesce'' records a single catch-up run, ''skip'' records none.";
const POLICY_COMMENT =
	"What to do with occurrences that came due while nothing ran them: ''coalesce'' records a single late run per job, ''coalesce_owner'' a single one across every job the same owner scheduled, ''skip'' records none.";

/**
 * Two changes to `misfirePolicy`:
 * - widens its CHECK to accept the new `coalesce_owner` value
 * - moves existing Schedule Trigger jobs from `coalesce` to `skip`
 *
 * `skip` matches what n8n did before the durable scheduler: a missed run is
 * dropped, never run late. It is also an old, widely understood value, so
 * binaries from earlier releases handle the moved rows fine during a rolling
 * upgrade.
 *
 * `down()` moves those rows back to `coalesce`, and folds any `coalesce_owner`
 * rows to `coalesce` too (instead of deleting them), so a rollback leaves
 * every live trigger scheduled.
 */
export class AddCoalesceOwnerMisfirePolicy1786666615643 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.refreshTableMetadata(context);
		await this.setPolicyCheck(context, POLICY_VALUES);
		await this.moveScheduleTriggerPolicy(context, { from: 'coalesce', to: 'skip' });
		if (context.isPostgres) {
			await this.commentPolicyColumn(context, POLICY_COMMENT);
		}
	}

	async down(context: MigrationContext) {
		await this.refreshTableMetadata(context);
		await this.foldOwnerPolicyBack(context);
		await this.moveScheduleTriggerPolicy(context, { from: 'skip', to: 'coalesce' });
		await this.setPolicyCheck(context, POLICY_VALUES_BEFORE);
		if (context.isPostgres) {
			await this.commentPolicyColumn(context, POLICY_COMMENT_BEFORE);
		}
	}

	/**
	 * `misfirePolicy`, `misfireGraceSeconds` and `missedAfter` were added with raw
	 * `ALTER TABLE`, which TypeORM never observed, so the `Table` it caches per query
	 * runner can be stale. SQLite rebuilds the table from that cache for the CHECK swap
	 * and would silently drop those columns; every dialect refreshes rather than rely
	 * on what the cache happens to hold.
	 */
	private async refreshTableMetadata({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.getTable(`${tablePrefix}${jobTable}`);
	}

	private async setPolicyCheck({ schemaBuilder }: MigrationContext, values: string[]) {
		await schemaBuilder.dropEnumCheck(jobTable, policyColumn, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(jobTable, policyColumn, values, {
			recreatesOnSqlite: true,
		});
	}

	private async foldOwnerPolicyBack({ escape, runQuery }: MigrationContext) {
		const policy = escape.columnName(policyColumn);
		await runQuery(
			`UPDATE ${escape.tableName(jobTable)} SET ${policy} = 'coalesce' ` +
				`WHERE ${policy} = 'coalesce_owner'`,
		);
	}

	/** Only Schedule Trigger jobs: other task types pick their own policy. */
	private async moveScheduleTriggerPolicy(
		{ escape, runQuery }: MigrationContext,
		{ from, to }: { from: string; to: string },
	) {
		const policy = escape.columnName(policyColumn);
		const taskType = escape.columnName(taskTypeColumn);
		await runQuery(
			`UPDATE ${escape.tableName(jobTable)} SET ${policy} = '${to}' ` +
				`WHERE ${policy} = '${from}' AND ${taskType} = '${SCHEDULE_TRIGGER_TASK_TYPE}'`,
		);
	}

	/** Doubled quotes escape a literal apostrophe inside the SQL string. */
	private async commentPolicyColumn({ escape, runQuery }: MigrationContext, comment: string) {
		await runQuery(
			`COMMENT ON COLUMN ${escape.tableName(jobTable)}.${escape.columnName(policyColumn)} IS '${comment}'`,
		);
	}
}
