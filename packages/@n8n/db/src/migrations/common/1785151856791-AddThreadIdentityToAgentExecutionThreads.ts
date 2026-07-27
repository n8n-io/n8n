import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'agent_execution_threads';

const NEW_COLUMNS = ['origin', 'originRef', 'externalKey', 'createdByResourceId'] as const;

const NATURAL_KEY = ['agentId', 'origin', 'originRef', 'externalKey'];

const COLUMN_COMMENTS: Array<[column: string, comment: string]> = [
	['origin', 'Surface that started the session: chat/integration/workflow/task/subagent/test'],
	['originRef', 'Namespace of externalKey (workflowId for workflow threads); empty when unscoped'],
	['externalKey', 'Thread key owned by the origin, e.g. a platform thread id or caller session id'],
	['createdByResourceId', 'Memory resourceId of the first writer, e.g. draft-chat:<userId>'],
];

type ThreadIdRow = { id: string };

/**
 * Moves thread identity out of the composed `id` string into columns.
 *
 * Thread ids used to encode their surface (`wf:<workflowId>:<sessionId>`,
 * `<agentId>:slack:<channel>:<ts>`, ...) so a continuation could re-derive the
 * id and look it up by primary key. Storing the parts instead lets new threads
 * use opaque uuids and turns continuation into a natural-key lookup. Existing
 * ids are left untouched — they are referenced by foreign keys and by the
 * execution-log blob keys — and are only parsed here, once, to populate the
 * new columns.
 */
export class AddThreadIdentityToAgentExecutionThreads1785151856791 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const {
			escape,
			runQuery,
			isPostgres,
			schemaBuilder: { createIndex },
		} = context;
		const table = escape.tableName(TABLE);

		// Raw ALTER TABLE rather than `addColumns`: on SQLite the DSL recreates the
		// table, and `agent_execution.threadId` references it ON DELETE CASCADE.
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('origin')} VARCHAR(32)`);
		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('originRef')} VARCHAR(255) NOT NULL DEFAULT ''`,
		);
		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('externalKey')} VARCHAR(255)`,
		);
		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${escape.columnName('createdByResourceId')} VARCHAR(255)`,
		);

		if (isPostgres) {
			for (const [columnName, comment] of COLUMN_COMMENTS) {
				await runQuery(
					`COMMENT ON COLUMN ${table}.${escape.columnName(columnName)} IS '${comment}'`,
				);
			}
		}

		await this.backfillWorkflowThreads(context);
		await this.backfillRemainingOrigins(context);
		await this.backfillCreatedByResourceId(context);

		// Partial: only rows carrying an external key are continued by lookup, and
		// every other origin mints a fresh uuid per session.
		await createIndex(
			TABLE,
			NATURAL_KEY,
			true,
			undefined,
			`${escape.columnName('externalKey')} IS NOT NULL`,
		);
	}

	async down({ escape, runQuery, schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex(TABLE, NATURAL_KEY, { skipIfMissing: true });

		const table = escape.tableName(TABLE);
		for (const columnName of NEW_COLUMNS) {
			await runQuery(`ALTER TABLE ${table} DROP COLUMN ${escape.columnName(columnName)}`);
		}
	}

	/**
	 * `wf:<workflowId>:<sessionId>` — the session id is caller-supplied and may
	 * itself contain colons, so the split happens here rather than in SQL (the
	 * substring-search builtins differ between Postgres and SQLite).
	 */
	private async backfillWorkflowThreads({
		escape,
		runQuery,
		runInBatches,
	}: MigrationContext): Promise<void> {
		const table = escape.tableName(TABLE);

		await runInBatches<ThreadIdRow>(
			`SELECT id FROM ${table} WHERE id LIKE 'wf:%' ORDER BY id`,
			async (rows) => {
				for (const { id } of rows) {
					const rest = id.slice('wf:'.length);
					const separator = rest.indexOf(':');
					const originRef = separator === -1 ? '' : rest.slice(0, separator);
					const externalKey = separator === -1 ? '' : rest.slice(separator + 1);

					await runQuery(
						`UPDATE ${table} SET ${escape.columnName('origin')} = 'workflow', ${escape.columnName('originRef')} = :originRef, ${escape.columnName('externalKey')} = :externalKey WHERE id = :id`,
						// A malformed id has no key to continue on; leave externalKey null
						// so it stays out of the unique index.
						{ originRef, externalKey: externalKey === '' ? null : externalKey, id },
					);
				}
			},
		);
	}

	private async backfillRemainingOrigins({ escape, runQuery }: MigrationContext): Promise<void> {
		const table = escape.tableName(TABLE);
		const origin = escape.columnName('origin');
		const agentId = escape.columnName('agentId');
		const unclassified = `${origin} IS NULL`;

		await runQuery(
			`UPDATE ${table} SET ${origin} = 'task' WHERE ${unclassified} AND id LIKE 'task-%'`,
		);
		await runQuery(
			`UPDATE ${table} SET ${origin} = 'test' WHERE ${unclassified} AND id LIKE 'test-%'`,
		);

		// Integration ids are `<agentId>:<platformThreadId>`; the agent id is a
		// uuid, so it carries no LIKE metacharacters.
		await runQuery(
			`UPDATE ${table} SET ${origin} = 'integration', ${escape.columnName('externalKey')} = SUBSTR(id, LENGTH(${agentId}) + 2) WHERE ${unclassified} AND id LIKE ${agentId} || ':%'`,
		);

		await runQuery(
			`UPDATE ${table} SET ${origin} = 'subagent' WHERE ${unclassified} AND ${escape.columnName('parentThreadId')} IS NOT NULL`,
		);
		await runQuery(`UPDATE ${table} SET ${origin} = 'chat' WHERE ${unclassified}`);
	}

	/** Earliest memory message wins; threads without memory rows stay null. */
	private async backfillCreatedByResourceId({ escape, runQuery }: MigrationContext): Promise<void> {
		const table = escape.tableName(TABLE);
		const messages = escape.tableName('agents_messages');
		const resourceId = escape.columnName('resourceId');
		const createdAt = escape.columnName('createdAt');

		await runQuery(
			`UPDATE ${table} SET ${escape.columnName('createdByResourceId')} = (
				SELECT m.${resourceId} FROM ${messages} m
				WHERE m.${escape.columnName('threadId')} = ${table}.id
				ORDER BY m.${createdAt} ASC, m.id ASC
				LIMIT 1
			)`,
		);
	}
}
