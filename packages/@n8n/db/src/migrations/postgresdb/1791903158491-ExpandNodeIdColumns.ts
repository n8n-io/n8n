import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Widens the columns that store a workflow node id from `varchar(36)` to
 * `varchar(64)`, the node id limit that workflow validation enforces
 * (`NODE_ID_MAX_LENGTH`). Workflows created through the public API or source
 * control can carry node ids longer than a UUID, and Postgres rejected those
 * writes, so publications never completed. SQLite does not enforce varchar
 * lengths, so it needs no change.
 *
 * Widening a varchar rewrites no table or index. Irreversible because narrowing
 * back would reject the longer ids.
 */
export class ExpandNodeIdColumns1791903158491 implements IrreversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const widen = async (table: string, column: string) =>
			await runQuery(
				`ALTER TABLE ${escape.tableName(table)} ALTER COLUMN ${escape.columnName(column)} TYPE VARCHAR(64)`,
			);

		await widen('workflow_publication_trigger_status', 'nodeId');
		await widen('poller_state', 'nodeId');
		await widen('scheduled_job', 'ownerMemberId');
	}
}
