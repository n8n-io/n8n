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

const MIGRATION_NAME = 'AddQueuedStatusToAgentExecution1789375477575';

describe('AddQueuedStatusToAgentExecution migration', () => {
	let dataSource: DataSource;

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
		await withContext(async (context) => {
			await context.queryRunner.clearDatabase();
		});
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('accepts queued rows with a sender after up and cancels them on down', async () => {
		const ids = { project: randomUUID(), agent: randomUUID(), thread: randomUUID() };
		const now = new Date('2026-09-14T10:00:00.000Z');

		await withContext(async (context) => {
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
				 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
				{ id: ids.project, name: 'Test project', type: 'team', createdAt: now, updatedAt: now },
			);
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
				 VALUES (:id, :name, :projectId, :integrations, :tools, :skills, :createdAt, :updatedAt)`,
				{
					id: ids.agent,
					name: 'Test agent',
					projectId: ids.project,
					integrations: '[]',
					tools: '{}',
					skills: '{}',
					createdAt: now,
					updatedAt: now,
				},
			);
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('agent_execution_threads')} ("id", "agentId", "agentName", "projectId", "createdAt", "updatedAt")
				 VALUES (:id, :agentId, :agentName, :projectId, :createdAt, :updatedAt)`,
				{
					id: ids.thread,
					agentId: ids.agent,
					agentName: 'Test agent',
					projectId: ids.project,
					createdAt: now,
					updatedAt: now,
				},
			);
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const queuedId = randomUUID();
		await withContext(async (context) => {
			const table = context.escape.tableName('agent_execution');
			await context.runQuery(
				`INSERT INTO ${table} ("id", "threadId", "status", "resourceId", "createdAt", "updatedAt")
				 VALUES (:id, :threadId, 'queued', :resourceId, :now, :now)`,
				{ id: queuedId, threadId: ids.thread, resourceId: 'draft-chat:user-1', now },
			);
			const rows = await context.runQuery<Array<{ status: string; resourceId: string }>>(
				`SELECT "status", "resourceId" FROM ${table} WHERE "id" = :id`,
				{ id: queuedId },
			);
			expect(rows).toEqual([{ status: 'queued', resourceId: 'draft-chat:user-1' }]);
		});

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => {
			const table = context.escape.tableName('agent_execution');
			const rows = await context.runQuery<Array<{ status: string }>>(
				`SELECT "status" FROM ${table} WHERE "id" = :id`,
				{ id: queuedId },
			);
			expect(rows).toEqual([{ status: 'cancelled' }]);
			const columns = await context.queryRunner.getTable(`${context.tablePrefix}agent_execution`);
			expect(columns?.findColumnByName('resourceId')).toBeUndefined();
			await expect(
				context.runQuery(
					`INSERT INTO ${table} ("id", "threadId", "status", "createdAt", "updatedAt")
					 VALUES (:id, :threadId, 'queued', :now, :now)`,
					{ id: randomUUID(), threadId: ids.thread, now },
				),
			).rejects.toThrow();
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		await withContext(async (context) => {
			const table = await context.queryRunner.getTable(`${context.tablePrefix}agent_execution`);
			expect(table?.findColumnByName('resourceId')?.isNullable).toBe(true);
		});
	});
});
