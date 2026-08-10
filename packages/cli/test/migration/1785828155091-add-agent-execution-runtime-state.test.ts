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

const MIGRATION_NAME = 'AddAgentExecutionRuntimeState1785828155091';

describe('AddAgentExecutionRuntimeState migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	let executionId: string;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		const projectId = randomUUID();
		const agentId = randomUUID();
		const threadId = randomUUID();
		executionId = randomUUID();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, 'team', :createdAt, :updatedAt)`,
			{ id: projectId, name: 'Project', createdAt: now, updatedAt: now },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
			 VALUES (:id, :name, :projectId, :integrations, :tools, :skills, :createdAt, :updatedAt)`,
			{
				id: agentId,
				name: 'Agent',
				projectId,
				integrations: '[]',
				tools: '{}',
				skills: '{}',
				createdAt: now,
				updatedAt: now,
			},
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_execution_threads')}
			 ("id", "agentId", "agentName", "projectId", "createdAt", "updatedAt")
			 VALUES (:id, :agentId, :agentName, :projectId, :createdAt, :updatedAt)`,
			{ id: threadId, agentId, agentName: 'Agent', projectId, createdAt: now, updatedAt: now },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agent_execution')}
			 ("id", "threadId", "status", "duration", "storedAt", "createdAt", "updatedAt")
			 VALUES (:id, :threadId, 'success', 0, 'db', :createdAt, :updatedAt)`,
			{ id: executionId, threadId, createdAt: now, updatedAt: now },
		);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('supports runtime statuses and indexes running execution scans', async () => {
		const ctx = createTestMigrationContext(dataSource);
		const executionTable = ctx.escape.tableName('agent_execution');

		for (const status of ['running', 'cancelled', 'interrupted']) {
			await expect(
				ctx.runQuery(`UPDATE ${executionTable} SET "status" = :status WHERE "id" = :id`, {
					id: executionId,
					status,
				}),
			).resolves.not.toThrow();
		}
		expect(
			(await ctx.queryRunner.getTable(`${ctx.tablePrefix}agent_execution`))?.indices.some(
				(index) => index.columnNames[0] === 'status' && index.where?.includes("'running'"),
			),
		).toBe(true);
		await ctx.queryRunner.release();
	});

	it('maps runtime-only statuses to error on rollback', async () => {
		const runtimeCtx = createTestMigrationContext(dataSource);
		await runtimeCtx.runQuery(
			`UPDATE ${runtimeCtx.escape.tableName('agent_execution')} SET "status" = 'running' WHERE "id" = :id`,
			{ id: executionId },
		);
		await runtimeCtx.queryRunner.release();

		await dataSource.undoLastMigration({ transaction: 'each' });
		const ctx = createTestMigrationContext(dataSource);
		const row = await ctx.runQuery<Array<{ status: string }>>(
			`SELECT "status" FROM ${ctx.escape.tableName('agent_execution')} WHERE "id" = :id`,
			{ id: executionId },
		);
		expect(row).toEqual([{ status: 'error' }]);
		expect(
			(await ctx.queryRunner.getTable(`${ctx.tablePrefix}agent_execution`))?.indices.some(
				(index) => index.columnNames[0] === 'status',
			),
		).toBe(false);
		await ctx.queryRunner.release();
	});
});
