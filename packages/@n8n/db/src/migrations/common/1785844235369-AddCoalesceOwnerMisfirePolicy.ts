import type { MigrationContext, ReversibleMigration } from '../migration-types';

const jobTable = 'scheduled_job';
const policyColumn = 'misfirePolicy';

// Pinned rather than read from `ScheduledJobMisfirePolicy`: a migration has to keep
// meaning what it meant when it ran, so a later addition to the enum needs its own
// migration and every instance converges on the same CHECK.
const POLICY_VALUES_BEFORE = ['coalesce', 'skip'];
const POLICY_VALUES = [...POLICY_VALUES_BEFORE, 'coalesce_owner'];

const POLICY_COMMENT_BEFORE =
	"What to do with occurrences that came due while nothing ran them: ''coalesce'' records a single catch-up run, ''skip'' records none.";
const POLICY_COMMENT =
	"What to do with occurrences that came due while nothing ran them: ''coalesce'' records a single catch-up run per job, ''coalesce_owner'' a single one across every job the same owner scheduled, ''skip'' records none.";

/**
 * Widens the `misfirePolicy` CHECK to accept `coalesce_owner`. Existing schedule
 * trigger jobs are left on `coalesce`; the scheduling module moves a node onto
 * `coalesce_owner` itself the next time it provisions that node (activation,
 * redefinition, or the node's own policy setting), not by a schema-time
 * rewrite. A blanket backfill here would move every existing schedule trigger
 * job onto a policy value that binaries predating this release do not
 * recognise (such a binary treats the row as corrupt, defers it by
 * `planRetrySeconds` and advances its clock), which a rolling upgrade or a
 * downgrade that skips `db:revert` would hit for every node at once instead of
 * only the ones provisioning finds.
 *
 * `down()` folds any `coalesce_owner` rows back to `coalesce` instead of
 * deleting them, so a rollback leaves every live trigger scheduled.
 */
export class AddCoalesceOwnerMisfirePolicy1785844235369 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.refreshTableMetadata(context);
		await this.setPolicyCheck(context, POLICY_VALUES);
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
	 * `ALTER TABLE`, which TypeORM never observed, so the `Table` it caches per query
	 * runner can be stale. SQLite rebuilds the table from that cache for the CHECK swap
	 * and would silently drop those columns. What the cache holds at this point depends
	 * on which unrelated migrations happened to run earlier on the same query runner, so
	 * every dialect refreshes rather than depend on that. `getTable()` reloads the real
	 * schema from the database.
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

	/** Doubled quotes escape a literal apostrophe inside the SQL string. */
	private async commentPolicyColumn({ escape, runQuery }: MigrationContext, comment: string) {
		await runQuery(
			`COMMENT ON COLUMN ${escape.tableName(jobTable)}.${escape.columnName(policyColumn)} IS '${comment}'`,
		);
	}
}
