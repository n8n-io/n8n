import type { MigrationContext, ReversibleMigration } from '../migration-types';

const jobTable = 'scheduled_job';
const ownerColumn = 'ownerId';

/**
 * Lets a scheduled job belong to something other than a workflow's trigger node.
 *
 * Until now a job was identified by `(workflowId, nodeId)`, which is what
 * provisioning diffs and deprovisioning deletes by. A per-person schedule for a
 * catalog workflow has no node — several people can hold their own schedules for
 * the same workflow — so it needs an identity of its own. `ownerId` is that
 * identity, deliberately opaque: the scheduler pairs it with `taskType` and never
 * interprets it, so a feature owning jobs does not add a table the scheduler has
 * to know about.
 *
 * Nullable, since every existing job is node-owned and stays that way.
 */
export class AddOwnerToScheduledJob1785920873647 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.addOwnerColumn(context);
		// Partial: only owner-scoped jobs are looked up this way, and they are a
		// small minority of the table.
		await context.schemaBuilder.createIndex(
			jobTable,
			['taskType', ownerColumn],
			false,
			undefined,
			`${context.escape.columnName(ownerColumn)} IS NOT NULL`,
		);
		if (context.isPostgres) {
			await this.commentColumn(context);
		}
	}

	async down({ schemaBuilder, runQuery, escape }: MigrationContext) {
		await schemaBuilder.dropIndex(jobTable, ['taskType', ownerColumn], { skipIfMissing: true });
		// Raw `DROP COLUMN` for the same reason `up` adds it raw: `scheduled_task`
		// cascades from this table, and a SQLite rebuild would take its rows with it.
		await runQuery(
			`ALTER TABLE ${escape.tableName(jobTable)} DROP COLUMN ${escape.columnName(ownerColumn)}`,
		);
	}

	/**
	 * Raw `ADD COLUMN` rather than the schema builder's `addColumns`: on SQLite that
	 * rebuilds the table, and `scheduled_task` cascades from it, so the rebuild's
	 * internal `DROP TABLE` would delete every queued occurrence on the instance.
	 * The column is nullable and carries no constraint, so the plain statement works
	 * on both engines.
	 */
	private async addOwnerColumn({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName(jobTable)} ADD COLUMN ${escape.columnName(ownerColumn)} varchar(36)`,
		);
	}

	private async commentColumn({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`COMMENT ON COLUMN ${escape.tableName(jobTable)}.${escape.columnName(ownerColumn)} IS ` +
				"'Opaque owner of jobs that belong to no trigger node, scoped together with taskType. NULL for node-owned jobs.'",
		);
	}
}
