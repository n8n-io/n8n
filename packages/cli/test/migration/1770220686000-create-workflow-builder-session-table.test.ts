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

const MIGRATION_NAME = 'CreateWorkflowBuilderSessionTable1770220686000';

describe('CreateWorkflowBuilderSessionTable Migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		const ctx = createTestMigrationContext(dataSource);
		await ctx.queryRunner.clearDatabase();
		await ctx.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertUser(ctx: TestMigrationContext, id: string): Promise<void> {
		const table = ctx.escape.tableName('user');
		await ctx.runQuery(
			`INSERT INTO ${table} ("id", "email", "firstName", "lastName", "password", "roleSlug", "createdAt", "updatedAt") VALUES (:id, :email, :firstName, :lastName, :password, :roleSlug, :createdAt, :updatedAt)`,
			{
				id,
				email: `${id}@test.com`,
				firstName: 'Test',
				lastName: 'User',
				password: 'hashed',
				roleSlug: 'global:member',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertWorkflow(ctx: TestMigrationContext, id: string): Promise<void> {
		const table = ctx.escape.tableName('workflow_entity');
		await ctx.runQuery(
			`INSERT INTO ${table} ("id", "name", "active", "nodes", "connections", "versionId", "createdAt", "updatedAt") VALUES (:id, :name, :active, :nodes, :connections, :versionId, :createdAt, :updatedAt)`,
			{
				id,
				name: `Workflow ${id}`,
				active: false,
				nodes: '[]',
				connections: '{}',
				versionId: randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	describe('up', () => {
		it('should create the workflow_builder_session table', async () => {
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const ctx = createTestMigrationContext(dataSource);

			if (ctx.isSqlite) {
				const tableInfo = await ctx.runQuery<Array<{ name: string }>>(
					`PRAGMA table_info(${ctx.escape.tableName('workflow_builder_session')})`,
				);
				const columnNames = tableInfo.map((col) => col.name);
				expect(columnNames).toContain('id');
				expect(columnNames).toContain('workflowId');
				expect(columnNames).toContain('userId');
				expect(columnNames).toContain('messages');
				expect(columnNames).toContain('previousSummary');
				expect(columnNames).toContain('createdAt');
				expect(columnNames).toContain('updatedAt');
			}

			await ctx.queryRunner.release();
		});

		it('should allow inserting a session row', async () => {
			const userId = randomUUID();
			const workflowId = randomUUID();
			const sessionId = randomUUID();

			const ctx = createTestMigrationContext(dataSource);
			await insertUser(ctx, userId);
			await insertWorkflow(ctx, workflowId);
			await ctx.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postCtx = createTestMigrationContext(dataSource);
			const table = postCtx.escape.tableName('workflow_builder_session');
			await postCtx.runQuery(
				`INSERT INTO ${table} ("id", "workflowId", "userId", "messages", "createdAt", "updatedAt") VALUES (:id, :workflowId, :userId, :messages, :createdAt, :updatedAt)`,
				{
					id: sessionId,
					workflowId,
					userId,
					messages: '[]',
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			);

			const rows = await postCtx.runQuery<Array<{ id: string; workflowId: string }>>(
				`SELECT "id", "workflowId" FROM ${table} WHERE "id" = :id`,
				{ id: sessionId },
			);
			expect(rows).toHaveLength(1);
			expect(rows[0].workflowId).toBe(workflowId);
			await postCtx.queryRunner.release();
		});

		it('should enforce unique constraint on (workflowId, userId)', async () => {
			const userId = randomUUID();
			const workflowId = randomUUID();

			const ctx = createTestMigrationContext(dataSource);
			await insertUser(ctx, userId);
			await insertWorkflow(ctx, workflowId);
			await ctx.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postCtx = createTestMigrationContext(dataSource);
			const table = postCtx.escape.tableName('workflow_builder_session');
			const insertSql = `INSERT INTO ${table} ("id", "workflowId", "userId", "messages", "createdAt", "updatedAt") VALUES (:id, :workflowId, :userId, :messages, :createdAt, :updatedAt)`;
			const now = new Date();

			await postCtx.runQuery(insertSql, {
				id: randomUUID(),
				workflowId,
				userId,
				messages: '[]',
				createdAt: now,
				updatedAt: now,
			});

			await expect(
				postCtx.runQuery(insertSql, {
					id: randomUUID(),
					workflowId,
					userId,
					messages: '[]',
					createdAt: now,
					updatedAt: now,
				}),
			).rejects.toThrow();

			await postCtx.queryRunner.release();
		});

		it('should cascade delete when workflow is deleted', async () => {
			const userId = randomUUID();
			const workflowId = randomUUID();

			const ctx = createTestMigrationContext(dataSource);
			await insertUser(ctx, userId);
			await insertWorkflow(ctx, workflowId);
			await ctx.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postCtx = createTestMigrationContext(dataSource);
			const sessionTable = postCtx.escape.tableName('workflow_builder_session');
			const workflowTable = postCtx.escape.tableName('workflow_entity');
			const now = new Date();

			await postCtx.runQuery(
				`INSERT INTO ${sessionTable} ("id", "workflowId", "userId", "messages", "createdAt", "updatedAt") VALUES (:id, :workflowId, :userId, :messages, :createdAt, :updatedAt)`,
				{
					id: randomUUID(),
					workflowId,
					userId,
					messages: '[]',
					createdAt: now,
					updatedAt: now,
				},
			);

			await postCtx.runQuery(`DELETE FROM ${workflowTable} WHERE "id" = :id`, {
				id: workflowId,
			});

			const rows = await postCtx.runQuery<unknown[]>(
				`SELECT * FROM ${sessionTable} WHERE "workflowId" = :workflowId`,
				{ workflowId },
			);
			expect(rows).toHaveLength(0);
			await postCtx.queryRunner.release();
		});
	});

	describe('down', () => {
		it('should drop the workflow_builder_session table', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			const ctx = createTestMigrationContext(dataSource);

			if (ctx.isSqlite) {
				const tables = await ctx.runQuery<Array<{ name: string }>>(
					"SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%workflow_builder_session'",
				);
				expect(tables).toHaveLength(0);
			}

			await ctx.queryRunner.release();
		});
	});
});
