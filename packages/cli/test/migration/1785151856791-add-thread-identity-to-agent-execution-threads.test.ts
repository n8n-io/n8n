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

const MIGRATION_NAME = 'AddThreadIdentityToAgentExecutionThreads1785151856791';

type IdentityRow = {
	origin: string | null;
	originRef: string;
	externalKey: string | null;
	createdByResourceId: string | null;
};

describe('AddThreadIdentityToAgentExecutionThreads Migration', () => {
	let dataSource: DataSource;
	const agentId = randomUUID();
	const projectId = randomUUID();

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => {
			await context.queryRunner.clearDatabase();
		});
		await initDbUpToMigration(MIGRATION_NAME);
		await withContext(async (context) => {
			await insertProject(context);
			await insertAgent(context);
		});
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertProject(context: TestMigrationContext): Promise<void> {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :now, :now)`,
			{ id: projectId, name: 'test-project', type: 'personal', now: new Date() },
		);
	}

	async function insertAgent(context: TestMigrationContext): Promise<void> {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents')}
			   ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
			 VALUES (:id, :name, :projectId, '[]', '{}', '{}', :now, :now)`,
			{ id: agentId, name: 'Test Agent', projectId, now: new Date() },
		);
	}

	async function insertThread(
		context: TestMigrationContext,
		id: string,
		options: { parentThreadId?: string } = {},
	): Promise<void> {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_execution_threads')}
			   ("id", "agentId", "agentName", "projectId", "parentThreadId", "sessionNumber", "createdAt", "updatedAt")
			 VALUES (:id, :agentId, :agentName, :projectId, :parentThreadId, 1, :now, :now)`,
			{
				id,
				agentId,
				agentName: 'Test Agent',
				projectId,
				parentThreadId: options.parentThreadId ?? null,
				now: new Date(),
			},
		);
	}

	async function insertMessage(
		context: TestMigrationContext,
		threadId: string,
		resourceId: string,
		createdAt: Date,
	): Promise<void> {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents_threads')} ("id", "resourceId", "createdAt", "updatedAt")
			 VALUES (:threadId, :resourceId, :createdAt, :createdAt)
			 ON CONFLICT ("id") DO NOTHING`,
			{ threadId, resourceId, createdAt },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents_messages')}
			   ("id", "threadId", "resourceId", "role", "content", "createdAt", "updatedAt")
			 VALUES (:id, :threadId, :resourceId, 'user', :content, :createdAt, :createdAt)`,
			{ id: randomUUID(), threadId, resourceId, content: '{}', createdAt },
		);
	}

	async function getIdentity(
		context: TestMigrationContext,
		threadId: string,
	): Promise<IdentityRow> {
		const rows = await context.runQuery<IdentityRow[]>(
			`SELECT "origin", "originRef", "externalKey", "createdByResourceId"
			 FROM ${context.escape.tableName('agent_execution_threads')} WHERE "id" = :id`,
			{ id: threadId },
		);
		return rows[0];
	}

	describe('up', () => {
		it('derives origin and external key from each legacy thread id shape', async () => {
			const chatId = randomUUID();
			const subAgentId = randomUUID();
			const parentId = randomUUID();
			const taskId = `task-${randomUUID()}-${randomUUID()}`;
			const testId = `test-${agentId}:${randomUUID()}`;
			const slackId = `${agentId}:slack:C123:1727000000.001`;
			const workflowId = 'wf:wkfl-1:session:with:colons';

			await withContext(async (context) => {
				await insertThread(context, parentId);
				await insertThread(context, chatId);
				await insertThread(context, subAgentId, { parentThreadId: parentId });
				await insertThread(context, taskId);
				await insertThread(context, testId);
				await insertThread(context, slackId);
				await insertThread(context, workflowId);
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				expect(await getIdentity(context, chatId)).toMatchObject({
					origin: 'chat',
					originRef: '',
					externalKey: null,
				});
				expect(await getIdentity(context, subAgentId)).toMatchObject({ origin: 'subagent' });
				expect(await getIdentity(context, taskId)).toMatchObject({
					origin: 'task',
					externalKey: null,
				});
				expect(await getIdentity(context, testId)).toMatchObject({ origin: 'test' });
				expect(await getIdentity(context, slackId)).toMatchObject({
					origin: 'integration',
					originRef: '',
					externalKey: 'slack:C123:1727000000.001',
				});
				expect(await getIdentity(context, workflowId)).toMatchObject({
					origin: 'workflow',
					originRef: 'wkfl-1',
					externalKey: 'session:with:colons',
				});
			});
		});

		it('leaves a workflow thread without a session segment out of the lookup index', async () => {
			const malformedId = 'wf:wkfl-1';

			await withContext(async (context) => await insertThread(context, malformedId));

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				expect(await getIdentity(context, malformedId)).toMatchObject({
					origin: 'workflow',
					externalKey: null,
				});
			});
		});

		it('attributes a thread to the resourceId of its earliest message', async () => {
			const sharedId = randomUUID();
			const unusedId = randomUUID();

			await withContext(async (context) => {
				await insertThread(context, sharedId);
				await insertThread(context, unusedId);
				await insertMessage(
					context,
					sharedId,
					'integration:slack:U-second',
					new Date('2026-02-01'),
				);
				await insertMessage(context, sharedId, 'integration:slack:U-first', new Date('2026-01-01'));
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				expect((await getIdentity(context, sharedId)).createdByResourceId).toBe(
					'integration:slack:U-first',
				);
				expect((await getIdentity(context, unusedId)).createdByResourceId).toBeNull();
			});
		});

		it('enforces uniqueness per external key while allowing many keyless sessions', async () => {
			await withContext(async (context) => await insertThread(context, randomUUID()));

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const insertResolved = async (id: string, externalKey: string | null) =>
					await context.runQuery(
						`INSERT INTO ${context.escape.tableName('agent_execution_threads')}
						   ("id", "agentId", "agentName", "projectId", "origin", "originRef", "externalKey", "sessionNumber", "createdAt", "updatedAt")
						 VALUES (:id, :agentId, 'Test Agent', :projectId, 'integration', '', :externalKey, 1, :now, :now)`,
						{ id, agentId, projectId, externalKey, now: new Date() },
					);

				await insertResolved(randomUUID(), 'slack:C1:1');
				await expect(insertResolved(randomUUID(), 'slack:C1:1')).rejects.toThrow();

				await insertResolved(randomUUID(), null);
				await expect(insertResolved(randomUUID(), null)).resolves.not.toThrow();
			});
		});

		it('keeps execution rows belonging to the migrated threads', async () => {
			const threadId = randomUUID();
			const executionId = randomUUID();

			await withContext(async (context) => {
				await insertThread(context, threadId);
				await context.runQuery(
					`INSERT INTO ${context.escape.tableName('agent_execution')}
					   ("id", "threadId", "status", "createdAt", "updatedAt")
					 VALUES (:id, :threadId, 'success', :now, :now)`,
					{ id: executionId, threadId, now: new Date() },
				);
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const rows = await context.runQuery<Array<{ id: string }>>(
					`SELECT "id" FROM ${context.escape.tableName('agent_execution')} WHERE "id" = :id`,
					{ id: executionId },
				);
				expect(rows).toHaveLength(1);
			});
		});
	});

	describe('down', () => {
		it('removes the identity columns while keeping the thread row', async () => {
			const threadId = randomUUID();

			await withContext(async (context) => await insertThread(context, threadId));

			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const table = await context.queryRunner.getTable(
					`${context.tablePrefix}agent_execution_threads`,
				);
				const columnNames = (table?.columns ?? []).map((column) => column.name);
				expect(columnNames).not.toContain('origin');
				expect(columnNames).not.toContain('createdByResourceId');

				const rows = await context.runQuery<Array<{ id: string }>>(
					`SELECT "id" FROM ${context.escape.tableName('agent_execution_threads')} WHERE "id" = :id`,
					{ id: threadId },
				);
				expect(rows).toHaveLength(1);
			});
		});
	});
});
