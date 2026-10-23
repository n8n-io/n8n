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

const MIGRATION_NAME = 'CreateActivityEventTable1788425788714';
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
	let projectId: string;

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
		// `projectId` is NOT NULL, so every entry needs a project to belong to.
		projectId = randomUUID();
		await withContext(async (context) => await insertProject(context, projectId));
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
			projectId?: string;
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
				projectId: entry.projectId ?? projectId,
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

	it("removes a project's entries when the project is deleted, and only that project's", async () => {
		const doomedProjectId = randomUUID();

		const rows = await withContext(async (context) => {
			await insertProject(context, doomedProjectId);
			await insertActivity(context, { category: 'workflow', action: 'saved' });
			await insertActivity(context, {
				category: 'workflow',
				action: 'deleted',
				projectId: doomedProjectId,
			});

			const projectTable = context.escape.tableName('project');
			await context.runQuery(`DELETE FROM ${projectTable} WHERE "id" = :id`, {
				id: doomedProjectId,
			});

			return await getActivity(context);
		});

		expect(rows).toHaveLength(1);
		expect(rows[0].action).toBe('saved');
		expect(rows[0].projectId).toBe(projectId);
	});

	it('refuses an entry with no project, since no read could ever return it', async () => {
		await expect(
			withContext(async (context) => {
				const table = context.escape.tableName(ACTIVITY_TABLE);
				await context.runQuery(
					`INSERT INTO ${table} ("category", "action", "projectId", "createdAt")
					 VALUES (:category, :action, :projectId, :createdAt)`,
					{ category: 'workflow', action: 'saved', projectId: null, createdAt: new Date() },
				);
			}),
		).rejects.toThrow();
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
