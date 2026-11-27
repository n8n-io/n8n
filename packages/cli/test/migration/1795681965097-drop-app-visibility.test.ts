import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const migrationName = 'DropAppVisibility1795681965097';

type Row = Record<string, string | number | null>;

describe('DropAppVisibility migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	let projectId: string;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		const initial = createTestMigrationContext(dataSource);
		try {
			await initial.queryRunner.clearDatabase();
		} finally {
			await initial.queryRunner.release();
		}
		await initDbUpToMigration(migrationName);
		context = createTestMigrationContext(dataSource);
		projectId = randomUUID();
		await insertRow('project', { id: projectId, name: 'Sales', type: 'team' });
	});

	afterEach(async () => {
		await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	/** Releases the test connection while the migration runs: SQLite would wait on it. */
	async function migrate() {
		await context.queryRunner.release();
		await runSingleMigration(migrationName);
		context = createTestMigrationContext(dataSource);
	}

	async function revert() {
		await context.queryRunner.release();
		await undoLastSingleMigration();
		context = createTestMigrationContext(dataSource);
	}

	const column = (name: string) => context.escape.columnName(name);

	async function insertRow(tableName: string, values: Row) {
		const names = Object.keys(values);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(tableName)} (${names.map(column).join(', ')})
			 VALUES (${names.map((name) => `:${name}`).join(', ')})`,
			values,
		);
	}

	async function insertApp(namespace: string, visibility: string) {
		const id = randomUUID();
		await insertRow('app', { id, name: namespace, namespace, visibility, projectId });
		return id;
	}

	async function insertVersion(appId: string) {
		await insertRow('app_artifact', {
			id: 1,
			appId,
			storedAt: 'db',
			storageKey: 'source',
			sizeBytes: 1,
		});
		const id = randomUUID();
		await insertRow('app_version', { id, appId, sourceArtifactId: 1 });
		return id;
	}

	async function versionIds() {
		const rows = await context.runQuery<Array<{ id: string }>>(
			`SELECT ${column('id')} AS id FROM ${context.escape.tableName('app_version')}`,
		);
		return rows.map((row) => row.id);
	}

	async function appRows() {
		return await context.runQuery<Row[]>(
			`SELECT * FROM ${context.escape.tableName('app')} ORDER BY ${column('namespace')}`,
		);
	}

	it('drops the visibility column and keeps the apps', async () => {
		const instanceApp = await insertApp('wiki', 'instance');
		const projectApp = await insertApp('crm', 'project');

		await migrate();

		const rows = await appRows();
		expect(rows.map((row) => row.id)).toEqual([projectApp, instanceApp]);
		for (const row of rows) expect(row).not.toHaveProperty('visibility');
	});

	it('keeps the versions of the apps', async () => {
		const versionId = await insertVersion(await insertApp('sales', 'instance'));

		await migrate();

		expect(await versionIds()).toEqual([versionId]);
	});

	it('restores the visibility column as project on revert', async () => {
		const instanceApp = await insertApp('wiki', 'instance');
		const projectApp = await insertApp('crm', 'project');
		await migrate();

		await revert();

		const rows = await appRows();
		expect(rows.map((row) => [row.id, row.visibility])).toEqual([
			[projectApp, 'project'],
			[instanceApp, 'project'],
		]);
	});

	it('keeps the versions of the apps on revert', async () => {
		const versionId = await insertVersion(await insertApp('sales', 'instance'));
		await migrate();

		await revert();

		expect(await versionIds()).toEqual([versionId]);
	});

	it('accepts only project or instance visibility after revert', async () => {
		await migrate();

		await revert();

		await expect(insertApp('sales', 'public')).rejects.toThrow();
		await insertApp('wiki', 'instance');
		expect((await appRows()).map((row) => row.visibility)).toEqual(['instance']);
	});

	it('accepts new apps without a visibility', async () => {
		await migrate();

		const id = randomUUID();
		await insertRow('app', { id, name: 'sales', namespace: 'sales', projectId });
		expect((await appRows()).map((row) => row.id)).toEqual([id]);
	});
});
