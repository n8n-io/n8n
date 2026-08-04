import type { MigrationContext, ReversibleMigration } from '../migration-types';

const jobTable = 'scheduled_job';
const policyColumn = 'misfirePolicy';

// Pinned rather than read from `ScheduledJobMisfirePolicy`: a migration has to keep
// meaning what it meant when it ran, so a later addition to the enum needs its own
// migration and every instance converges on the same CHECK.
const POLICY_VALUES_BEFORE = ['coalesce', 'skip'];
const POLICY_VALUES = [...POLICY_VALUES_BEFORE, 'coalesce_owner'];
const SCHEDULE_TRIGGER_TASK_TYPE = 'workflow:schedule-trigger';

const POLICY_COMMENT_BEFORE =
	"What to do with occurrences that came due while nothing ran them: ''coalesce'' records a single catch-up run, ''skip'' records none.";
const POLICY_COMMENT =
	"What to do with occurrences that came due while nothing ran them: ''coalesce'' records a single catch-up run per job, ''coalesce_owner'' a single one across every job the same owner scheduled, ''skip'' records none.";

/**
 * Widens the `misfirePolicy` CHECK to accept `coalesce_owner`, and moves every
 * schedule trigger job onto it.
 *
 * Under `coalesce`, each job coalesces its own backlog, so a workflow with several
 * schedule rules produces one catch-up run per rule after an outage. Under
 * `coalesce_owner` the jobs that share an owner coalesce together, producing one
 * catch-up run for the workflow. System jobs stay on `coalesce`: they have no owner to
 * coalesce across.
 *
 * `down()` folds `coalesce_owner` rows back to `coalesce` instead of deleting them, so
 * a rollback leaves every live trigger scheduled.
 */
export class AddCoalesceOwnerMisfirePolicy1785844235369 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.refreshTableMetadata(context);
		await this.setPolicyCheck(context, POLICY_VALUES);
		await this.backfillScheduleTriggerJobs(context);
		if (context.isPostgres) {
			await this.commentPolicyColumn(context, POLICY_COMMENT);
		}
	}

	async down(context: MigrationContext) {
		await this.refreshTableMetadata(context);
		await this.foldOwnerPolicyBack(context);
		await this.setPolicyCheck(context, POLICY_VALUES_BEFORE);
		if (context.isPostgres) {
			await this.commentPolicyColumn(context, POLICY_COMMENT_BEFORE);
		}
	}

	/**
	 * `misfirePolicy`, `misfireGraceSeconds` and `missedAfter` were added with raw
	 * `ALTER TABLE ADD COLUMN`, which TypeORM never observed, so its cached `Table` can
	 * be stale. On SQLite the CHECK swap rebuilds the table from that cache, and a stale
	 * one would silently drop those columns. `getTable()` reloads the real schema from
	 * PRAGMA table_info.
	 */
	private async refreshTableMetadata({ isSqlite, queryRunner, tablePrefix }: MigrationContext) {
		if (!isSqlite) return;
		await queryRunner.getTable(`${tablePrefix}${jobTable}`);
	}

	private async setPolicyCheck({ schemaBuilder }: MigrationContext, values: string[]) {
		await schemaBuilder.dropEnumCheck(jobTable, policyColumn, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(jobTable, policyColumn, values, {
			recreatesOnSqlite: true,
		});
	}

	private async backfillScheduleTriggerJobs({ escape, runQuery }: MigrationContext) {
		const policy = escape.columnName(policyColumn);
		await runQuery(
			`UPDATE ${escape.tableName(jobTable)} SET ${policy} = 'coalesce_owner' ` +
				`WHERE ${policy} = 'coalesce' AND ${escape.columnName('taskType')} = '${SCHEDULE_TRIGGER_TASK_TYPE}'`,
		);
	}

	private async foldOwnerPolicyBack({ escape, runQuery }: MigrationContext) {
		const policy = escape.columnName(policyColumn);
		await runQuery(
			`UPDATE ${escape.tableName(jobTable)} SET ${policy} = 'coalesce' ` +
				`WHERE ${policy} = 'coalesce_owner'`,
		);
	}

	/** Doubled quotes escape a literal apostrophe inside the SQL string. */
	private async commentPolicyColumn({ escape, runQuery }: MigrationContext, comment: string) {
		await runQuery(
			`COMMENT ON COLUMN ${escape.tableName(jobTable)}.${escape.columnName(policyColumn)} IS '${comment}'`,
		);
	}
}
