import type { MigrationContext, ReversibleMigration } from '../migration-types';

const nodeIdColumns = [
	{ table: 'workflow_publication_trigger_status', column: 'nodeId' },
	{ table: 'poller_state', column: 'nodeId' },
	{ table: 'scheduled_job', column: 'ownerMemberId' },
] as const;

/**
 * Widens the columns that store a workflow node id from `varchar(36)` to
 * `varchar(64)`, the node id limit that workflow validation enforces
 * (`NODE_ID_MAX_LENGTH`). Workflows created through the public API or source
 * control can carry node ids longer than a UUID, and Postgres rejected those
 * writes, so publications never completed. SQLite does not enforce varchar
 * lengths, so it needs no change.
 *
 * Widening a varchar rewrites no table or index. Narrowing back does, and it
 * stops before any change when a stored id is longer than 36 characters,
 * because cutting an id would break the rows that are keyed on it.
 */
export class ExpandNodeIdColumns1792738285739 implements ReversibleMigration {
	async up(context: MigrationContext) {
		for (const { table, column } of nodeIdColumns) {
			await this.setLength(context, table, column, 64);
		}
	}

	async down(context: MigrationContext) {
		await this.requireIdsOfUuidLength(context);
		for (const { table, column } of nodeIdColumns) {
			await this.setLength(context, table, column, 36);
		}
	}

	private async setLength(
		{ escape, runQuery }: MigrationContext,
		table: string,
		column: string,
		length: 36 | 64,
	) {
		await runQuery(
			`ALTER TABLE ${escape.tableName(table)} ALTER COLUMN ${escape.columnName(column)} TYPE VARCHAR(${length})`,
		);
	}

	private async requireIdsOfUuidLength({ escape, runQuery }: MigrationContext) {
		const tooLong: string[] = [];
		for (const { table, column } of nodeIdColumns) {
			const [{ count }] = await runQuery<Array<{ count: string }>>(
				`SELECT COUNT(*) AS "count" FROM ${escape.tableName(table)} WHERE LENGTH(${escape.columnName(column)}) > 36`,
			);
			if (Number(count) > 0) tooLong.push(`${table}.${column} (${count} rows)`);
		}

		if (tooLong.length > 0) {
			throw new Error(
				`Cannot narrow node id columns to 36 characters, because these columns hold longer ids: ${tooLong.join(', ')}. Delete or shorten these rows, then revert again.`,
			);
		}
	}
}
