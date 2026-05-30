import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Sub-agent runs share one composite thread id (e.g.
 * `subagent:<parentThreadId>:root:<task>_<n>`) across the SDK memory thread
 * (`agents_threads`) and the session records (`agent_execution_threads`,
 * `agent_execution.threadId`). That value is longer than the original
 * `varchar(36)`, so widen the id columns to `varchar(255)`.
 *
 * SQLite does not enforce a `VARCHAR` length, so the longer ids already fit
 * there and only Postgres needs altering.
 */
const COLUMNS_TO_WIDEN: Array<{ table: string; column: string }> = [
	{ table: 'agents_threads', column: 'id' },
	{ table: 'agent_execution_threads', column: 'id' },
	{ table: 'agent_execution', column: 'threadId' },
];

export class WidenAgentThreadIdColumns1784000000019 implements IrreversibleMigration {
	async up({ isPostgres, runQuery, escape }: MigrationContext) {
		if (!isPostgres) return;

		for (const { table, column } of COLUMNS_TO_WIDEN) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(table)} ALTER COLUMN ${escape.columnName(column)} TYPE VARCHAR(255);`,
			);
		}
	}
}
