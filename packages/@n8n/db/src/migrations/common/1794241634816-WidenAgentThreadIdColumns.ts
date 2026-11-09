import { UserError } from 'n8n-workflow';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const WIDTH = 1024;

/** Every column that stores an agent thread or resource id, with its width before this migration. */
const COLUMNS: Array<{ table: string; column: string; from: 128 | 255 }> = [
	{ table: 'agents_threads', column: 'id', from: 128 },
	{ table: 'agent_execution_threads', column: 'id', from: 128 },
	{ table: 'agent_execution_threads', column: 'parentThreadId', from: 128 },
	{ table: 'agent_execution', column: 'threadId', from: 128 },
	{ table: 'agent_message_queue', column: 'threadId', from: 128 },
	{ table: 'agent_plan', column: 'threadId', from: 128 },
	{ table: 'agent_background_job', column: 'parentThreadId', from: 128 },
	{ table: 'agent_background_job', column: 'childThreadId', from: 128 },
	{ table: 'agent_chat_attachments', column: 'threadId', from: 128 },
	{ table: 'agent_chat_attachments', column: 'createdByThreadId', from: 128 },
	{ table: 'agent_thread_grants', column: 'threadId', from: 128 },
	{ table: 'agent_file_grants', column: 'threadId', from: 128 },
	// The session ledger key is the root thread id.
	{ table: 'agent_budget_spend', column: 'key', from: 128 },
	{ table: 'agents_messages', column: 'threadId', from: 255 },
	{ table: 'agents_memory_entry_sources', column: 'threadId', from: 255 },
	{ table: 'agents_memory_entry_candidates', column: 'threadId', from: 255 },
	{ table: 'agents_observations', column: 'observationScopeId', from: 255 },
	{ table: 'agents_observation_cursors', column: 'observationScopeId', from: 255 },
	{ table: 'agents_observation_locks', column: 'observationScopeId', from: 255 },
	// Holds the platform thread id without the agent prefix.
	{ table: 'agent_chat_subscriptions', column: 'threadId', from: 255 },
	// Workflow runs and message context bindings use a thread id as the resource id.
	{ table: 'agents_resources', column: 'id', from: 255 },
	{ table: 'agents_threads', column: 'resourceId', from: 255 },
	{ table: 'agents_messages', column: 'resourceId', from: 255 },
	{ table: 'agents_memory_entries', column: 'resourceId', from: 255 },
	{ table: 'agents_memory_entry_candidates', column: 'resourceId', from: 255 },
	{ table: 'agents_memory_entry_locks', column: 'resourceId', from: 255 },
	{ table: 'agent_chat_attachments', column: 'resourceId', from: 255 },
	{ table: 'agent_background_job', column: 'parentResourceId', from: 255 },
];

/**
 * Widens the agent thread and resource id columns to varchar(1024). A chat thread id is
 * `<agentId>:<platform thread id>`, and some platforms make long ids: a
 * Microsoft Teams DM in a regional tenant is about 330 characters, because the
 * Teams id encodes the conversation id and the service URL in base64. Postgres
 * rejected those writes. SQLite does not enforce varchar lengths, so it only
 * gets the declared type updated.
 *
 * Widening a varchar on Postgres changes only the catalog: no table rewrite and
 * no index rebuild. Narrowing back stops before any change when a stored id
 * does not fit, because cutting an id would break the rows keyed on it.
 */
export class WidenAgentThreadIdColumns1794241634816 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await setWidths(
			context,
			COLUMNS.map(({ table, column, from }) => ({ table, column, from, to: WIDTH })),
		);
	}

	async down(context: MigrationContext) {
		if (context.isPostgres) await requireIdsThatFit(context);
		await setWidths(
			context,
			COLUMNS.map(({ table, column, from }) => ({ table, column, from: WIDTH, to: from })),
		);
	}
}

async function setWidths(
	{ isPostgres, isSqlite, runQuery, escape, tablePrefix }: MigrationContext,
	changes: Array<{ table: string; column: string; from: number; to: number }>,
) {
	if (isPostgres) {
		for (const { table, column, to } of changes) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(table)} ALTER COLUMN ${escape.columnName(column)} TYPE VARCHAR(${to});`,
			);
		}
	} else if (isSqlite) {
		// Rewrite the declared type in place. Recreating these tables would cascade
		// through the foreign keys that point at them.
		await runQuery('PRAGMA writable_schema = 1;');
		try {
			for (const { table, column, from, to } of changes) {
				await runQuery(
					"UPDATE sqlite_master SET sql = replace(sql, :from, :to) WHERE type = 'table' AND name = :tableName",
					{
						from: `"${column}" varchar(${from})`,
						to: `"${column}" varchar(${to})`,
						tableName: `${tablePrefix}${table}`,
					},
				);
			}
			// Bump the schema version so open connections reload the declarations.
			const [{ schema_version: version }] =
				await runQuery<Array<{ schema_version: number }>>('PRAGMA schema_version;');
			await runQuery(`PRAGMA schema_version = ${version + 1};`);
		} finally {
			await runQuery('PRAGMA writable_schema = 0;');
		}
	}
}

async function requireIdsThatFit({ escape, runQuery }: MigrationContext) {
	const tooLong: string[] = [];
	for (const { table, column, from } of COLUMNS) {
		const [{ count }] = await runQuery<Array<{ count: string }>>(
			`SELECT COUNT(*) AS "count" FROM ${escape.tableName(table)} WHERE LENGTH(${escape.columnName(column)}) > ${from}`,
		);
		if (Number(count) > 0) tooLong.push(`${table}.${column} (${count} rows longer than ${from})`);
	}

	if (tooLong.length > 0) {
		throw new UserError(
			`Cannot narrow the agent thread and resource id columns, because these columns hold longer ids: ${tooLong.join(', ')}. Delete these rows, then revert again.`,
		);
	}
}
