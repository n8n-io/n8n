import type { MigrationContext, ReversibleMigration } from '../migration-types';

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
 * Nine of the ten columns are held to their new width by a foreign key, so no
 * value can be too long. `agent_chat_subscriptions.credentialId` is the
 * exception — deliberately no foreign key, so a subscription stays recordable
 * after its credential is deleted — and its value reaches us through an agent
 * config field that zod bounds only with `min(1)`. In practice the integration
 * refuses to start unless the id resolves to a real credential, but nothing in
 * the database enforces that, so every column is measured before it is narrowed
 * and one that would truncate is left at its old width with a warning. This
 * migration is cosmetic; it must never be the reason an instance fails to boot.
 *
 * On Postgres each step rewrites the table and holds an exclusive lock for the
 * length of the rewrite.
 */
interface WidthChange {
	table: string;
	column: string;
	from: number;
	to: number;
}

const COLUMNS: WidthChange[] = [
	// Hold a `project.id`.
	{ table: 'agents', column: 'projectId', from: 255, to: 36 },
	{ table: 'agent_execution_threads', column: 'projectId', from: 255, to: 36 },
	// Holds an `agents.id`.
	{ table: 'agent_checkpoints', column: 'agentId', from: 255, to: 36 },
	// Holds a `credentials_entity.id`. The one column here without a foreign key.
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

const reverse = (changes: WidthChange[]): WidthChange[] =>
	changes.map(({ table, column, from, to }) => ({ table, column, from: to, to: from }));

/**
 * Drops any change whose column already holds a value longer than the width it
 * would move to. Only narrowing can trip this, so widening skips the scan.
 */
async function applicable(
	{ runQuery, escape, logger, migrationName }: MigrationContext,
	changes: WidthChange[],
): Promise<WidthChange[]> {
	const keep: WidthChange[] = [];

	for (const change of changes) {
		const { table, column, from, to } = change;
		if (to >= from) {
			keep.push(change);
			continue;
		}

		const rows = await runQuery<Array<{ longest: number | null }>>(
			`SELECT MAX(LENGTH(${escape.columnName(column)})) AS longest FROM ${escape.tableName(table)};`,
		);
		const longest = Number(rows[0]?.longest ?? 0);

		if (longest > to) {
			logger.warn(
				`[${migrationName}] Leaving ${table}.${column} at varchar(${from}): it holds a value of ${longest} characters, which varchar(${to}) cannot store. Shorten or remove those rows and this column is aligned by the next release.`,
			);
			continue;
		}

		keep.push(change);
	}

	return keep;
}

async function setWidths(context: MigrationContext, changes: WidthChange[]): Promise<void> {
	const { isPostgres, isSqlite, runQuery, escape, tablePrefix } = context;
	const applied = await applicable(context, changes);

	if (isPostgres) {
		for (const { table, column, to } of applied) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(table)} ALTER COLUMN ${escape.columnName(column)} TYPE VARCHAR(${to});`,
			);
		}
		return;
	}

	if (!isSqlite) return;

	// SQLite does not enforce varchar limits, so only the declared schema needs
	// to change. Rewriting it in place avoids recreating tables that other agent
	// tables reference with ON DELETE CASCADE.
	await runQuery('PRAGMA writable_schema = 1;');
	try {
		for (const { table, column, from, to } of applied) {
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

export class AlignAgentIdColumnWidths1788853123113 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await setWidths(context, COLUMNS);
	}

	/** Widening back is lossless, so the narrowing is fully reversible. */
	async down(context: MigrationContext) {
		await setWidths(context, reverse(COLUMNS));
	}
}
