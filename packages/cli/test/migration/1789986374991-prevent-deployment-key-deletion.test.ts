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

const MIGRATION_NAME = 'PreventDeploymentKeyDeletion1789986374991';

describe('PreventDeploymentKeyDeletion migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
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

	async function insertKey(context: TestMigrationContext) {
		const table = context.escape.tableName('deployment_key');
		await context.runQuery(
			`INSERT INTO ${table} (id, type, value, algorithm, status, "createdAt", "updatedAt")
			 VALUES (:id, :type, :value, :algorithm, :status, :createdAt, :updatedAt)`,
			{
				id: 'key-1',
				type: 'data_encryption',
				value: 'encrypted-value',
				algorithm: 'aes-256-gcm',
				status: 'active',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	it('rejects deletion and keeps the key readable', async () => {
		await withContext(insertKey);
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const table = context.escape.tableName('deployment_key');
			await expect(context.runQuery(`DELETE FROM ${table}`)).rejects.toThrow(
				'Deployment keys must not be deleted',
			);
			await expect(
				context.runQuery(`UPDATE ${table} SET status = 'inactive' WHERE id = 'key-1'`),
			).resolves.not.toThrow();

			const rows = await context.runQuery<Array<{ id: string; status: string }>>(
				`SELECT id, status FROM ${table}`,
			);
			expect(rows).toEqual([{ id: 'key-1', status: 'inactive' }]);
		});
	});

	it('rejects truncation on Postgres', async () => {
		if (dataSource.options.type !== 'postgres') return;
		await withContext(insertKey);
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const table = context.escape.tableName('deployment_key');
			await expect(context.runQuery(`TRUNCATE TABLE ${table}`)).rejects.toThrow(
				'Deployment keys must not be deleted',
			);
		});
	});

	it('allows deletion after the migration is reverted', async () => {
		await withContext(insertKey);
		await runSingleMigration(MIGRATION_NAME);
		await undoLastSingleMigration();

		await withContext(async (context) => {
			const table = context.escape.tableName('deployment_key');
			await expect(context.runQuery(`DELETE FROM ${table}`)).resolves.not.toThrow();
		});
	});
});
