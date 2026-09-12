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

	it('accepts legacy overlapping running rows, then allows one claimed running row per thread', async () => {
		const ids = {
			project: randomUUID(),
			agent: randomUUID(),
			threadA: randomUUID(),
			threadB: randomUUID(),
			legacyOne: randomUUID(),
			legacyTwo: randomUUID(),
			claimedA: randomUUID(),
			claimedB: randomUUID(),
			nextA: randomUUID(),
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
			for (const threadId of [ids.threadA, ids.threadB]) {
				await context.runQuery(
					`INSERT INTO ${context.escape.tableName('agent_execution_threads')} ("id", "agentId", "agentName", "projectId", "createdAt", "updatedAt")
					 VALUES (:id, :agentId, :agentName, :projectId, :createdAt, :updatedAt)`,
					{
						id: threadId,
						agentId: ids.agent,
						agentName: 'Test agent',
						projectId: ids.project,
						createdAt: now,
						updatedAt: now,
					},
				);
			}
			// Two running rows on one thread, as mains without the claim may leave them.
			for (const id of [ids.legacyOne, ids.legacyTwo]) {
				await context.runQuery(
					`INSERT INTO ${context.escape.tableName('agent_execution')} ("id", "threadId", "status", "createdAt", "updatedAt")
					 VALUES (:id, :threadId, :status, :createdAt, :updatedAt)`,
					{ id, threadId: ids.threadA, status: 'running', createdAt: now, updatedAt: now },
				);
			}
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const table = context.escape.tableName('agent_execution');
			const insertRunning = async (id: string, threadId: string, activeThreadId: string | null) =>
				await context.runQuery(
					`INSERT INTO ${table} ("id", "threadId", "activeThreadId", "status", "createdAt", "updatedAt")
					 VALUES (:id, :threadId, :activeThreadId, :status, :createdAt, :updatedAt)`,
					{ id, threadId, activeThreadId, status: 'running', createdAt: now, updatedAt: now },
				);

			const legacy = await context.runQuery<Array<{ id: string; activeThreadId: string | null }>>(
				`SELECT "id", "activeThreadId" FROM ${table} WHERE "threadId" = :threadId ORDER BY "id"`,
				{ threadId: ids.threadA },
			);
			expect(legacy).toHaveLength(2);
			expect(legacy.every((row) => row.activeThreadId === null)).toBe(true);

			// One claim per thread, next to the unclaimed legacy rows; threads are independent.
			await insertRunning(ids.claimedA, ids.threadA, ids.threadA);
			await expect(insertRunning(randomUUID(), ids.threadA, ids.threadA)).rejects.toThrow();
			await insertRunning(ids.claimedB, ids.threadB, ids.threadB);

			// A row that ended without clearing the column does not block the next claim.
			await context.runQuery(`UPDATE ${table} SET "status" = 'error' WHERE "id" = :id`, {
				id: ids.claimedA,
			});
			await insertRunning(ids.nextA, ids.threadA, ids.threadA);
		});

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => {
			const columns = await context.queryRunner.getTable(`${context.tablePrefix}agent_execution`);
			expect(columns?.findColumnByName('activeThreadId')).toBeUndefined();
			const rows = await context.runQuery<Array<{ count: number | string }>>(
				`SELECT COUNT(*) AS "count" FROM ${context.escape.tableName('agent_execution')}`,
			);
			expect(Number(rows[0].count)).toBe(5);
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		await withContext(async (context) => {
			const table = await context.queryRunner.getTable(`${context.tablePrefix}agent_execution`);
			expect(table?.findColumnByName('activeThreadId')?.isNullable).toBe(true);
		});
	});
});
