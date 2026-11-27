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

const MIGRATION_NAME = 'AddTestTaskIdToAgentExecutionThreads1795609783977';

describe('AddTestTaskIdToAgentExecutionThreads migration', () => {
	let dataSource: DataSource;
	const projectId = randomUUID();
	const agentId = randomUUID();
	const identityId = randomUUID();
	const threadId = randomUUID();
	const executionId = randomUUID();

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const ctx = createTestMigrationContext(dataSource);
		await ctx.queryRunner.clearDatabase();
		await ctx.queryRunner.release();
		// The database stops before this migration, so newer migrations do not matter.
		await initDbUpToMigration(MIGRATION_NAME);
		await withContext(async (seed) => {
			const values = { projectId, agentId, identityId, threadId, executionId, now: new Date() };
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt") VALUES (:projectId, 'Project', 'team', :now, :now)`,
				values,
			);
			// Each Agent has its own identity user.
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('user')} ("id") VALUES (:identityId)`,
				values,
			);
			await seed.runQuery(
				`INSERT INTO ${seed.escape.tableName('agents')} ("id", "name", "projectId", "identityId", "integrations", "tools", "skills") VALUES (:agentId, 'Agent', :projectId, :identityId, '[]', '{}', '{}')`,
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
		});
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

	async function threadColumns(ctx: TestMigrationContext) {
		const table = await ctx.queryRunner.getTable(`${ctx.tablePrefix}agent_execution_threads`);
		return table?.columns.map(({ name }) => name) ?? [];
	}

	async function executionCount(ctx: TestMigrationContext) {
		const rows = await ctx.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS "count" FROM ${ctx.escape.tableName('agent_execution')} WHERE "threadId" = :threadId`,
			{ threadId },
		);
		return Number(rows[0]?.count);
	}

	it('adds an empty testTaskId and keeps existing sessions and their executions', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (ctx) => {
			expect(await threadColumns(ctx)).toContain('testTaskId');
			const threads = await ctx.runQuery<Array<{ testTaskId: string | null }>>(
				`SELECT "testTaskId" FROM ${ctx.escape.tableName('agent_execution_threads')} WHERE "id" = :threadId`,
				{ threadId },
			);
			expect(threads).toEqual([{ testTaskId: null }]);
			expect(await executionCount(ctx)).toBe(1);
		});
	});

	it('drops the column on rollback and keeps the rows', async () => {
		await undoLastSingleMigration();

		await withContext(async (ctx) => {
			expect(await threadColumns(ctx)).not.toContain('testTaskId');
			expect(await executionCount(ctx)).toBe(1);
		});
	});

	it('adds the column again after a rollback', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (ctx) => {
			expect(await threadColumns(ctx)).toContain('testTaskId');
			expect(await executionCount(ctx)).toBe(1);
		});
	});
});
