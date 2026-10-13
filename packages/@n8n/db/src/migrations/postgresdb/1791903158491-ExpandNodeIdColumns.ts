import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Widens the columns that store a workflow node id beyond `varchar(36)`.
 * Workflows created through the public API or source control can carry node
 * ids longer than a UUID, and Postgres rejected those writes, so publications
 * never completed. SQLite does not enforce varchar lengths, so it needs no change.
 *
 * The trigger status and poller state tables are keyed on the node id alone and
 * take `text`. `scheduled_job.ownerMemberId` matches `ownerId` at 255, the limit
 * the scheduler checks before it writes (`SCHEDULED_JOB_OWNER_MEMBER_ID_MAX_LENGTH`).
 *
 * Widening a varchar rewrites no table or index. Irreversible because narrowing
 * back would reject the longer ids.
 */
export class ExpandNodeIdColumns1791903158491 implements IrreversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const widen = async (table: string, column: string, type: string) =>
			await runQuery(
				`ALTER TABLE ${escape.tableName(table)} ALTER COLUMN ${escape.columnName(column)} TYPE ${type}`,
			);

		await widen('workflow_publication_trigger_status', 'nodeId', 'TEXT');
		await widen('poller_state', 'nodeId', 'TEXT');
		await widen('scheduled_job', 'ownerMemberId', 'VARCHAR(255)');
	}
}
