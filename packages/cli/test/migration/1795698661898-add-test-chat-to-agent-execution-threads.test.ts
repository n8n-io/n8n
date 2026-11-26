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
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddTestChatToAgentExecutionThreads1795698661898';

describe('AddTestChatToAgentExecutionThreads migration', () => {
	let projectId: string;
	let agentId: string;
	let threadId: string;
	let executionId: string;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insert(
		context: TestMigrationContext,
		table: string,
		values: Record<string, string>,
	) {
		const columns = Object.keys(values);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(table)}
			 (${columns.map(context.escape.columnName).join(', ')})
			 VALUES (${columns.map((name) => `:${name}`).join(', ')})`,
			values,
		);
	}

	async function insertThread(context: TestMigrationContext, id: string) {
		await insert(context, 'agent_execution_threads', {
			id,
			projectId,
			agentId,
			agentName: 'Test chat agent',
		});
	}

	async function readRows(table: string) {
		return await withContext(
			async ({ escape, runQuery }) =>
				await runQuery<Record<string, unknown>[]>(
					`SELECT * FROM ${escape.tableName(table)} ORDER BY ${escape.columnName('id')}`,
				),
		);
	}

	async function isTestChatColumn() {
		return await withContext(async ({ queryRunner, tablePrefix }) =>
			(await queryRunner.getTable(`${tablePrefix}agent_execution_threads`))?.findColumnByName(
				'isTestChat',
			),
		);
	}

	beforeAll(async () => await Container.get(DbConnection).init());

	beforeEach(async () => {
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);

		projectId = randomUUID();
		agentId = randomUUID();
		threadId = randomUUID();
		executionId = randomUUID();
		const identityId = randomUUID();
		await withContext(async (context) => {
			await insert(context, 'user', { id: identityId, kind: 'service', roleSlug: 'global:agent' });
			await insert(context, 'project', { id: projectId, name: 'Test chat project', type: 'team' });
			await insert(context, 'agents', {
				id: agentId,
				projectId,
				identityId,
				name: 'Test chat agent',
				integrations: '[]',
				tools: '{}',
				skills: '{}',
			});
			await insertThread(context, threadId);
			await insert(context, 'agent_execution', { id: executionId, threadId, status: 'success' });
		});
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('adds a required column that is false for existing and new chats', async () => {
		await runSingleMigration(MIGRATION_NAME);

		const column = await isTestChatColumn();
		expect(column).toMatchObject({ type: 'boolean', isNullable: false });
		// SQLite has no column comments.
		if (await withContext(async ({ isPostgres }) => isPostgres)) {
			expect(column?.comment).toContain('True for a test chat');
		}

		const newThreadId = randomUUID();
		await withContext(async (context) => await insertThread(context, newThreadId));
		const threads = await readRows('agent_execution_threads');
		expect(threads.map((thread) => thread.id).sort()).toEqual([threadId, newThreadId].sort());
		// SQLite returns 0 and PostgreSQL returns false.
		expect(threads.map((thread) => Boolean(thread.isTestChat))).toEqual([false, false]);

		await withContext(async ({ escape, runQuery }) => {
			await expect(
				runQuery(
					`UPDATE ${escape.tableName('agent_execution_threads')} SET ${escape.columnName('isTestChat')} = NULL`,
				),
			).rejects.toThrow();
		});
	});

	it('keeps chats and their execution records when it adds the column', async () => {
		const threads = await readRows('agent_execution_threads');
		const executions = await readRows('agent_execution');

		await runSingleMigration(MIGRATION_NAME);

		expect(await readRows('agent_execution_threads')).toEqual(
			threads.map((thread) => ({ ...thread, isTestChat: expect.anything() })),
		);
		expect(await readRows('agent_execution')).toEqual(executions);
	});

	it('removes the column on revert and keeps chats and their execution records', async () => {
		const threads = await readRows('agent_execution_threads');
		const executions = await readRows('agent_execution');
		await runSingleMigration(MIGRATION_NAME);
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`UPDATE ${escape.tableName('agent_execution_threads')} SET ${escape.columnName('isTestChat')} = true`,
			);
		});

		await undoLastSingleMigration();

		expect(await isTestChatColumn()).toBeUndefined();
		expect(await readRows('agent_execution_threads')).toEqual(threads);
		expect(await readRows('agent_execution')).toEqual(executions);
	});

	it('applies again after a revert, with every chat back to false', async () => {
		const executions = await readRows('agent_execution');
		await runSingleMigration(MIGRATION_NAME);
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`UPDATE ${escape.tableName('agent_execution_threads')} SET ${escape.columnName('isTestChat')} = true`,
			);
		});
		await undoLastSingleMigration();

		await runSingleMigration(MIGRATION_NAME);

		expect(await isTestChatColumn()).toMatchObject({ type: 'boolean', isNullable: false });
		const threads = await readRows('agent_execution_threads');
		expect(threads.map((thread) => [thread.id, Boolean(thread.isTestChat)])).toEqual([
			[threadId, false],
		]);
		expect(await readRows('agent_execution')).toEqual(executions);
	});
});
