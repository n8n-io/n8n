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

const MIGRATION_NAME = 'AddComponentsToApp1789030187576';
const APP_TABLE = 'app';
const PAGE_TABLE = 'page';

describe('AddComponentsToApp migration', () => {
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
		const table = context.escape.tableName(APP_TABLE);
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "namespace", "projectId", "createdAt", "updatedAt")
			 VALUES (:id, :name, :namespace, :projectId, :createdAt, :updatedAt)`,
			{ id, name: 'My App', namespace: 'my-app', projectId, createdAt: now, updatedAt: now },
		);
		return id;
	}

	async function insertPage(context: TestMigrationContext, route: string) {
		const table = context.escape.tableName(PAGE_TABLE);
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "appId", "route", "createdAt", "updatedAt")
			 VALUES (:id, :appId, :route, :createdAt, :updatedAt)`,
			{ id, appId, route, createdAt: now, updatedAt: now },
		);
		return id;
	}

	async function getComponents(context: TestMigrationContext) {
		const table = context.escape.tableName(APP_TABLE);
		const [row] = await context.runQuery<Array<{ components: string | null }>>(
			`SELECT "components" FROM ${table} WHERE "id" = :id`,
			{ id: appId },
		);
		return row.components;
	}

	/** Column presence via the catalog: on SQLite a quoted unknown column is a string literal, not an error. */
	async function hasColumn(context: TestMigrationContext, column: string) {
		if (context.isSqlite) {
			const rows: Array<{ name: string }> = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(APP_TABLE)})`,
			);
			return rows.some((row) => row.name === column);
		}
		const rows: Array<{ column_name: string }> = await context.queryRunner.query(
			'SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}${APP_TABLE}`, column],
		);
		return rows.length > 0;
	}

	it('adds a nullable components column that existing apps read as null', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			expect(await getComponents(context)).toBeNull();
		});
	});

	it('keeps the pages of existing apps', async () => {
		const pageId = await withContext(async (context) => await insertPage(context, 'home'));

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const table = context.escape.tableName(PAGE_TABLE);
			const rows = await context.runQuery<Array<{ id: string }>>(`SELECT "id" FROM ${table}`);
			expect(rows).toEqual([{ id: pageId }]);
		});
	});

	it('stores a components source', async () => {
		await runSingleMigration(MIGRATION_NAME);
		const source = 'export const Card = (props) => <div class="app-card">{props.children}</div>;';

		await withContext(async (context) => {
			const table = context.escape.tableName(APP_TABLE);
			await context.runQuery(`UPDATE ${table} SET "components" = :source WHERE "id" = :id`, {
				source,
				id: appId,
			});
			expect(await getComponents(context)).toBe(source);
		});
	});

	it('drops the column on revert', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await hasColumn(context, 'components')).toBe(false);
		});
	});
});
