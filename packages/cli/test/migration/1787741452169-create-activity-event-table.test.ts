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

import { indexColumnsInOrder } from './shared/index-columns';

const MIGRATION_NAME = 'CreateActivityEventTable1787741452169';
const ACTIVITY_TABLE = 'activity_event';

type ActivityRow = {
	id: number;
	category: string;
	action: string;
	userId: string | null;
	projectId: string | null;
	resourceId: string | null;
};

describe('CreateActivityEventTable migration', () => {
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
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertUser(context: TestMigrationContext, id: string) {
		const table = context.escape.tableName('user');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "email", "firstName", "lastName", "password", "roleSlug", "createdAt", "updatedAt")
			 VALUES (:id, :email, :firstName, :lastName, :password, :roleSlug, :createdAt, :updatedAt)`,
			{
				id,
				email: `${id}@test.com`,
				firstName: 'Test',
				lastName: 'User',
				password: 'hashed',
				roleSlug: 'global:member',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertProject(context: TestMigrationContext, id: string) {
		const table = context.escape.tableName('project');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
	}

	async function insertActivity(
		context: TestMigrationContext,
		entry: {
			category: string;
			action: string;
			userId?: string | null;
			projectId?: string | null;
			resourceId?: string | null;
			resourceName?: string | null;
			data?: string | null;
		},
	) {
		const table = context.escape.tableName(ACTIVITY_TABLE);
		await context.runQuery(
			`INSERT INTO ${table} ("category", "action", "userId", "projectId", "resourceType", "resourceId", "resourceName", "data", "createdAt")
			 VALUES (:category, :action, :userId, :projectId, :resourceType, :resourceId, :resourceName, :data, :createdAt)`,
			{
				category: entry.category,
				action: entry.action,
				userId: entry.userId ?? null,
				projectId: entry.projectId ?? null,
				resourceType: 'workflow',
				resourceId: entry.resourceId ?? null,
				resourceName: entry.resourceName ?? null,
				data: entry.data ?? null,
				createdAt: new Date(),
			},
		);
	}

	async function getActivity(context: TestMigrationContext): Promise<ActivityRow[]> {
		const table = context.escape.tableName(ACTIVITY_TABLE);
		return await context.runQuery<ActivityRow[]>(
			`SELECT "id" AS "id", "category" AS "category", "action" AS "action", "userId" AS "userId",
			        "projectId" AS "projectId", "resourceId" AS "resourceId"
			 FROM ${table} ORDER BY "id"`,
		);
	}

	it('creates the two indexes the feed reads need, with id trailing each', async () => {
		const [project, user, resource] = await withContext(
			async (context) =>
				await Promise.all([
					indexColumnsInOrder(context, 'activity_event_project'),
					indexColumnsInOrder(context, 'activity_event_user'),
					indexColumnsInOrder(context, 'activity_event_resource'),
				]),
		);

		// `id` trails each so a newest-first scan is served by the index alone.
		expect(project).toEqual(['projectId', 'id']);
		expect(user).toEqual(['userId', 'id']);
		// The resource index is deliberately held back until the read that needs it exists.
		expect(resource).toBeUndefined();
	});

	it('assigns ascending ids so the feed can order and page on them', async () => {
		const rows = await withContext(async (context) => {
			await insertActivity(context, { category: 'workflow', action: 'created' });
			await insertActivity(context, { category: 'workflow', action: 'saved' });
			return await getActivity(context);
		});

		expect(rows).toHaveLength(2);
		expect(rows[1].id).toBeGreaterThan(rows[0].id);
		expect(rows.map((row) => row.action)).toEqual(['created', 'saved']);
	});

	it('accepts a resourceId that matches no row, so entries outlive what they describe', async () => {
		const rows = await withContext(async (context) => {
			await insertActivity(context, {
				category: 'workflow',
				action: 'deleted',
				resourceId: randomUUID(),
				resourceName: 'Lead enrichment',
			});
			return await getActivity(context);
		});

		expect(rows).toHaveLength(1);
		expect(rows[0].action).toBe('deleted');
	});

	it('keeps an entry when its user is deleted, dropping only the attribution', async () => {
		const userId = randomUUID();

		const rows = await withContext(async (context) => {
			await insertUser(context, userId);
			await insertActivity(context, { category: 'workflow', action: 'saved', userId });

			const userTable = context.escape.tableName('user');
			await context.runQuery(`DELETE FROM ${userTable} WHERE "id" = :userId`, { userId });

			return await getActivity(context);
		});

		expect(rows).toHaveLength(1);
		expect(rows[0].userId).toBeNull();
	});

	it("removes a project's entries when the project is deleted", async () => {
		const projectId = randomUUID();

		const rows = await withContext(async (context) => {
			await insertProject(context, projectId);
			await insertActivity(context, { category: 'workflow', action: 'saved', projectId });
			// An instance-level entry, which is where a project deletion itself is recorded.
			await insertActivity(context, { category: 'workflow', action: 'deleted' });

			const projectTable = context.escape.tableName('project');
			await context.runQuery(`DELETE FROM ${projectTable} WHERE "id" = :projectId`, { projectId });

			return await getActivity(context);
		});

		expect(rows).toHaveLength(1);
		expect(rows[0].action).toBe('deleted');
		expect(rows[0].projectId).toBeNull();
	});

	it('drops the table on revert', async () => {
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const table = context.escape.tableName(ACTIVITY_TABLE);
			await expect(context.runQuery(`SELECT 1 FROM ${table}`)).rejects.toThrow();
		});
	});
});
