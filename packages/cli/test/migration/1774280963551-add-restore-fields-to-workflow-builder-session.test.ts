import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddRestoreFieldsToWorkflowBuilderSession1774280963551';

describe('AddRestoreFieldsToWorkflowBuilderSession Migration', () => {
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

	async function insertPrerequisites(workflowId: string, userId: string): Promise<void> {
		const ctx = createTestMigrationContext(dataSource);
		const userTable = ctx.escape.tableName('user');
		const workflowTable = ctx.escape.tableName('workflow_entity');
		const now = new Date();

		await ctx.runQuery(
			`INSERT INTO ${userTable} ("id", "email", "firstName", "lastName", "password", "roleSlug", "createdAt", "updatedAt") VALUES (:id, :email, :firstName, :lastName, :password, :roleSlug, :createdAt, :updatedAt)`,
			{
				id: userId,
				email: `${userId}@test.com`,
				firstName: 'Test',
				lastName: 'User',
				password: 'hashed',
				roleSlug: 'global:member',
				createdAt: now,
				updatedAt: now,
			},
		);

		await ctx.runQuery(
			`INSERT INTO ${workflowTable} ("id", "name", "active", "nodes", "connections", "versionId", "createdAt", "updatedAt") VALUES (:id, :name, :active, :nodes, :connections, :versionId, :createdAt, :updatedAt)`,
			{
				id: workflowId,
				name: `Workflow ${workflowId}`,
				active: false,
				nodes: '[]',
				connections: '{}',
				versionId: randomUUID(),
				createdAt: now,
				updatedAt: now,
			},
		);

		await ctx.queryRunner.release();
	}

	describe('up', () => {
		it('should add activeVersionCardId and resumeAfterRestoreMessageId columns', async () => {
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const ctx = createTestMigrationContext(dataSource);

			if (ctx.isSqlite) {
				const tableInfo = await ctx.runQuery<Array<{ name: string }>>(
					`PRAGMA table_info(${ctx.escape.tableName('workflow_builder_session')})`,
				);
				const columnNames = tableInfo.map((col) => col.name);
				expect(columnNames).toContain('activeVersionCardId');
				expect(columnNames).toContain('resumeAfterRestoreMessageId');
			} else {
				for (const columnName of ['activeVersionCardId', 'resumeAfterRestoreMessageId']) {
					const result = await ctx.runQuery<Array<{ column_name: string }>>(
						'SELECT column_name FROM information_schema.columns WHERE table_name = :tableName AND column_name = :columnName',
						{ tableName: `${ctx.tablePrefix}workflow_builder_session`, columnName },
					);
					expect(result).toHaveLength(1);
				}
			}

			await ctx.queryRunner.release();
		});

		it('should allow null values for new columns', async () => {
			const userId = randomUUID();
			const workflowId = randomUUID();
			const sessionId = randomUUID();

			await insertPrerequisites(workflowId, userId);

			// Insert a session before the migration (without the new columns)
			const ctx = createTestMigrationContext(dataSource);
			const table = ctx.escape.tableName('workflow_builder_session');
			const now = new Date();
			await ctx.runQuery(
				`INSERT INTO ${table} ("id", "workflowId", "userId", "messages", "createdAt", "updatedAt") VALUES (:id, :workflowId, :userId, :messages, :createdAt, :updatedAt)`,
				{
					id: sessionId,
					workflowId,
					userId,
					messages: '[]',
					createdAt: now,
					updatedAt: now,
				},
			);
			await ctx.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postCtx = createTestMigrationContext(dataSource);
			const postTable = postCtx.escape.tableName('workflow_builder_session');
			const rows = await postCtx.runQuery<
				Array<{ activeVersionCardId: string | null; resumeAfterRestoreMessageId: string | null }>
			>(
				`SELECT "activeVersionCardId", "resumeAfterRestoreMessageId" FROM ${postTable} WHERE "id" = :id`,
				{ id: sessionId },
			);

			expect(rows).toHaveLength(1);
			expect(rows[0].activeVersionCardId).toBeNull();
			expect(rows[0].resumeAfterRestoreMessageId).toBeNull();
			await postCtx.queryRunner.release();
		});

		it('should allow setting values on the new columns', async () => {
			const userId = randomUUID();
			const workflowId = randomUUID();
			const sessionId = randomUUID();
			const versionCardId = 'version-card-123';
			const resumeMessageId = 'msg-456';

			await insertPrerequisites(workflowId, userId);

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const ctx = createTestMigrationContext(dataSource);
			const table = ctx.escape.tableName('workflow_builder_session');
			const now = new Date();

			await ctx.runQuery(
				`INSERT INTO ${table} ("id", "workflowId", "userId", "messages", "activeVersionCardId", "resumeAfterRestoreMessageId", "createdAt", "updatedAt") VALUES (:id, :workflowId, :userId, :messages, :activeVersionCardId, :resumeAfterRestoreMessageId, :createdAt, :updatedAt)`,
				{
					id: sessionId,
					workflowId,
					userId,
					messages: '[]',
					activeVersionCardId: versionCardId,
					resumeAfterRestoreMessageId: resumeMessageId,
					createdAt: now,
					updatedAt: now,
				},
			);

			const rows = await ctx.runQuery<
				Array<{ activeVersionCardId: string; resumeAfterRestoreMessageId: string }>
			>(
				`SELECT "activeVersionCardId", "resumeAfterRestoreMessageId" FROM ${table} WHERE "id" = :id`,
				{ id: sessionId },
			);

			expect(rows).toHaveLength(1);
			expect(rows[0].activeVersionCardId).toBe(versionCardId);
			expect(rows[0].resumeAfterRestoreMessageId).toBe(resumeMessageId);
			await ctx.queryRunner.release();
		});
	});

	describe('down', () => {
		it('should remove the activeVersionCardId and resumeAfterRestoreMessageId columns', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			const ctx = createTestMigrationContext(dataSource);

			if (ctx.isSqlite) {
				const tableInfo = await ctx.runQuery<Array<{ name: string }>>(
					`PRAGMA table_info(${ctx.escape.tableName('workflow_builder_session')})`,
				);
				const columnNames = tableInfo.map((col) => col.name);
				expect(columnNames).not.toContain('activeVersionCardId');
				expect(columnNames).not.toContain('resumeAfterRestoreMessageId');
				// Original columns should still exist
				expect(columnNames).toContain('id');
				expect(columnNames).toContain('workflowId');
				expect(columnNames).toContain('messages');
			} else {
				for (const columnName of ['activeVersionCardId', 'resumeAfterRestoreMessageId']) {
					const result = await ctx.runQuery<Array<{ column_name: string }>>(
						'SELECT column_name FROM information_schema.columns WHERE table_name = :tableName AND column_name = :columnName',
						{ tableName: `${ctx.tablePrefix}workflow_builder_session`, columnName },
					);
					expect(result).toHaveLength(0);
				}
				// Original columns should still exist
				for (const columnName of ['id', 'workflowId', 'messages']) {
					const result = await ctx.runQuery<Array<{ column_name: string }>>(
						'SELECT column_name FROM information_schema.columns WHERE table_name = :tableName AND column_name = :columnName',
						{ tableName: `${ctx.tablePrefix}workflow_builder_session`, columnName },
					);
					expect(result).toHaveLength(1);
				}
			}

			await ctx.queryRunner.release();
		});
	});
});
