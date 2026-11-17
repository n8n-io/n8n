import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const migrationName = 'CreateAgentExecutionStatisticsDelta1794320806352';
const isPostgres = process.env.DB_TYPE === 'postgresdb';

describe.skipIf(!isPostgres)('CreateAgentExecutionStatisticsDelta migration', () => {
	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await initDbUpToMigration(migrationName);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	test('folds pending increments before rollback and can create the buffer again', async () => {
		await runSingleMigration(migrationName);
		const context = createTestMigrationContext(Container.get(DataSource));
		const stats = context.escape.tableName('agent_execution_statistics');
		const delta = context.escape.tableName('agent_execution_statistics_delta');
		const period = context.escape.columnName('periodStart');
		const count = context.escape.columnName('count');
		try {
			await context.runQuery(
				`INSERT INTO ${stats} (${period}, ${count}) VALUES ('2026-11-09 00:00:00+00', 7)`,
			);
			await context.runQuery(`INSERT INTO ${delta} (${period}) VALUES
				('2026-11-09 00:00:00+00'), ('2026-11-09 00:00:00+00'), ('2026-11-10 00:00:00+00')`);
		} finally {
			await context.queryRunner.release();
		}

		await undoLastSingleMigration();
		await runSingleMigration(migrationName);
		const after = createTestMigrationContext(Container.get(DataSource));
		try {
			expect(
				await after.runQuery(`SELECT ${count}::int AS count FROM ${stats} ORDER BY ${period}`),
			).toEqual([{ count: 9 }, { count: 1 }]);
			expect(await after.runQuery(`SELECT * FROM ${delta}`)).toEqual([]);
		} finally {
			await after.queryRunner.release();
		}
	});
});
