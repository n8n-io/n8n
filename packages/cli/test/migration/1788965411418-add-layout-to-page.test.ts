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

const MIGRATION_NAME = 'AddLayoutToPage1788965411418';
const PAGE_TABLE = 'page';

describe('AddLayoutToPage migration', () => {
	let dataSource: DataSource;
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
		await withContext(async (context) => {
			const projectId = await insertProject(context);
			appId = await insertApp(context, projectId);
		});
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertProject(context: TestMigrationContext) {
		const table = context.escape.tableName('project');
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
		return id;
	}

	async function insertApp(context: TestMigrationContext, projectId: string) {
		const table = context.escape.tableName('app');
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "namespace", "projectId", "createdAt", "updatedAt")
			 VALUES (:id, :name, :namespace, :projectId, :createdAt, :updatedAt)`,
			{ id, name: 'My App', namespace: 'my-app', projectId, createdAt: now, updatedAt: now },
		);
		return id;
	}

	async function insertPage(
		context: TestMigrationContext,
		route: string,
		parentPageId: string | null = null,
	) {
		const table = context.escape.tableName(PAGE_TABLE);
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "appId", "parentPageId", "route", "createdAt", "updatedAt")
			 VALUES (:id, :appId, :parentPageId, :route, :createdAt, :updatedAt)`,
			{ id, appId, parentPageId, route, createdAt: now, updatedAt: now },
		);
		return id;
	}

	async function selectPages<T>(context: TestMigrationContext, columns: string) {
		const table = context.escape.tableName(PAGE_TABLE);
		return await context.runQuery<T[]>(`SELECT ${columns} FROM ${table} ORDER BY "route"`);
	}

	/** Column presence via the catalog: on SQLite a quoted unknown column is a string literal, not an error. */
	async function hasColumn(context: TestMigrationContext, column: string) {
		if (context.isSqlite) {
			const rows: Array<{ name: string }> = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(PAGE_TABLE)})`,
			);
			return rows.some((row) => row.name === column);
		}
		const rows: Array<{ column_name: string }> = await context.queryRunner.query(
			'SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}${PAGE_TABLE}`, column],
		);
		return rows.length > 0;
	}

	it('adds a nullable layout column that existing pages read as null', async () => {
		await withContext(async (context) => await insertPage(context, 'home'));

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const rows = await selectPages<{ layout: unknown }>(context, '"layout"');
			expect(rows).toEqual([{ layout: null }]);
		});
	});

	it('keeps child pages of existing pages', async () => {
		const childId = await withContext(async (context) => {
			const parentId = await insertPage(context, 'clients');
			return await insertPage(context, 'orders', parentId);
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const rows = await selectPages<{ id: string }>(context, '"id"');
			expect(rows).toEqual([{ id: expect.any(String) }, { id: childId }]);
		});
	});

	it('stores a JSON layout', async () => {
		const pageId = await withContext(async (context) => await insertPage(context, 'home'));
		const layout = JSON.stringify([{ id: 's', type: 'slot', data: {} }]);

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const table = context.escape.tableName(PAGE_TABLE);
			await context.runQuery(`UPDATE ${table} SET "layout" = :layout WHERE "id" = :id`, {
				layout,
				id: pageId,
			});
			const [row] = await selectPages<{ layout: unknown }>(context, '"layout"');
			const stored = typeof row.layout === 'string' ? JSON.parse(row.layout) : row.layout;
			expect(stored).toEqual([{ id: 's', type: 'slot', data: {} }]);
		});
	});

	it('drops the column on revert and keeps the pages', async () => {
		await withContext(async (context) => await insertPage(context, 'home'));
		await runSingleMigration(MIGRATION_NAME);

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await hasColumn(context, 'layout')).toBe(false);
			expect(await selectPages(context, '"id"')).toHaveLength(1);
		});
	});
});
