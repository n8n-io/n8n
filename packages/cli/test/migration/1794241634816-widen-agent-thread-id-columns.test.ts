import { encodeThreadId } from '@chat-adapter/teams';
import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'WidenAgentThreadIdColumns1794241634816';
const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';

const COLUMNS = [
	['agents_threads', 'id', 128],
	['agent_execution_threads', 'id', 128],
	['agent_execution_threads', 'parentThreadId', 128],
	['agent_execution', 'threadId', 128],
	['agent_message_queue', 'threadId', 128],
	['agent_plan', 'threadId', 128],
	['agent_background_job', 'parentThreadId', 128],
	['agent_background_job', 'childThreadId', 128],
	['agent_chat_attachments', 'threadId', 128],
	['agent_chat_attachments', 'createdByThreadId', 128],
	['agent_thread_grants', 'threadId', 128],
	['agent_file_grants', 'threadId', 128],
	['agent_budget_spend', 'key', 128],
	['agents_messages', 'threadId', 255],
	['agents_memory_entry_sources', 'threadId', 255],
	['agents_memory_entry_candidates', 'threadId', 255],
	['agents_observations', 'observationScopeId', 255],
	['agents_observation_cursors', 'observationScopeId', 255],
	['agents_observation_locks', 'observationScopeId', 255],
	['agent_chat_subscriptions', 'threadId', 255],
] as const;

// A Teams DM in a regional (Australia) tenant, as the Teams adapter encodes it.
const teamsThreadId = encodeThreadId({
	conversationId:
		'a:1Xt9TpfmYq2Lr0kZbN4cVwHs8eUjG7dOaFyM3iRnK6lQxB5gS1vPzWuCo-_h2JmE4tYrIwNqLdKfXsA9bVc0ZeH7pUgO3yTlMnRj8kQsDiF6aWxC1oPvEb5uLhG2zNtJmY4rKcSfqBd',
	serviceUrl: 'https://smba.trafficmanager.net/au/72f988bf-86f1-41af-91ab-2d7cd011db47/',
});
const agentThreadId = `0b6f3c52-8d1e-4a7b-9c2f-1e5d7a9b3c4d:${teamsThreadId}#12`;

describe('WidenAgentThreadIdColumns migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterEach(async () => {
		await Container.get(DbConnection).close();
	});

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertThreadWithMessage(threadId: string) {
		const resourceId = 'integration:teams:29:1abc';
		await withContext(async ({ runQuery, escape }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('agents_threads')} ("id", "resourceId") VALUES (:threadId, :resourceId)`,
				{ threadId, resourceId },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents_messages')} ("id", "threadId", "resourceId", "role", "content")
				 VALUES ('m-1', :threadId, :resourceId, 'user', '[]')`,
				{ threadId, resourceId },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_budget_spend')} ("key", "totalUsd") VALUES (:threadId, 1)`,
				{ threadId },
			);
		});
	}

	async function readDeclaredTypes(): Promise<string[]> {
		return await withContext(async ({ runQuery, escape, tablePrefix }) => {
			const types: string[] = [];
			for (const [table, column] of COLUMNS) {
				const [{ type }] = isSqlite
					? await runQuery<Array<{ type: string }>>(
							`SELECT type FROM pragma_table_info('${tablePrefix}${table}') WHERE name = :column`,
							{ column },
						)
					: await runQuery<Array<{ type: string }>>(
							`SELECT format_type(atttypid, atttypmod) AS "type" FROM pg_attribute
							 WHERE attrelid = to_regclass(:table) AND attname = :column`,
							{ table: escape.tableName(table), column },
						);
				types.push(type.toLowerCase().replace('character varying', 'varchar'));
			}
			return types;
		});
	}

	it('uses a realistic regional Teams DM id that the old widths reject', () => {
		expect(agentThreadId.length).toBeGreaterThan(255);
	});

	it('widens every agent thread id column to 1024 characters', async () => {
		await runSingleMigration(MIGRATION_NAME);

		expect(await readDeclaredTypes()).toEqual(COLUMNS.map(() => 'varchar(1024)'));
	});

	it.skipIf(isSqlite)('stores a regional Teams DM thread id', async () => {
		await expect(insertThreadWithMessage(agentThreadId)).rejects.toThrow(
			'value too long for type character varying(128)',
		);

		await runSingleMigration(MIGRATION_NAME);
		await insertThreadWithMessage(agentThreadId);

		const rows = await withContext(
			async ({ runQuery, escape }) =>
				await runQuery<Array<{ threadId: string }>>(
					`SELECT "threadId" FROM ${escape.tableName('agents_messages')}`,
				),
		);
		expect(rows).toEqual([{ threadId: agentThreadId }]);
	});

	describe('down', () => {
		it('restores the previous widths', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			expect(await readDeclaredTypes()).toEqual(COLUMNS.map(([, , from]) => `varchar(${from})`));
		});

		it.skipIf(isSqlite)(
			'refuses to narrow, and changes nothing, when a column holds a longer id',
			async () => {
				await runSingleMigration(MIGRATION_NAME);
				await insertThreadWithMessage(agentThreadId);

				await expect(undoLastSingleMigration()).rejects.toThrow(
					'Cannot narrow the agent thread id columns, because these columns hold longer ids: agents_threads.id (1 rows longer than 128), agent_budget_spend.key (1 rows longer than 128), agents_messages.threadId (1 rows longer than 255).',
				);
				expect(await readDeclaredTypes()).toEqual(COLUMNS.map(() => 'varchar(1024)'));
			},
		);
	});
});
