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

const MIGRATION_NAME = 'AddAgentTurnQueue1789138249047';

describe('AddAgentTurnQueue migration', () => {
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
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('stores ordered queued turns without removing the active thread claim', async () => {
		const ids = {
			project: randomUUID(),
			agent: randomUUID(),
			thread: randomUUID(),
		};
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

		await withContext(async (context) => {
			const table = context.escape.tableName('agent_execution');
			const insert = async (
				status: 'queued' | 'running',
				enqueueSequence: number | null,
				resourceId: string | null,
			) =>
				await context.runQuery(
					`INSERT INTO ${table} ("id", "threadId", "status", "resourceId", "runContext", "enqueueSequence", "createdAt", "updatedAt")
					 VALUES (:id, :threadId, :status, :resourceId, :runContext, :enqueueSequence, :now, :now)`,
					{
						id: randomUUID(),
						threadId: ids.thread,
						status,
						resourceId,
						runContext: '{"kind":"resume","runId":"run-1","toolCallId":"tool-1","resumeData":true}',
						enqueueSequence,
						now,
					},
				);

			await insert('queued', 1, 'draft-chat:user-1');
			await expect(insert('queued', 1, 'draft-chat:user-1')).rejects.toThrow();
			await insert('running', null, null);
			await expect(insert('running', null, null)).rejects.toThrow();
		});

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => {
			const table = await context.queryRunner.getTable(`${context.tablePrefix}agent_execution`);
			expect(table?.findColumnByName('resourceId')).toBeUndefined();
			expect(table?.findColumnByName('enqueueSequence')).toBeUndefined();

			const queued = await context.runQuery<Array<{ status: string }>>(
				`SELECT "status" FROM ${context.escape.tableName('agent_execution')} WHERE "threadId" = :threadId`,
				{ threadId: ids.thread },
			);
			expect(queued.map(({ status }) => status)).not.toContain('queued');
		});
	});
});
