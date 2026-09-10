import type { MigrationContext, ReversibleMigration } from '../migration-types';

const JOB_TABLE = 'scheduled_job';
const PUBLISHED_VERSION_TABLE = 'workflow_published_version';

const WORKFLOW_COLUMN = 'workflowId';
const NODE_COLUMN = 'nodeId';
const OWNER_TYPE_COLUMN = 'ownerType';
const OWNER_ID_COLUMN = 'ownerId';
const OWNER_MEMBER_COLUMN = 'ownerMemberId';
const ORPHANED_AT_COLUMN = 'orphanedAt';

// Pinned, not read from `ScheduledJobOwnerType`, so renaming the constant later
// cannot change what this migration backfilled.
const WORKFLOW_OWNER_TYPE = 'workflow';
const SYSTEM_TASK_OWNER_TYPE = 'system-task';

const OWNER_TYPE_COMMENT =
	"What kind of thing owns this job, e.g. 'workflow' or 'system-task'. Not an enum: the scheduler only compares it, so a new owner kind needs no schema change.";
const OWNER_ID_COMMENT =
	'Which owner of that kind: a workflow id, a system task name, an agent id. Deleting the owner does not delete this row; the owning module deprovisions explicitly and the reconciliation sweep is the backstop.';
const OWNER_MEMBER_COMMENT =
	'Optional sub-identity within the owner, e.g. the trigger node id for a workflow; NULL when the owner has no parts.';
const ORPHANED_AT_COMMENT =
	"When the reconciliation sweep last confirmed this job's owner was gone; NULL while it is alive. Quarantine marker: the job's clock is cleared first and it is deleted only once this is older than the quarantine grace.";
const WORKFLOW_COMMENT =
	"References the workflow's published version, since only published trigger nodes get scheduled; NULL for system jobs not tied to a workflow. Unpublishing the workflow deletes its jobs.";
const NODE_COMMENT =
	'Trigger node within the workflow that owns this job; NULL for non-trigger jobs.';

/**
 * Generalizes a scheduled job's owner from "a workflow trigger node"
 * (`workflowId`/`nodeId` plus a foreign key) to plain data: `ownerType` +
 * `ownerId` + optional `ownerMemberId`, so anything can own scheduled jobs.
 *
 * The dropped foreign key took its `ON DELETE CASCADE` with it, which was the
 * only thing removing a workflow's jobs on unpublish. That job now belongs to
 * the application: owner modules deprovision explicitly, and a reconciliation
 * sweep quarantines what they miss (hence {@link ORPHANED_AT_COLUMN}).
 *
 * `ownerId` is as wide as `name` (255), not the workflow id's 36: an ownerless
 * row backfills its owner id from `name`, and truncating would merge two names
 * into one owner.
 */
export class GeneralizeScheduledJobOwner1788359043381 implements ReversibleMigration {
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
	 * with raw `ALTER TABLE`, so TypeORM's cached `Table` can be missing them. The
	 * SQLite recreations below rebuild the table from that cache and would drop
	 * them silently.
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
	 * ownerless one becomes a system task owning itself, keyed by its unique
	 * name, the same shape new system jobs are written with.
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
	 * Destructive on purpose: the restored foreign key only admits jobs whose
	 * workflow still has a published version, and jobs could outlive one while it
	 * was gone. Non-workflow owners keep a NULL `workflowId`, which it allows.
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
		// Queued occurrences go first: this migration runs with foreign keys disabled
		// on SQLite, so `scheduled_task`'s ON DELETE CASCADE does not fire.
		await runQuery(
			`DELETE FROM ${escape.tableName('scheduled_task')} WHERE ${escape.columnName('jobId')} IN ` +
				`(SELECT ${escape.columnName('id')} FROM ${table} WHERE ${orphaned})`,
		);
		await runQuery(`DELETE FROM ${table} WHERE ${orphaned}`);
	}
}
