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

const MIGRATION_NAME = 'CreateAppTables1788774977417';
const APP_TABLE = 'app';
const PAGE_TABLE = 'page';

describe('CreateAppTables migration', () => {
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
		projectId = randomUUID();
		await withContext(async (context) => await insertProject(context, projectId));
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertProject(context: TestMigrationContext, id: string) {
		const table = context.escape.tableName('project');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
	}

	async function insertApp(
		context: TestMigrationContext,
		entry: { id?: string; namespace: string; projectId?: string },
	) {
		const table = context.escape.tableName(APP_TABLE);
		const now = new Date();
		const id = entry.id ?? randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "namespace", "projectId", "createdAt", "updatedAt")
			 VALUES (:id, :name, :namespace, :projectId, :createdAt, :updatedAt)`,
			{
				id,
				name: 'My App',
				namespace: entry.namespace,
				projectId: entry.projectId ?? projectId,
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	async function insertPage(
		context: TestMigrationContext,
		entry: { id?: string; appId: string; parentPageId?: string | null; route: string },
	) {
		const table = context.escape.tableName(PAGE_TABLE);
		const now = new Date();
		const id = entry.id ?? randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "appId", "parentPageId", "route", "createdAt", "updatedAt")
			 VALUES (:id, :appId, :parentPageId, :route, :createdAt, :updatedAt)`,
			{
				id,
				appId: entry.appId,
				parentPageId: entry.parentPageId ?? null,
				route: entry.route,
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	async function getPageIds(context: TestMigrationContext): Promise<string[]> {
		const table = context.escape.tableName(PAGE_TABLE);
		const rows = await context.runQuery<Array<{ id: string }>>(`SELECT "id" FROM ${table}`);
		return rows.map((row) => row.id);
	}

	it('creates an app and a page under it', async () => {
		const pageId = await withContext(async (context) => {
			const appId = await insertApp(context, { namespace: 'my-app' });
			return await insertPage(context, { appId, route: 'home' });
		});

		expect(pageId).toBeTruthy();
	});

	it('rejects a second app with the same namespace in the same project', async () => {
		await expect(
			withContext(async (context) => {
				await insertApp(context, { namespace: 'dup' });
				await insertApp(context, { namespace: 'dup' });
			}),
		).rejects.toThrow();
	});

	it('allows the same namespace across two different projects', async () => {
		const otherProjectId = randomUUID();
		await withContext(async (context) => {
			await insertProject(context, otherProjectId);
			await insertApp(context, { namespace: 'shared-name' });
			await insertApp(context, { namespace: 'shared-name', projectId: otherProjectId });
		});
	});

	it("deletes an app's pages when the app is deleted", async () => {
		const remaining = await withContext(async (context) => {
			const appId = await insertApp(context, { namespace: 'my-app' });
			await insertPage(context, { appId, route: 'home' });

			const table = context.escape.tableName(APP_TABLE);
			await context.runQuery(`DELETE FROM ${table} WHERE "id" = :id`, { id: appId });

			return await getPageIds(context);
		});

		expect(remaining).toHaveLength(0);
	});

	it("deletes an app's pages when the owning project is deleted", async () => {
		const remaining = await withContext(async (context) => {
			const appId = await insertApp(context, { namespace: 'my-app' });
			await insertPage(context, { appId, route: 'home' });

			const table = context.escape.tableName('project');
			await context.runQuery(`DELETE FROM ${table} WHERE "id" = :id`, { id: projectId });

			return await getPageIds(context);
		});

		expect(remaining).toHaveLength(0);
	});

	it('deletes a child page when its parent page is deleted', async () => {
		const remaining = await withContext(async (context) => {
			const appId = await insertApp(context, { namespace: 'my-app' });
			const parentId = await insertPage(context, { appId, route: 'parent' });
			await insertPage(context, { appId, parentPageId: parentId, route: 'child' });

			const table = context.escape.tableName(PAGE_TABLE);
			await context.runQuery(`DELETE FROM ${table} WHERE "id" = :id`, { id: parentId });

			return await getPageIds(context);
		});

		expect(remaining).toHaveLength(0);
	});

	it('drops both tables on revert', async () => {
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const appTable = context.escape.tableName(APP_TABLE);
			const pageTable = context.escape.tableName(PAGE_TABLE);
			await expect(context.runQuery(`SELECT 1 FROM ${appTable}`)).rejects.toThrow();
			await expect(context.runQuery(`SELECT 1 FROM ${pageTable}`)).rejects.toThrow();
		});
	});
});
