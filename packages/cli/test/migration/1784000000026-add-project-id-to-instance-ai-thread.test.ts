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

const MIGRATION_NAME = 'AddProjectIdToInstanceAiThread1784000000026';
const PERSONAL_OWNER_ROLE = 'project:personalOwner';

describe('AddProjectIdToInstanceAiThread Migration', () => {
	let dataSource: DataSource;
	jest.setTimeout(20_000);

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
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertUser(
		context: TestMigrationContext,
		id: string,
		roleSlug: string = 'global:member',
	): Promise<void> {
		const tableName = context.escape.tableName('user');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "email", "firstName", "lastName", "password", "roleSlug", "createdAt", "updatedAt")
			 VALUES (:id, :email, :firstName, :lastName, :password, :roleSlug, :createdAt, :updatedAt)`,
			{
				id,
				email: `${id}@test.com`,
				firstName: 'Test',
				lastName: 'User',
				password: 'hashed',
				roleSlug,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertProject(context: TestMigrationContext, id: string): Promise<void> {
		const tableName = context.escape.tableName('project');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
			{
				id,
				name: `project-${id.slice(0, 8)}`,
				type: 'personal',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertPersonalOwnerRelation(
		context: TestMigrationContext,
		userId: string,
		projectId: string,
	): Promise<void> {
		const tableName = context.escape.tableName('project_relation');
		await context.runQuery(
			`INSERT INTO ${tableName} ("userId", "projectId", "role", "createdAt", "updatedAt")
			 VALUES (:userId, :projectId, :role, :createdAt, :updatedAt)`,
			{
				userId,
				projectId,
				role: PERSONAL_OWNER_ROLE,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertThread(
		context: TestMigrationContext,
		data: { id: string; resourceId: string },
	): Promise<void> {
		const tableName = context.escape.tableName('instance_ai_threads');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "resourceId", "title", "createdAt", "updatedAt")
			 VALUES (:id, :resourceId, :title, :createdAt, :updatedAt)`,
			{
				id: data.id,
				resourceId: data.resourceId,
				title: '',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function getThreadProjectId(
		context: TestMigrationContext,
		threadId: string,
	): Promise<string | null | undefined> {
		const tableName = context.escape.tableName('instance_ai_threads');
		const rows = await context.runQuery<Array<{ projectId: string | null }>>(
			`SELECT "projectId" FROM ${tableName} WHERE "id" = :id`,
			{ id: threadId },
		);
		return rows[0]?.projectId;
	}

	async function getInstanceOwnerPersonalProjectId(
		context: TestMigrationContext,
	): Promise<string | undefined> {
		const relation = context.escape.tableName('project_relation');
		const user = context.escape.tableName('user');
		const rows = await context.runQuery<Array<{ projectId: string }>>(
			`SELECT pr."projectId" AS "projectId"
			 FROM ${relation} pr
			 INNER JOIN ${user} u ON u."id" = pr."userId"
			 WHERE u."roleSlug" = 'global:owner' AND pr."role" = 'project:personalOwner'
			 LIMIT 1`,
		);
		return rows[0]?.projectId;
	}

	describe('up', () => {
		it("backfills a user thread with its owner's personal project", async () => {
			const userId = randomUUID();
			const personalProjectId = randomUUID();
			const threadId = randomUUID();

			await withContext(async (context) => {
				await insertUser(context, userId);
				await insertProject(context, personalProjectId);
				await insertPersonalOwnerRelation(context, userId, personalProjectId);
				await insertThread(context, { id: threadId, resourceId: userId });
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				expect(await getThreadProjectId(context, threadId)).toBe(personalProjectId);
			});
		});

		it("binds a sub-agent thread to its parent thread's project", async () => {
			const userId = randomUUID();
			const personalProjectId = randomUUID();
			const parentThreadId = randomUUID();
			const subAgentThreadId = randomUUID();

			await withContext(async (context) => {
				await insertUser(context, userId);
				await insertProject(context, personalProjectId);
				await insertPersonalOwnerRelation(context, userId, personalProjectId);
				await insertThread(context, { id: parentThreadId, resourceId: userId });
				await insertThread(context, {
					id: subAgentThreadId,
					resourceId: `instance-ai-subagent:${parentThreadId}:workflow-builder`,
				});
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				expect(await getThreadProjectId(context, subAgentThreadId)).toBe(personalProjectId);
			});
		});

		it("falls back to the instance owner's personal project for an orphaned thread", async () => {
			const orphanThreadId = randomUUID();

			await withContext(async (context) => {
				// The instance owner + personal project already exist (seeded by initDb).
				// The orphan's resourceId points at a user that no longer exists, so the
				// migration falls back to the owner's personal project.
				await insertThread(context, { id: orphanThreadId, resourceId: randomUUID() });
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const ownerProjectId = await getInstanceOwnerPersonalProjectId(context);
				expect(ownerProjectId).toBeTruthy();
				expect(await getThreadProjectId(context, orphanThreadId)).toBe(ownerProjectId);
			});
		});
	});

	describe('down', () => {
		it('removes the projectId column while keeping the thread row', async () => {
			const userId = randomUUID();
			const personalProjectId = randomUUID();
			const threadId = randomUUID();

			await withContext(async (context) => {
				await insertUser(context, userId);
				await insertProject(context, personalProjectId);
				await insertPersonalOwnerRelation(context, userId, personalProjectId);
				await insertThread(context, { id: threadId, resourceId: userId });
			});

			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const table = await context.queryRunner.getTable(
					`${context.tablePrefix}instance_ai_threads`,
				);
				const columnNames = (table?.columns ?? []).map((column) => column.name);
				expect(columnNames).not.toContain('projectId');
				expect(columnNames).toContain('resourceId');

				const tableName = context.escape.tableName('instance_ai_threads');
				const rows = await context.runQuery<Array<{ id: string }>>(
					`SELECT "id" FROM ${tableName} WHERE "id" = :id`,
					{ id: threadId },
				);
				expect(rows).toHaveLength(1);
			});
		});
	});
});
