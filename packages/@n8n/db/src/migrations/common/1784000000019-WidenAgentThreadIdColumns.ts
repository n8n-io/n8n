import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Agent thread ids are not bare uuids — several surfaces scope them with a
 * prefix and a user id (e.g. the test chat's `test-<agentId>:<userId>`, the
 * builder's `builder:<agentId>`). Those values exceed the original
 * `varchar(36)` of the SDK memory thread (`agents_threads.id`) and the session
 * records (`agent_execution_threads.id`, `agent_execution.threadId`), so widen
 * those id columns — plus `agent_execution_threads.parentThreadId`, which holds
 * such a parent thread id — to `varchar(255)`.
 *
 * SQLite does not enforce a `VARCHAR` length, so the longer ids already fit
 * there and only Postgres needs altering.
 */
const COLUMNS_TO_WIDEN: Array<{ table: string; column: string }> = [
	{ table: 'agents_threads', column: 'id' },
	{ table: 'agent_execution_threads', column: 'id' },
	{ table: 'agent_execution', column: 'threadId' },
	{ table: 'agent_execution_threads', column: 'parentThreadId' },
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
