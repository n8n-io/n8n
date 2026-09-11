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

const MIGRATION_NAME = 'AddTitleToPage1789042652437';
const PAGE_TABLE = 'page';

describe('AddTitleToPage migration', () => {
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

	it('adds a nullable title column that existing pages read as null', async () => {
		await withContext(async (context) => await insertPage(context, 'home'));

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const rows = await selectPages<{ title: unknown }>(context, '"title"');
			expect(rows).toEqual([{ title: null }]);
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

	it('stores a title', async () => {
		const pageId = await withContext(async (context) => await insertPage(context, 'home'));

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const table = context.escape.tableName(PAGE_TABLE);
			await context.runQuery(`UPDATE ${table} SET "title" = :title WHERE "id" = :id`, {
				title: 'Overview',
				id: pageId,
			});
			const rows = await selectPages<{ title: unknown }>(context, '"title"');
			expect(rows).toEqual([{ title: 'Overview' }]);
		});
	});

	it('drops the column on revert and keeps the pages', async () => {
		await withContext(async (context) => await insertPage(context, 'home'));
		await runSingleMigration(MIGRATION_NAME);

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await hasColumn(context, 'title')).toBe(false);
			expect(await selectPages(context, '"id"')).toHaveLength(1);
		});
	});
});
