import type { MigrationContext, ReversibleMigration } from '../migration-types';

const JOB_TABLE = 'scheduled_job';
const PUBLISHED_VERSION_TABLE = 'workflow_published_version';

const WORKFLOW_COLUMN = 'workflowId';
const NODE_COLUMN = 'nodeId';
const OWNER_TYPE_COLUMN = 'ownerType';
const OWNER_ID_COLUMN = 'ownerId';
const OWNER_MEMBER_COLUMN = 'ownerMemberId';
const ORPHANED_AT_COLUMN = 'orphanedAt';

// Pinned, not read from `ScheduledJobOwnerType`: a migration has to keep
// meaning what it meant when it ran, so a later rename of the constant cannot
// retroactively change the rows this backfilled.
const WORKFLOW_OWNER_TYPE = 'workflow';
const SYSTEM_TASK_OWNER_TYPE = 'system-task';

const OWNER_TYPE_COMMENT =
	"What kind of thing owns this job, e.g. 'workflow' or 'system-task'. Not an enum: the scheduler only compares it, so a new owner kind needs no schema change.";
const OWNER_ID_COMMENT =
	'Which owner of that kind: a workflow id, a system task name, an agent id. Deleting the owner does not delete this row; the owning module deprovisions explicitly and the reconciliation sweep is the backstop.';
const OWNER_MEMBER_COMMENT =
	'Optional sub-identity within the owner, e.g. the trigger node id for a workflow; NULL when the owner has no parts.';
const ORPHANED_AT_COMMENT =
	"When the reconciliation sweep last confirmed this job's owner was gone; NULL while it is alive. Quarantine marker: the job is disabled first and deleted only once this is older than the quarantine grace.";
const WORKFLOW_COMMENT =
	"References the workflow's published version, since only published trigger nodes get scheduled; NULL for system jobs not tied to a workflow. Unpublishing the workflow deletes its jobs.";
const NODE_COMMENT =
	'Trigger node within the workflow that owns this job; NULL for non-trigger jobs.';

/**
 * Generalizes a scheduled job's owner from "a workflow trigger node"
 * (`workflowId`/`nodeId` plus a foreign key to `workflow_published_version`)
 * to plain data: `ownerType` + `ownerId` + an optional `ownerMemberId`. Any
 * part of the product can then own scheduled jobs without the scheduler
 * knowing what an owner is.
 *
 * Dropping the foreign key drops its `ON DELETE CASCADE`, which was the only
 * thing removing a workflow's jobs on unpublish. That guarantee moves into the
 * application: every owner module deprovisions inside its own delete
 * transaction, and a reconciliation sweep quarantines the jobs of owners that
 * are gone (hence {@link ORPHANED_AT_COLUMN}). See the scheduler README's
 * "Owning scheduled jobs".
 *
 * `ownerId` is as wide as `name` (255) rather than the workflow id's 36: an
 * ownerless row backfills its owner id from `name`, so anything narrower could
 * overflow or, worse, silently truncate two names into one owner.
 */
