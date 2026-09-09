import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Narrows the agent id columns that were declared wider than the id column they
 * take their value from, so a declared width means something again.
 *
 * Reference widths: `agents.id`, `project.id` and `credentials_entity.id` are
 * varchar(36) — the width `folder.projectId`, `shared_workflow.projectId` and
 * `instance_credential_assignment.credentialId` already use. Agent thread ids
 * are varchar(128) since `AddSubAgentLinkageToAgentExecutionThreads`, because
 * some surfaces prefix them (`test-<agentId>:<userId>`).
 *
 * Nothing was declared narrower than its source, so there is no truncation to
 * repair and no bug behind this. What it fixes is the schema disagreeing with
 * itself: `projectId` was varchar(36) in `agent_chat_attachments` but
 * varchar(255) in two other tables, and the next agent table copies whichever
 * neighbour its author happens to read.
 *
 * `observationScopeId` is included despite reading like a free-form scope: it
 * carries a foreign key to `agents_threads.id` and `RefactorAgentObservationScope`
 * describes it as "agents_threads.id source stream", so it is a thread id under
 * a name that hides it.
 *
 * Out of scope, because they do not hold one of our own ids:
 * `agent_checkpoints.runId` (LangGraph run id), `*.resourceId` and
 * `agents_resources.id` (platform user ids) and `agent_chat_subscriptions.threadId`
 * (a platform thread id, where varchar(255) is right — and probably where the
 * `credentialId` beside it got its width).
 *
 * On Postgres each step rewrites the table, so it holds an exclusive lock for
 * the length of the rewrite. Every narrowed column is fed from a column already
 * at or below its new width, so no value can be too long.
 */
const COLUMNS: Array<{ table: string; column: string; from: number; to: number }> = [
	// Hold a `project.id`.
	{ table: 'agents', column: 'projectId', from: 255, to: 36 },
	{ table: 'agent_execution_threads', column: 'projectId', from: 255, to: 36 },
	// Holds an `agents.id`.
	{ table: 'agent_checkpoints', column: 'agentId', from: 255, to: 36 },
	// Holds a `credentials_entity.id`.
	{ table: 'agent_chat_subscriptions', column: 'credentialId', from: 255, to: 36 },
	// Hold an `agents_threads.id`.
	{ table: 'agents_messages', column: 'threadId', from: 255, to: 128 },
	{ table: 'agents_memory_entry_sources', column: 'threadId', from: 255, to: 128 },
	// Also hold an `agents_threads.id`, under a name that hides it.
	{ table: 'agents_observations', column: 'observationScopeId', from: 255, to: 128 },
	{ table: 'agents_observation_cursors', column: 'observationScopeId', from: 255, to: 128 },
	{ table: 'agents_observation_locks', column: 'observationScopeId', from: 255, to: 128 },
	{ table: 'agents_memory_entry_cursors', column: 'observationScopeId', from: 255, to: 128 },
];

export class AlignAgentIdColumnWidths1788853123113 implements IrreversibleMigration {
	async up({ isPostgres, isSqlite, runQuery, escape, tablePrefix }: MigrationContext) {
		if (isPostgres) {
			for (const { table, column, to } of COLUMNS) {
				await runQuery(
					`ALTER TABLE ${escape.tableName(table)} ALTER COLUMN ${escape.columnName(column)} TYPE VARCHAR(${to});`,
				);
			}
		} else if (isSqlite) {
			// SQLite does not enforce varchar limits, so only the declared schema
			// needs to change. Rewriting it in place avoids recreating tables that
			// other agent tables reference with ON DELETE CASCADE.
			await runQuery('PRAGMA writable_schema = 1;');
			try {
				for (const { table, column, from, to } of COLUMNS) {
					await runQuery(
						"UPDATE sqlite_master SET sql = replace(sql, :from, :to) WHERE type = 'table' AND name = :tableName",
						{
							from: `"${column}" varchar(${from})`,
							to: `"${column}" varchar(${to})`,
							tableName: `${tablePrefix}${table}`,
						},
					);
				}
			} finally {
				await runQuery('PRAGMA writable_schema = 0;');
			}
		}
	}
}
