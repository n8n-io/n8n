import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'CreateProjectGitConnectionTable1786547629549';

describe('CreateProjectGitConnectionTable migration', () => {
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

	it('creates a table that stores disconnected SSH and HTTPS connections', async () => {
		const context = createTestMigrationContext(dataSource);
		const table = context.escape.tableName('project_git_connection');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "repositoryUrl", "connectionType", "connected", "createdAt", "updatedAt")
			 VALUES (:id, :name, :repositoryUrl, :connectionType, :connected, :createdAt, :updatedAt)`,
			{
				id: 'git-connection-id',
				name: 'Deployments',
				repositoryUrl: 'https://example.com/org/repo.git',
				connectionType: 'https',
				connected: false,
				createdAt: now,
				updatedAt: now,
			},
		);
		const rows = await context.runQuery<Array<{ branchName: string | null; connected: boolean }>>(
			`SELECT "branchName", "connected" FROM ${table}`,
		);
		expect(rows).toEqual([{ branchName: null, connected: context.isSqlite ? 0 : false }]);
		await context.queryRunner.release();
	});
});
