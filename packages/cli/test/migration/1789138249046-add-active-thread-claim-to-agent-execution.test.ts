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

const MIGRATION_NAME = 'AddActiveThreadClaimToAgentExecution1789138249046';

describe('AddActiveThreadClaimToAgentExecution migration', () => {
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

	it('keeps legacy overlapping running rows unclaimed, lets one claimed running row per thread in and stores queued rows', async () => {
		const ids = {
			project: randomUUID(),
			agent: randomUUID(),
			thread: randomUUID(),
			legacyOne: randomUUID(),
			legacyTwo: randomUUID(),
			queued: randomUUID(),
		};
		const now = new Date('2026-09-11T10:00:00.000Z');

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
			// Two running rows on one thread, as mains without the claim may leave them.
			for (const id of [ids.legacyOne, ids.legacyTwo]) {
				await context.runQuery(
					`INSERT INTO ${context.escape.tableName('agent_execution')} ("id", "threadId", "status", "createdAt", "updatedAt")
					 VALUES (:id, :threadId, :status, :createdAt, :updatedAt)`,
					{ id, threadId: ids.thread, status: 'running', createdAt: now, updatedAt: now },
				);
			}
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const table = context.escape.tableName('agent_execution');
			const insertClaimed = async () =>
				await context.runQuery(
					`INSERT INTO ${table} ("id", "threadId", "status", "runContext", "createdAt", "updatedAt")
					 VALUES (:id, :threadId, 'running', :runContext, :now, :now)`,
					{
						id: randomUUID(),
						threadId: ids.thread,
						runContext: '{"kind":"message"}',
						now,
					},
				);

			const legacy = await context.runQuery<Array<{ runContext: string | null }>>(
				`SELECT "runContext" FROM ${table} WHERE "threadId" = :threadId`,
				{ threadId: ids.thread },
			);
			expect(legacy).toEqual([{ runContext: null }, { runContext: null }]);

			// One claim fits next to the unclaimed legacy rows; a second one does not.
			await insertClaimed();
			await expect(insertClaimed()).rejects.toThrow();

			// A queued row passes the widened status check and carries its sender and run context.
			await context.runQuery(
				`INSERT INTO ${table} ("id", "threadId", "status", "resourceId", "runContext", "createdAt", "updatedAt")
				 VALUES (:id, :threadId, 'queued', :resourceId, :runContext, :now, :now)`,
				{
					id: ids.queued,
					threadId: ids.thread,
					resourceId: 'draft-chat:user-1',
					runContext: '{"kind":"message"}',
					now,
				},
			);
			const queued = await context.runQuery<Array<{ status: string; resourceId: string }>>(
				`SELECT "status", "resourceId" FROM ${table} WHERE "id" = :id`,
				{ id: ids.queued },
			);
			expect(queued).toEqual([{ status: 'queued', resourceId: 'draft-chat:user-1' }]);
		});

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => {
			const table = context.escape.tableName('agent_execution');
			const columns = await context.queryRunner.getTable(`${context.tablePrefix}agent_execution`);
			for (const name of ['resourceId', 'runContext']) {
				expect(columns?.findColumnByName(name)).toBeUndefined();
			}
			const rows = await context.runQuery<Array<{ count: number | string }>>(
				`SELECT COUNT(*) AS "count" FROM ${table}`,
			);
			expect(Number(rows[0].count)).toBe(4);
			// The queued row never ran, so it ends as cancelled and the old check rejects new queued rows.
			const cancelled = await context.runQuery<Array<{ status: string }>>(
				`SELECT "status" FROM ${table} WHERE "id" = :id`,
				{ id: ids.queued },
			);
			expect(cancelled).toEqual([{ status: 'cancelled' }]);
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
			for (const name of ['resourceId', 'runContext']) {
				expect(table?.findColumnByName(name)?.isNullable).toBe(true);
			}
		});
	});
});
