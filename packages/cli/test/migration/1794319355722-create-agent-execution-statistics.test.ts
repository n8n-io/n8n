import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const migrationName = 'CreateAgentExecutionStatistics1794319355722';

describe('CreateAgentExecutionStatistics migration', () => {
	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await initDbUpToMigration(migrationName);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	test('creates the counter table after apply and revert', async () => {
		await runSingleMigration(migrationName);
		await undoLastSingleMigration();
		await runSingleMigration(migrationName);

		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			const table = context.escape.tableName('agent_execution_statistics');
			const periodStart = context.escape.columnName('periodStart');
			const count = context.escape.columnName('count');
			await context.runQuery(
				`INSERT INTO ${table} (${periodStart}, ${count}) VALUES ('2026-11-10 00:00:00', 1)`,
			);
			expect(await context.runQuery(`SELECT * FROM ${table}`)).toHaveLength(1);
		} finally {
			await context.queryRunner.release();
		}
	});
});
