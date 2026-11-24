import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const migrationName = 'RemoveInstanceAppVisibility1795455809960';

type Row = Record<string, string | number | null>;

describe('RemoveInstanceAppVisibility migration', () => {
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

	async function visibilityOf(appId: string) {
		const [row] = await context.runQuery<{ visibility: string }[]>(
			`SELECT ${column('visibility')} AS visibility FROM ${context.escape.tableName('app')} WHERE ${column('id')} = :appId`,
			{ appId },
		);
		return row?.visibility;
	}

	it('makes instance apps visible to project members and keeps the project apps', async () => {
		const instanceApp = await insertApp('wiki', 'instance');
		const projectApp = await insertApp('crm', 'project');

		await migrate();

		expect(await visibilityOf(instanceApp)).toBe('project');
		expect(await visibilityOf(projectApp)).toBe('project');
	});

	it('keeps the versions of the apps', async () => {
		const appId = await insertApp('sales', 'instance');
		await insertRow('app_artifact', {
			id: 1,
			appId,
			storedAt: 'db',
			storageKey: 'source',
			sizeBytes: 1,
		});
		const versionId = randomUUID();
		await insertRow('app_version', { id: versionId, appId, sourceArtifactId: 1 });

		await migrate();

		const versions = await context.runQuery<Array<{ id: string }>>(
			`SELECT ${column('id')} AS id FROM ${context.escape.tableName('app_version')}`,
		);
		expect(versions).toEqual([{ id: versionId }]);
	});

	it('rejects the instance visibility', async () => {
		await migrate();

		await expect(insertApp('sales', 'instance')).rejects.toThrow();
	});
});
