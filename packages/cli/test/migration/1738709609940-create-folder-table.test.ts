import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'CreateFolderTable1738709609940';

describe('CreateFolderTable Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function workflowColumns(context: TestMigrationContext): Promise<string[]> {
		const table = await context.queryRunner.getTable(`${context.tablePrefix}workflow_entity`);
		return table?.columns.map((column) => column.name) ?? [];
	}

	it('creates the folder tables and adds parentFolderId to workflows', async () => {
		await runSingleMigration(MIGRATION_NAME);
		const context = createTestMigrationContext(dataSource);

		expect(await context.queryRunner.hasTable(`${context.tablePrefix}folder`)).toBe(true);
		expect(await context.queryRunner.hasTable(`${context.tablePrefix}folder_tag`)).toBe(true);
		expect(await workflowColumns(context)).toContain('parentFolderId');

		await context.queryRunner.release();
	});

	it('completes when its schema changes exist but its migration record does not', async () => {
		await runSingleMigration(MIGRATION_NAME);
		const context = createTestMigrationContext(dataSource);
		// A stop after the schema commit and before the record insert leaves this state.
		await context.runQuery(
			`DELETE FROM ${context.escape.tableName('migrations')} WHERE "name" = '${MIGRATION_NAME}'`,
		);
		await context.queryRunner.release();

		await expect(runSingleMigration(MIGRATION_NAME)).resolves.not.toThrow();

		const after = createTestMigrationContext(dataSource);
		const columns = await workflowColumns(after);
		expect(columns.filter((name) => name === 'parentFolderId')).toHaveLength(1);
		const [{ count }] = await after.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS "count" FROM ${after.escape.tableName('migrations')} WHERE "name" = '${MIGRATION_NAME}'`,
		);
		expect(Number(count)).toBe(1);
		await after.queryRunner.release();
	});
});