export class GeneralizeScheduledJobOwner1787306400000 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.refreshTableMetadata(context);
		await this.addOwnerColumns(context);
		await this.backfillOwners(context);
		await this.requireOwner(context);
		await context.schemaBuilder.createIndex(JOB_TABLE, [
			OWNER_TYPE_COLUMN,
			OWNER_ID_COLUMN,
			OWNER_MEMBER_COLUMN,
		]);
		await context.schemaBuilder.dropIndex(JOB_TABLE, [WORKFLOW_COLUMN], { skipIfMissing: true });
		// Drops the column's foreign key with it, on both engines.
		await context.schemaBuilder.dropColumns(JOB_TABLE, [WORKFLOW_COLUMN, NODE_COLUMN], {
			recreatesOnSqlite: true,
		});
	}

	async down(context: MigrationContext) {
		await this.refreshTableMetadata(context);
		await this.addWorkflowColumns(context);
		await this.backfillWorkflowColumns(context);
		await this.deleteJobsTheForeignKeyWouldReject(context);
		await context.schemaBuilder.dropIndex(JOB_TABLE, [
			OWNER_TYPE_COLUMN,
			OWNER_ID_COLUMN,
			OWNER_MEMBER_COLUMN,
		]);
		await context.schemaBuilder.dropColumns(
			JOB_TABLE,
			[OWNER_TYPE_COLUMN, OWNER_ID_COLUMN, OWNER_MEMBER_COLUMN, ORPHANED_AT_COLUMN],
			{ recreatesOnSqlite: true },
		);
		await context.schemaBuilder.createIndex(
			JOB_TABLE,
			[WORKFLOW_COLUMN],
			false,
			undefined,
			'"workflowId" IS NOT NULL',
		);
		await context.schemaBuilder.addForeignKey(
			JOB_TABLE,
			WORKFLOW_COLUMN,
			[PUBLISHED_VERSION_TABLE, WORKFLOW_COLUMN],
			`FK_${context.tablePrefix}${JOB_TABLE}_${WORKFLOW_COLUMN}`,
			'CASCADE',
		);
	}

	/**
	 * `misfirePolicy`, `misfireGraceSeconds` and the recurrence columns were added
	 * with raw `ALTER TABLE`, which TypeORM never observed, so the `Table` it
	 * caches per query runner can be stale. SQLite rebuilds the table from that
	 * cache for every operation below that recreates it, and would silently drop
	 * those columns; every dialect refreshes rather than rely on what the cache
	 * happens to hold.
	 */
	private async refreshTableMetadata({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.getTable(`${tablePrefix}${JOB_TABLE}`);
	}

	/** Nullable first: existing rows have no owner to put in them yet. */
	private async addOwnerColumns({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			JOB_TABLE,
			[
				column(OWNER_TYPE_COLUMN).varchar(32).comment(OWNER_TYPE_COMMENT),
				column(OWNER_ID_COLUMN).varchar(255).comment(OWNER_ID_COMMENT),
				column(OWNER_MEMBER_COLUMN).varchar(36).comment(OWNER_MEMBER_COMMENT),
				column(ORPHANED_AT_COLUMN).timestampTimezone().comment(ORPHANED_AT_COMMENT),
			],
			{ recreatesOnSqlite: true },
		);
	}

	/**
	 * A workflow-owned job keeps its identity (`workflowId`/`nodeId`); an
	 * ownerless one becomes a self-owned system task, keyed by its own name,
	 * which is unique. That is the shape name-identified system jobs use, so a
	 * row written before this migration lands converges on the same owner.
	 */
	private async backfillOwners({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName(JOB_TABLE);
		const ownerType = escape.columnName(OWNER_TYPE_COLUMN);
		const ownerId = escape.columnName(OWNER_ID_COLUMN);
		const ownerMember = escape.columnName(OWNER_MEMBER_COLUMN);
		const workflow = escape.columnName(WORKFLOW_COLUMN);
		const node = escape.columnName(NODE_COLUMN);
		const name = escape.columnName('name');

		await runQuery(
			`UPDATE ${table} SET ${ownerType} = '${WORKFLOW_OWNER_TYPE}', ${ownerId} = ${workflow}, ` +
				`${ownerMember} = ${node} WHERE ${workflow} IS NOT NULL`,
		);
		await runQuery(
			`UPDATE ${table} SET ${ownerType} = '${SYSTEM_TASK_OWNER_TYPE}', ${ownerId} = ${name}, ` +
				`${ownerMember} = NULL WHERE ${workflow} IS NULL`,
		);
	}

	/** Every job has an owner from here on, so there is no ownerless code path. */
	private async requireOwner({ schemaBuilder: { addNotNull } }: MigrationContext) {
		await addNotNull(JOB_TABLE, OWNER_TYPE_COLUMN, { recreatesOnSqlite: true });
		await addNotNull(JOB_TABLE, OWNER_ID_COLUMN, { recreatesOnSqlite: true });
	}

	private async addWorkflowColumns({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			JOB_TABLE,
			[
				column(WORKFLOW_COLUMN).varchar(36).comment(WORKFLOW_COMMENT),
				column(NODE_COLUMN).varchar(36).comment(NODE_COMMENT),
			],
			{ recreatesOnSqlite: true },
		);
	}

	private async backfillWorkflowColumns({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName(JOB_TABLE);
		await runQuery(
			`UPDATE ${table} SET ${escape.columnName(WORKFLOW_COLUMN)} = ${escape.columnName(OWNER_ID_COLUMN)}, ` +
				`${escape.columnName(NODE_COLUMN)} = ${escape.columnName(OWNER_MEMBER_COLUMN)} ` +
				`WHERE ${escape.columnName(OWNER_TYPE_COLUMN)} = '${WORKFLOW_OWNER_TYPE}'`,
		);
	}

	/**
	 * Destructive, deliberately: the restored foreign key only admits jobs whose
	 * workflow still has a published version, and while it was gone jobs could
	 * outlive one. Owners other than `workflow` keep a NULL `workflowId`, which
	 * the nullable key allows, and become ownerless system jobs again.
	 */
	private async deleteJobsTheForeignKeyWouldReject({
		escape,
		runQuery,
		logger,
		migrationName,
	}: MigrationContext) {
		const table = escape.tableName(JOB_TABLE);
		const workflow = escape.columnName(WORKFLOW_COLUMN);
		const orphaned =
			`${workflow} IS NOT NULL AND ${workflow} NOT IN ` +
			`(SELECT ${workflow} FROM ${escape.tableName(PUBLISHED_VERSION_TABLE)})`;

		const [row] = await runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS ${escape.columnName('count')} FROM ${table} WHERE ${orphaned}`,
		);
		// Postgres returns COUNT as a bigint string.
		const count = Number(row.count);
		if (count === 0) {
			return;
		}

		logger.warn(
			`[${migrationName}] Deleting ${count} scheduled jobs whose workflow has no published version, which the restored foreign key rejects`,
		);
		// Their queued occurrences go first, explicitly: on SQLite this migration runs
		// with foreign keys disabled (the table recreations would otherwise cascade), so
		// `scheduled_task`'s ON DELETE CASCADE does not fire and would leave orphans.
		await runQuery(
			`DELETE FROM ${escape.tableName('scheduled_task')} WHERE ${escape.columnName('jobId')} IN ` +
				`(SELECT ${escape.columnName('id')} FROM ${table} WHERE ${orphaned})`,
		);
		await runQuery(`DELETE FROM ${table} WHERE ${orphaned}`);
	}
}
