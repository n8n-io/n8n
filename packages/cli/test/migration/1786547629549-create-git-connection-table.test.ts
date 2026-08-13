import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'CreateGitConnectionTable1786547629549';

describe('CreateGitConnectionTable migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('creates a table that stores SSH and HTTPS connections', async () => {
		const context = createTestMigrationContext(dataSource);
		const table = context.escape.tableName('git_connection');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "repositoryUrl", "connectionType", "createdAt", "updatedAt")
			 VALUES (:id, :name, :repositoryUrl, :connectionType, :createdAt, :updatedAt)`,
			{
				id: 'git-connection-id',
				name: 'Deployments',
				repositoryUrl: 'https://example.com/org/repo.git',
				connectionType: 'https',
				createdAt: now,
				updatedAt: now,
			},
		);
		const rows = await context.runQuery<Array<{ branchName: string | null }>>(
			`SELECT "branchName" FROM ${table}`,
		);
		expect(rows).toEqual([{ branchName: null }]);
		await context.queryRunner.release();
	});
});
