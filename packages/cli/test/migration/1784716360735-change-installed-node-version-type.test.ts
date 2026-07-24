import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'ChangeInstalledNodeVersionType1784716360735';

describe('ChangeInstalledNodeVersionType migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function getLatestVersionColumnType(
		context: TestMigrationContext,
	): Promise<string | undefined> {
		if (context.isSqlite) {
			const columns = await context.runQuery<Array<{ name: string; type: string }>>(
				`PRAGMA table_info(${context.escape.tableName('installed_nodes')})`,
			);
			return columns.find(({ name }) => name === 'latestVersion')?.type;
		}

		const [columnInfo] = await context.runQuery<Array<{ dataType: string }>>(
			`SELECT data_type AS ${context.escape.columnName('dataType')}
			 FROM information_schema.columns
			 WHERE table_schema = current_schema() AND table_name = :tableName AND column_name = :columnName`,
			{
				tableName: `${context.tablePrefix}installed_nodes`,
				columnName: 'latestVersion',
			},
		);
		return columnInfo?.dataType;
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => {
			await context.queryRunner.clearDatabase();
		});
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('preserves installed nodes and stores fractional versions', async () => {
		await withContext(async (context) => {
			const installedPackages = context.escape.tableName('installed_packages');
			const installedNodes = context.escape.tableName('installed_nodes');
			const column = (name: string) => context.escape.columnName(name);

			expect(await getLatestVersionColumnType(context)).toBe(
				context.isSqlite ? 'INTEGER' : 'integer',
			);

			await context.runQuery(
				`INSERT INTO ${installedPackages} (${column('packageName')}, ${column('installedVersion')})
				 VALUES (:packageName, :installedVersion)`,
				{ packageName: 'n8n-nodes-test', installedVersion: '1.0.0' },
			);
			await context.runQuery(
				`INSERT INTO ${installedNodes} (${column('name')}, ${column('type')}, ${column('latestVersion')}, ${column('package')})
				 VALUES (:name, :type, :latestVersion, :package)`,
				{
					name: 'Test Node',
					type: 'n8n-nodes-test.testNode',
					latestVersion: 1,
					package: 'n8n-nodes-test',
				},
			);
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const installedNodes = context.escape.tableName('installed_nodes');
			const column = (name: string) => context.escape.columnName(name);
			const rows = await context.runQuery<Array<{ name: string; latestVersion: number }>>(
				`SELECT ${column('name')} AS ${column('name')}, ${column('latestVersion')} AS ${column('latestVersion')}
				 FROM ${installedNodes}`,
			);

			expect(rows).toEqual([{ name: 'Test Node', latestVersion: 1 }]);

			await context.runQuery(
				`UPDATE ${installedNodes} SET ${column('latestVersion')} = :latestVersion WHERE ${column('name')} = :name`,
				{ latestVersion: 1.1, name: 'Test Node' },
			);

			if (context.isSqlite) {
				expect(await getLatestVersionColumnType(context)).toBe('REAL');

				const [row] = await context.runQuery<Array<{ latestVersion: number; storageType: string }>>(
					`SELECT ${column('latestVersion')} AS ${column('latestVersion')}, typeof(${column('latestVersion')}) AS ${column('storageType')}
					 FROM ${installedNodes}`,
				);
				expect(row).toEqual({ latestVersion: 1.1, storageType: 'real' });
			} else {
				expect(await getLatestVersionColumnType(context)).toBe('double precision');

				const [row] = await context.runQuery<Array<{ latestVersion: number }>>(
					`SELECT ${column('latestVersion')} AS ${column('latestVersion')} FROM ${installedNodes}`,
				);
				expect(row?.latestVersion).toBe(1.1);
			}
		});
	});
});
