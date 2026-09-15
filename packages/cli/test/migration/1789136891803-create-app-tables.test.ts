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

const MIGRATION_NAME = 'CreateAppTables1789136891803';
const APP_TABLE = 'app';
const APP_VERSION_TABLE = 'app_version';
const THREAD_TABLE = 'instance_ai_threads';
const BINARY_DATA_TABLE = 'binary_data';

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
		entry: { namespace: string; projectId?: string },
	) {
		const table = context.escape.tableName(APP_TABLE);
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "namespace", "projectId", "bindings", "createdAt", "updatedAt")
			 VALUES (:id, :name, :namespace, :projectId, :bindings, :createdAt, :updatedAt)`,
			{
				id,
				name: 'My App',
				namespace: entry.namespace,
				projectId: entry.projectId ?? projectId,
				bindings: '[]',
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	async function insertVersion(
		context: TestMigrationContext,
		entry: { appId: string; storedAt?: string },
	) {
		const table = context.escape.tableName(APP_VERSION_TABLE);
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "appId", "storedAt", "sourceStorageKey", "sourceSizeBytes", "createdAt", "updatedAt")
			 VALUES (:id, :appId, :storedAt, :sourceStorageKey, :sourceSizeBytes, :createdAt, :updatedAt)`,
			{
				id,
				appId: entry.appId,
				storedAt: entry.storedAt ?? 'fs',
				sourceStorageKey: `apps/${entry.appId}/versions/${id}/source.tgz`,
				sourceSizeBytes: 1,
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	async function insertThread(context: TestMigrationContext, appId: string) {
		const table = context.escape.tableName(THREAD_TABLE);
		const now = new Date();
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "resourceId", "title", "projectId", "appId", "createdAt", "updatedAt")
			 VALUES (:id, :resourceId, :title, :projectId, :appId, :createdAt, :updatedAt)`,
			{ id, resourceId: 'user-1', title: '', projectId, appId, createdAt: now, updatedAt: now },
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

	async function selectOne<T>(context: TestMigrationContext, sql: string, params: object) {
		const rows = await context.runQuery<T[]>(sql, params);
		return rows[0];
	}

	it('rejects the same namespace across projects', async () => {
		const otherProjectId = randomUUID();
		await expect(
			withContext(async (context) => {
				await insertProject(context, otherProjectId);
				await insertApp(context, { namespace: 'dup' });
				await insertApp(context, { namespace: 'dup', projectId: otherProjectId });
			}),
		).rejects.toThrow();
	});

	it('deletes an app when its project is deleted', async () => {
		const remaining = await withContext(async (context) => {
			const appId = await insertApp(context, { namespace: 'my-app' });
			const project = context.escape.tableName('project');
			await context.runQuery(`DELETE FROM ${project} WHERE "id" = :id`, { id: projectId });
			const app = context.escape.tableName(APP_TABLE);
			return await context.runQuery<unknown[]>(`SELECT 1 FROM ${app} WHERE "id" = :id`, {
				id: appId,
			});
		});

		expect(remaining).toHaveLength(0);
	});

	it('rejects a storedAt outside the known storage modes', async () => {
		await expect(
			withContext(async (context) => {
				const appId = await insertApp(context, { namespace: 'my-app' });
				await insertVersion(context, { appId, storedAt: 'gcs' });
			}),
		).rejects.toThrow();
	});

	it("deletes an app's versions when the app is deleted", async () => {
		const remaining = await withContext(async (context) => {
			const appId = await insertApp(context, { namespace: 'my-app' });
			await insertVersion(context, { appId });
			const app = context.escape.tableName(APP_TABLE);
			await context.runQuery(`DELETE FROM ${app} WHERE "id" = :id`, { id: appId });
			const version = context.escape.tableName(APP_VERSION_TABLE);
			return await context.runQuery<unknown[]>(`SELECT 1 FROM ${version}`);
		});

		expect(remaining).toHaveLength(0);
	});

	it('clears activeVersionId when the active version is deleted', async () => {
		const row = await withContext(async (context) => {
			const appId = await insertApp(context, { namespace: 'my-app' });
			const versionId = await insertVersion(context, { appId });
			const app = context.escape.tableName(APP_TABLE);
			await context.runQuery(`UPDATE ${app} SET "activeVersionId" = :v WHERE "id" = :id`, {
				v: versionId,
				id: appId,
			});
			const version = context.escape.tableName(APP_VERSION_TABLE);
			await context.runQuery(`DELETE FROM ${version} WHERE "id" = :id`, { id: versionId });
			return await selectOne<{ activeVersionId: string | null }>(
				context,
				`SELECT "activeVersionId" FROM ${app} WHERE "id" = :id`,
				{ id: appId },
			);
		});

		expect(row.activeVersionId).toBeNull();
	});

	it('unlinks a thread when its app is deleted', async () => {
		const row = await withContext(async (context) => {
			const appId = await insertApp(context, { namespace: 'my-app' });
			const threadId = await insertThread(context, appId);
			const app = context.escape.tableName(APP_TABLE);
			await context.runQuery(`DELETE FROM ${app} WHERE "id" = :id`, { id: appId });
			const thread = context.escape.tableName(THREAD_TABLE);
			return await selectOne<{ appId: string | null }>(
				context,
				`SELECT "appId" FROM ${thread} WHERE "id" = :id`,
				{ id: threadId },
			);
		});

		expect(row.appId).toBeNull();
	});

	it('accepts app_version as a binary_data sourceType', async () => {
		await withContext(async (context) => await insertBinaryData(context, 'app_version'));
	});

	it('restores the previous schema on revert', async () => {
		await withContext(async (context) => await insertBinaryData(context, 'app_version'));

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			for (const name of [APP_TABLE, APP_VERSION_TABLE]) {
				const table = context.escape.tableName(name);
				await expect(context.runQuery(`SELECT 1 FROM ${table}`)).rejects.toThrow();
			}

			const thread = await context.queryRunner.getTable(`${context.tablePrefix}${THREAD_TABLE}`);
			expect(thread?.findColumnByName('appId')).toBeUndefined();

			const binary = context.escape.tableName(BINARY_DATA_TABLE);
			const count = await selectOne<{ count: number }>(
				context,
				`SELECT COUNT(*) AS "count" FROM ${binary}`,
				{},
			);
			expect(Number(count.count)).toBe(0);
			await expect(insertBinaryData(context, 'app_version')).rejects.toThrow();
		});
	});
});
