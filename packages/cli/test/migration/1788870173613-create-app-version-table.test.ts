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

const MIGRATION_NAME = 'CreateAppVersionTable1788870173613';
const APP_TABLE = 'app';
const APP_VERSION_TABLE = 'app_version';

describe('CreateAppVersionTable migration', () => {
	let dataSource: DataSource;
	let projectId: string;
	let userId: string;

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
		userId = randomUUID();
		await withContext(async (context) => {
			await insertProject(context, projectId);
			await insertUser(context, userId);
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

	async function insertAppVersion(
		context: TestMigrationContext,
		entry: { appId: string; createdById?: string | null },
	) {
		const table = context.escape.tableName(APP_VERSION_TABLE);
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "appId", "snapshot", "createdById", "createdAt", "updatedAt")
			 VALUES (:id, :appId, :snapshot, :createdById, :createdAt, :updatedAt)`,
			{
				id,
				appId: entry.appId,
				snapshot: JSON.stringify({ pages: [], theme: null }),
				createdById: entry.createdById ?? null,
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	async function getActiveVersionId(context: TestMigrationContext, appId: string) {
		const table = context.escape.tableName(APP_TABLE);
		const [row] = await context.runQuery<Array<{ activeVersionId: string | null }>>(
			`SELECT "activeVersionId" FROM ${table} WHERE "id" = :id`,
			{ id: appId },
		);
		return row.activeVersionId;
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

	it('creates a version for an app and activates it', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const appId = await insertApp(context, 'my-app');
			const versionId = await insertAppVersion(context, { appId, createdById: userId });

			const table = context.escape.tableName(APP_TABLE);
			await context.runQuery(
				`UPDATE ${table} SET "activeVersionId" = :versionId WHERE "id" = :id`,
				{
					versionId,
					id: appId,
				},
			);

			expect(await getActiveVersionId(context, appId)).toBe(versionId);
		});
	});

	it("deletes an app's versions when the app is deleted", async () => {
		await runSingleMigration(MIGRATION_NAME);

		const remaining = await withContext(async (context) => {
			const appId = await insertApp(context, 'my-app');
			await insertAppVersion(context, { appId });

			const table = context.escape.tableName(APP_TABLE);
			await context.runQuery(`DELETE FROM ${table} WHERE "id" = :id`, { id: appId });

			const versionTable = context.escape.tableName(APP_VERSION_TABLE);
			return await context.runQuery<Array<{ id: string }>>(`SELECT "id" FROM ${versionTable}`);
		});

		expect(remaining).toHaveLength(0);
	});

	it('sets activeVersionId to null when the active version is deleted', async () => {
		await runSingleMigration(MIGRATION_NAME);

		const activeVersionId = await withContext(async (context) => {
			const appId = await insertApp(context, 'my-app');
			const versionId = await insertAppVersion(context, { appId });

			const appTable = context.escape.tableName(APP_TABLE);
			await context.runQuery(
				`UPDATE ${appTable} SET "activeVersionId" = :versionId WHERE "id" = :id`,
				{
					versionId,
					id: appId,
				},
			);

			const versionTable = context.escape.tableName(APP_VERSION_TABLE);
			await context.runQuery(`DELETE FROM ${versionTable} WHERE "id" = :id`, { id: versionId });

			return await getActiveVersionId(context, appId);
		});

		expect(activeVersionId).toBeNull();
	});

	it('sets createdById to null when the publishing user is deleted', async () => {
		await runSingleMigration(MIGRATION_NAME);

		const createdById = await withContext(async (context) => {
			const appId = await insertApp(context, 'my-app');
			const versionId = await insertAppVersion(context, { appId, createdById: userId });

			const userTable = context.escape.tableName('user');
			await context.runQuery(`DELETE FROM ${userTable} WHERE "id" = :id`, { id: userId });

			const versionTable = context.escape.tableName(APP_VERSION_TABLE);
			const [row] = await context.runQuery<Array<{ createdById: string | null }>>(
				`SELECT "createdById" FROM ${versionTable} WHERE "id" = :id`,
				{ id: versionId },
			);
			return row.createdById;
		});

		expect(createdById).toBeNull();
	});

	it('drops the app_version table and the activeVersionId column on revert', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const versionTable = context.escape.tableName(APP_VERSION_TABLE);
			await expect(context.runQuery(`SELECT 1 FROM ${versionTable}`)).rejects.toThrow();
			expect(await hasColumn(context, APP_TABLE, 'activeVersionId')).toBe(false);
		});
	});
});
