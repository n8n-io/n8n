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

const MIGRATION_NAME = 'MakeAppNamespaceGloballyUnique1788786749129';
const APP_TABLE = 'app';

// Fixtures are inline and raw-SQL rather than shared with the CreateAppTables
// test: each migration test inserts rows in the schema as it stood at its own
// point in history, so a shared helper would break the older test as soon as a
// later migration changes the table.
describe('MakeAppNamespaceGloballyUnique migration', () => {
	let dataSource: DataSource;
	let projectId: string;
	let otherProjectId: string;

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
		otherProjectId = randomUUID();
		await withContext(async (context) => {
			await insertProject(context, projectId);
			await insertProject(context, otherProjectId);
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

	async function insertApp(
		context: TestMigrationContext,
		entry: { namespace: string; projectId: string },
	) {
		const table = context.escape.tableName(APP_TABLE);
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "namespace", "projectId", "createdAt", "updatedAt")
			 VALUES (:id, :name, :namespace, :projectId, :createdAt, :updatedAt)`,
			{
				id: randomUUID(),
				name: 'My App',
				namespace: entry.namespace,
				projectId: entry.projectId,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	it('rejects the same namespace in two projects', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await expect(
			withContext(async (context) => {
				await insertApp(context, { namespace: 'shared', projectId });
				await insertApp(context, { namespace: 'shared', projectId: otherProjectId });
			}),
		).rejects.toThrow();
	});

	it('still allows different namespaces in the same project', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			await insertApp(context, { namespace: 'one', projectId });
			await insertApp(context, { namespace: 'two', projectId });
		});
	});

	it('keeps existing apps', async () => {
		await withContext(
			async (context) => await insertApp(context, { namespace: 'kept', projectId }),
		);

		await runSingleMigration(MIGRATION_NAME);

		const namespaces = await withContext(async (context) => {
			const table = context.escape.tableName(APP_TABLE);
			const rows = await context.runQuery<Array<{ namespace: string }>>(
				`SELECT "namespace" FROM ${table}`,
			);
			return rows.map((row) => row.namespace);
		});

		expect(namespaces).toEqual(['kept']);
	});

	it('allows the same namespace across projects again once reverted', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await undoLastSingleMigration();

		await withContext(async (context) => {
			await insertApp(context, { namespace: 'shared', projectId });
			await insertApp(context, { namespace: 'shared', projectId: otherProjectId });
		});
	});
});
