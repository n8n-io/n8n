import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Adds the sub-agent session-linkage columns to `agent_execution_threads`
 * (parentThreadId / parentAgentId) and widens the agent thread-id columns to
 * varchar(128).
 *
 * Agent thread ids are not bare uuids — several surfaces scope them with a
 * prefix and a user id (e.g. the test chat's `test-<agentId>:<userId>`, the
 * builder's `builder:<agentId>`). Those values exceed the original varchar(36)
 * of the SDK memory thread (`agents_threads.id`) and the session records
 * (`agent_execution_threads.id`, `agent_execution.threadId`), so widen those id
 * columns to varchar(128). `parentThreadId` holds such a parent thread id, so it
 * is created at varchar(128) directly. Known generated formats stay well below
 * 128 chars (for example, `test-<agentId>:<userId>` is about 78 chars with UUIDs).
 */
const COLUMNS_TO_WIDEN: Array<{ table: string; column: string }> = [
	{ table: 'agents_threads', column: 'id' },
	{ table: 'agent_execution_threads', column: 'id' },
	{ table: 'agent_execution', column: 'threadId' },
];

const SQLITE_DECLARED_TYPE_REPLACEMENTS: Array<{ table: string; from: string; to: string }> = [
	{ table: 'agents_threads', from: '"id" varchar(36)', to: '"id" varchar(128)' },
	{
		table: 'agent_execution_threads',
		from: '"id" varchar(36)',
		to: '"id" varchar(128)',
	},
	{
		table: 'agent_execution',
		from: '"threadId" varchar(36)',
		to: '"threadId" varchar(128)',
	},
];

export class AddSubAgentLinkageToAgentExecutionThreads1784000000022
	implements IrreversibleMigration
{
	async up({
		schemaBuilder: { addColumns, column },
		isPostgres,
		isSqlite,
		runQuery,
		escape,
		tablePrefix,
	}: MigrationContext) {
		await addColumns(
			'agent_execution_threads',
			[
				column('parentThreadId')
					.varchar(128)
					.comment('Parent session thread id that delegated this subagent run.'),
				column('parentAgentId')
					.varchar(36)
					.comment('Saved agent id of the parent that delegated this subagent run.'),
			],
			{ recreatesOnSqlite: true },
		);

		if (isPostgres) {
			for (const { table, column: columnName } of COLUMNS_TO_WIDEN) {
				await runQuery(
					`ALTER TABLE ${escape.tableName(table)} ALTER COLUMN ${escape.columnName(columnName)} TYPE VARCHAR(128);`,
				);
			}
		} else if (isSqlite) {
			// SQLite does not enforce varchar limits, but keep the declared schema in sync for documentation.
			await this.widenSqliteDeclaredColumnTypes({ runQuery, tablePrefix });
		}
	}

	private async widenSqliteDeclaredColumnTypes({
		runQuery,
		tablePrefix,
	}: Pick<MigrationContext, 'runQuery' | 'tablePrefix'>) {
		await runQuery('PRAGMA writable_schema = 1;');

		try {
			for (const { table, from, to } of SQLITE_DECLARED_TYPE_REPLACEMENTS) {
				await runQuery(
					"UPDATE sqlite_master SET sql = replace(sql, :from, :to) WHERE type = 'table' AND name = :tableName",
					{ from, to, tableName: `${tablePrefix}${table}` },
				);
			}
		} finally {
			await runQuery('PRAGMA writable_schema = 0;');
		}
	}
}
