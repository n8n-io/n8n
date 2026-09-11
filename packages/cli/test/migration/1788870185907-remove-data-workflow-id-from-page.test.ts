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

const MIGRATION_NAME = 'RemoveDataWorkflowIdFromPage1788870185907';
const APP_TABLE = 'app';
const PAGE_TABLE = 'page';

describe('RemoveDataWorkflowIdFromPage migration', () => {
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
		dataSource = Container.get(DataSource);
		projectId = randomUUID();
		await withContext(async (context) => {
			await insertProject(context, projectId);
			appId = await insertApp(context, 'my-app');
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

	async function insertApp(context: TestMigrationContext, namespace: string) {
		const table = context.escape.tableName(APP_TABLE);
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "namespace", "projectId", "createdAt", "updatedAt")
			 VALUES (:id, :name, :namespace, :projectId, :createdAt, :updatedAt)`,
			{ id, name: 'My App', namespace, projectId, createdAt: now, updatedAt: now },
		);
		return id;
	}

	async function insertPage(
		context: TestMigrationContext,
		entry: { route: string; dataWorkflowId?: string | null },
	) {
		const table = context.escape.tableName(PAGE_TABLE);
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "appId", "route", "dataWorkflowId", "createdAt", "updatedAt")
			 VALUES (:id, :appId, :route, :dataWorkflowId, :createdAt, :updatedAt)`,
			{
				id,
				appId,
				route: entry.route,
				dataWorkflowId: entry.dataWorkflowId ?? null,
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	/** Column presence via the catalog: on SQLite a quoted unknown column is a string literal, not an error. */
	async function hasColumn(context: TestMigrationContext, table: string, column: string) {
		if (context.isSqlite) {
			const rows: Array<{ name: string }> = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(table)})`,
			);
			return rows.some((row) => row.name === column);
		}
		const rows: Array<{ column_name: string }> = await context.queryRunner.query(
			'SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}${table}`, column],
		);
		return rows.length > 0;
	}

	it('keeps existing pages, dropping only the column', async () => {
		const pageId = await withContext(
			async (context) => await insertPage(context, { route: 'home' }),
		);

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const table = context.escape.tableName(PAGE_TABLE);
			const rows = await context.runQuery<Array<{ id: string; route: string }>>(
				`SELECT "id", "route" FROM ${table}`,
			);
			expect(rows).toEqual([{ id: pageId, route: 'home' }]);
		});
	});

	it('drops the column', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			expect(await hasColumn(context, PAGE_TABLE, 'dataWorkflowId')).toBe(false);
		});
	});

	it('re-adds a nullable dataWorkflowId column on revert', async () => {
		const pageId = await withContext(
			async (context) => await insertPage(context, { route: 'home' }),
		);

		await runSingleMigration(MIGRATION_NAME);
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const table = context.escape.tableName(PAGE_TABLE);
			const [row] = await context.runQuery<Array<{ dataWorkflowId: string | null }>>(
				`SELECT "dataWorkflowId" FROM ${table} WHERE "id" = :id`,
				{ id: pageId },
			);
			expect(row.dataWorkflowId).toBeNull();
		});
	});
});
