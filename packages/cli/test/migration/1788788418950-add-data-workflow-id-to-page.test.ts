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

const MIGRATION_NAME = 'AddDataWorkflowIdToPage1788788418950';
const PAGE_TABLE = 'page';

describe('AddDataWorkflowIdToPage migration', () => {
	let dataSource: DataSource;
	let projectId: string;
	let appId: string;

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
		await withContext(async (context) => {
			await insertProject(context, projectId);
			appId = await insertApp(context, projectId);
		});
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

	async function insertApp(context: TestMigrationContext, ownerProjectId: string) {
		const table = context.escape.tableName('app');
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "namespace", "projectId", "createdAt", "updatedAt")
			 VALUES (:id, :name, :namespace, :projectId, :createdAt, :updatedAt)`,
			{
				id,
				name: 'My App',
				namespace: 'my-app',
				projectId: ownerProjectId,
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	async function insertPage(
		context: TestMigrationContext,
		entry: { ownerAppId: string; route: string; dataWorkflowId?: string | null },
	) {
		const table = context.escape.tableName(PAGE_TABLE);
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "appId", "route", "dataWorkflowId", "createdAt", "updatedAt")
			 VALUES (:id, :appId, :route, :dataWorkflowId, :createdAt, :updatedAt)`,
			{
				id,
				appId: entry.ownerAppId,
				route: entry.route,
				dataWorkflowId: entry.dataWorkflowId ?? null,
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	async function insertWorkflow(context: TestMigrationContext) {
		const table = context.escape.tableName('workflow_entity');
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "triggerCount", "versionId")
			 VALUES (:id, :name, :active, :nodes, :connections, :createdAt, :updatedAt, :triggerCount, :versionId)`,
			{
				id,
				name: 'My Workflow',
				active: false,
				nodes: '[]',
				connections: '{}',
				createdAt: now,
				updatedAt: now,
				triggerCount: 0,
				versionId: randomUUID(),
			},
		);
		return id;
	}

	async function getDataWorkflowId(
		context: TestMigrationContext,
		pageId: string,
	): Promise<string | null> {
		const table = context.escape.tableName(PAGE_TABLE);
		const rows = await context.runQuery<Array<{ dataWorkflowId: string | null }>>(
			`SELECT "dataWorkflowId" FROM ${table} WHERE "id" = :id`,
			{ id: pageId },
		);
		return rows[0].dataWorkflowId;
	}

	it('adds a nullable dataWorkflowId column', async () => {
		const pageId = await withContext(
			async (context) => await insertPage(context, { ownerAppId: appId, route: 'home' }),
		);

		const dataWorkflowId = await withContext(
			async (context) => await getDataWorkflowId(context, pageId),
		);
		expect(dataWorkflowId).toBeNull();
	});

	it('links a page to a workflow', async () => {
		const { pageId, workflowId } = await withContext(async (context) => {
			const workflowId = await insertWorkflow(context);
			const pageId = await insertPage(context, {
				ownerAppId: appId,
				route: 'home',
				dataWorkflowId: workflowId,
			});
			return { pageId, workflowId };
		});

		const dataWorkflowId = await withContext(
			async (context) => await getDataWorkflowId(context, pageId),
		);
		expect(dataWorkflowId).toBe(workflowId);
	});

	it('clears dataWorkflowId when the referenced workflow is deleted', async () => {
		const pageId = await withContext(async (context) => {
			const workflowId = await insertWorkflow(context);
			const pageId = await insertPage(context, {
				ownerAppId: appId,
				route: 'home',
				dataWorkflowId: workflowId,
			});

			const table = context.escape.tableName('workflow_entity');
			await context.runQuery(`DELETE FROM ${table} WHERE "id" = :id`, { id: workflowId });

			return pageId;
		});

		const dataWorkflowId = await withContext(
			async (context) => await getDataWorkflowId(context, pageId),
		);
		expect(dataWorkflowId).toBeNull();
	});

	it('drops the column on revert', async () => {
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const table = await context.queryRunner.getTable(`${context.tablePrefix}${PAGE_TABLE}`);
			expect(table?.findColumnByName('dataWorkflowId')).toBeUndefined();
		});
	});
});
