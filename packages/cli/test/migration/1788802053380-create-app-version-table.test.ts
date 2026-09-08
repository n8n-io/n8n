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

const MIGRATION_NAME = 'CreateAppVersionTable1788802053380';
const APP_TABLE = 'app';
const APP_VERSION_TABLE = 'app_version';
const BINARY_DATA_TABLE = 'binary_data';

describe('CreateAppVersionTable migration', () => {
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
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		await withContext(async (context) => {
			const projectId = randomUUID();
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

	async function insertVersion(
		context: TestMigrationContext,
		entry: { ownerAppId: string; storedAt?: string; distStorageKey?: string | null },
	) {
		const table = context.escape.tableName(APP_VERSION_TABLE);
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "appId", "storedAt", "sourceStorageKey", "distStorageKey", "createdAt", "updatedAt")
			 VALUES (:id, :appId, :storedAt, :sourceStorageKey, :distStorageKey, :createdAt, :updatedAt)`,
			{
				id,
				appId: entry.ownerAppId,
				storedAt: entry.storedAt ?? 'fs',
				sourceStorageKey: `apps/${entry.ownerAppId}/versions/${id}/source.tgz`,
				distStorageKey: entry.distStorageKey ?? null,
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	async function insertBinaryData(context: TestMigrationContext, sourceType: string) {
		const table = context.escape.tableName(BINARY_DATA_TABLE);
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("fileId", "sourceType", "sourceId", "data", "mimeType", "fileName", "fileSize", "createdAt", "updatedAt")
			 VALUES (:fileId, :sourceType, :sourceId, :data, :mimeType, :fileName, :fileSize, :createdAt, :updatedAt)`,
			{
				fileId: randomUUID(),
				sourceType,
				sourceId: 'v1',
				data: Buffer.from('x'),
				mimeType: null,
				fileName: null,
				fileSize: 1,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function getVersionIds(context: TestMigrationContext): Promise<string[]> {
		const table = context.escape.tableName(APP_VERSION_TABLE);
		const rows = await context.runQuery<Array<{ id: string }>>(`SELECT "id" FROM ${table}`);
		return rows.map((row) => row.id);
	}

	it('creates a version with a nullable distStorageKey', async () => {
		const id = await withContext(
			async (context) => await insertVersion(context, { ownerAppId: appId }),
		);

		expect(id).toBeTruthy();
	});

	it('rejects a storedAt outside the known storage modes', async () => {
		await expect(
			withContext(
				async (context) => await insertVersion(context, { ownerAppId: appId, storedAt: 'gcs' }),
			),
		).rejects.toThrow();
	});

	it("deletes an app's versions when the app is deleted", async () => {
		const remaining = await withContext(async (context) => {
			await insertVersion(context, { ownerAppId: appId });

			const table = context.escape.tableName(APP_TABLE);
			await context.runQuery(`DELETE FROM ${table} WHERE "id" = :id`, { id: appId });

			return await getVersionIds(context);
		});

		expect(remaining).toHaveLength(0);
	});

	it('rejects an activeVersionId that is not a version', async () => {
		await expect(
			withContext(async (context) => {
				const table = context.escape.tableName(APP_TABLE);
				await context.runQuery(`UPDATE ${table} SET "activeVersionId" = :v WHERE "id" = :id`, {
					v: 'not-a-version',
					id: appId,
				});
			}),
		).rejects.toThrow();
	});

	it('clears activeVersionId when the active version is deleted', async () => {
		const activeVersionId = await withContext(async (context) => {
			const versionId = await insertVersion(context, { ownerAppId: appId });
			const appTable = context.escape.tableName(APP_TABLE);
			await context.runQuery(`UPDATE ${appTable} SET "activeVersionId" = :v WHERE "id" = :id`, {
				v: versionId,
				id: appId,
			});

			const versionTable = context.escape.tableName(APP_VERSION_TABLE);
			await context.runQuery(`DELETE FROM ${versionTable} WHERE "id" = :id`, { id: versionId });

			const rows = await context.runQuery<Array<{ activeVersionId: string | null }>>(
				`SELECT "activeVersionId" FROM ${appTable} WHERE "id" = :id`,
				{ id: appId },
			);
			return rows[0].activeVersionId;
		});

		expect(activeVersionId).toBeNull();
	});

	it('accepts app_version as a binary_data sourceType', async () => {
		await withContext(async (context) => await insertBinaryData(context, 'app_version'));
	});

	it('restores the previous schema on revert', async () => {
		await withContext(async (context) => await insertBinaryData(context, 'app_version'));

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const versionTable = context.escape.tableName(APP_VERSION_TABLE);
			await expect(context.runQuery(`SELECT 1 FROM ${versionTable}`)).rejects.toThrow();

			const appTable = await context.queryRunner.getTable(`${context.tablePrefix}${APP_TABLE}`);
			expect(appTable?.findColumnByName('activeVersionId')).toBeUndefined();

			const binaryTable = context.escape.tableName(BINARY_DATA_TABLE);
			const rows = await context.runQuery<Array<{ count: number }>>(
				`SELECT COUNT(*) AS "count" FROM ${binaryTable}`,
			);
			expect(Number(rows[0].count)).toBe(0);
			await expect(insertBinaryData(context, 'app_version')).rejects.toThrow();
		});
	});
});
