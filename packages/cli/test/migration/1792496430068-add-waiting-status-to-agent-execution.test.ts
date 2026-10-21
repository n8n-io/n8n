import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddWaitingStatusToAgentExecution1792496430068';

describe('AddWaitingStatusToAgentExecution migration', () => {
	let dataSource: DataSource;
	const projectId = randomUUID();
	const agentId = randomUUID();
	const threadId = randomUUID();
	const executionId = randomUUID();
	const messageId = randomUUID();

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const ctx = createTestMigrationContext(dataSource);
		await ctx.queryRunner.clearDatabase();
		await ctx.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
		const seed = createTestMigrationContext(dataSource);
		const values = { projectId, agentId, threadId, executionId, messageId, now: new Date() };
		try {
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt") VALUES (:projectId, 'Project', 'team', :now, :now)`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills") VALUES (:agentId, 'Agent', :projectId, '[]', '{}', '{}')`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agent_execution_threads')} ("id", "agentId", "agentName", "projectId") VALUES (:threadId, :agentId, 'Agent', :projectId)`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agent_execution')} ("id", "threadId", "status") VALUES (:executionId, :threadId, 'success')`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agents_resources')} ("id") VALUES (:threadId)`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agents_threads')} ("id", "resourceId") VALUES (:threadId, :threadId)`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agents_messages')} ("id", "threadId", "resourceId", "role", "content") VALUES (:messageId, :threadId, :threadId, 'user', :content)`,
				{
					messageId,
					threadId,
					content: JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'Input' }] }),
				},
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agent_execution_message_links')} ("executionId", "messageId", "direction", "position") VALUES (:executionId, :messageId, 'input', 0)`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agent_message_queue')} ("threadId", "messageId", "payload", "executionId") VALUES (:threadId, :messageId, '{"kind":"preview"}', :executionId)`,
				values,
			);
		} finally {
			await seed.queryRunner.release();
		}
	});

	afterAll(async () => {
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

	it('accepts awaiting and keeps rows that reference the execution', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (ctx) => {
			await ctx.runQuery(
				`UPDATE ${ctx.escape.tableName('agent_execution')} SET "status" = 'awaiting' WHERE "id" = :executionId`,
				{ executionId },
			);
			const executions = await ctx.runQuery<Array<{ status: string }>>(
				`SELECT "status" FROM ${ctx.escape.tableName('agent_execution')} WHERE "id" = :executionId`,
				{ executionId },
			);
			expect(executions).toEqual([{ status: 'awaiting' }]);
			expect(
				await ctx.runQuery(
					`SELECT "messageId" FROM ${ctx.escape.tableName('agent_execution_message_links')}`,
				),
			).toEqual([{ messageId }]);
			expect(
				await ctx.runQuery(
					`SELECT "executionId" FROM ${ctx.escape.tableName('agent_message_queue')}`,
				),
			).toEqual([{ executionId }]);
			const table = await ctx.queryRunner.getTable(`${ctx.tablePrefix}agent_execution`);
			expect(table?.indices).toContainEqual(
				expect.objectContaining({
					columnNames: ['status'],
					where: expect.stringContaining("'running'"),
				}),
			);
		});
	});

	it('maps an awaiting execution to error on rollback', async () => {
		// The SQLite subclass turns foreign keys off and opens its own transaction.
		await dataSource.undoLastMigration({ transaction: 'none' });

		await withContext(async (ctx) => {
			const executions = await ctx.runQuery<Array<{ status: string }>>(
				`SELECT "status" FROM ${ctx.escape.tableName('agent_execution')} WHERE "id" = :executionId`,
				{ executionId },
			);
			expect(executions).toEqual([{ status: 'error' }]);
			await expect(
				ctx.runQuery(
					`UPDATE ${ctx.escape.tableName('agent_execution')} SET "status" = 'awaiting' WHERE "id" = :executionId`,
					{ executionId },
				),
			).rejects.toThrow();
		});
	});
});
