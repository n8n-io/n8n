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

const MIGRATION_NAME = 'AddInstallIdIndexToDeploymentKey1794944671754';

describe('AddInstallIdIndexToDeploymentKey migration', () => {
	let dataSource: DataSource;
	let nextId = 0;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertInstallId(status: 'active' | 'inactive') {
		await withContext(async (context) => {
			const table = context.escape.tableName('deployment_key');
			const createdAt = context.escape.columnName('createdAt');
			const updatedAt = context.escape.columnName('updatedAt');
			await context.runQuery(
				`INSERT INTO ${table} (id, type, value, algorithm, status, ${createdAt}, ${updatedAt})
				 VALUES (:id, :type, :value, :algorithm, :status, :createdAt, :updatedAt)`,
				{
					id: `install-id-${++nextId}`,
					type: 'install.id',
					value: `install-value-${nextId}`,
					algorithm: null,
					status,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			);
		});
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('allows only one active install ID', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await insertInstallId('active');
		await expect(insertInstallId('active')).rejects.toThrow();
		await expect(insertInstallId('inactive')).resolves.not.toThrow();
	});

	it('allows several active install IDs again after rollback', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await undoLastSingleMigration();

		await insertInstallId('active');
		await expect(insertInstallId('active')).resolves.not.toThrow();
	});
});
