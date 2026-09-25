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

const MIGRATION_NAME = 'CreateWorkflowStatisticsDeltaTable1784000000043';

// The delta table + fold are Postgres-only; the migration is not registered for SQLite.
const runOnPostgres = (process.env.DB_TYPE ?? 'sqlite') === 'postgresdb';
// eslint-disable-next-line n8n-local-rules/no-skipped-tests -- Postgres-only migration, skipped on SQLite
const describePg = runOnPostgres ? describe : describe.skip;

describePg('CreateWorkflowStatisticsDeltaTable migration (Postgres)', () => {
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
		// Run every migration before this one (counter table exists; delta table does not).
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	const insertCounter = async (
		context: TestMigrationContext,
		row: {
			workflowId: string;
			name: string;
			count: number;
			rootCount: number;
			workflowName: string;
		},
	) => {
		const t = context.escape.tableName('workflow_statistics');
		const c = (n: string) => context.escape.columnName(n);
		await context.runQuery(
			`INSERT INTO ${t} (${c('workflowId')}, ${c('name')}, ${c('count')}, ${c('rootCount')}, ${c('latestEvent')}, ${c('workflowName')})
			 VALUES (:workflowId, :name, :count, :rootCount, :latestEvent, :workflowName)`,
			{ ...row, latestEvent: new Date() },
		);
	};

	const insertDelta = async (
		context: TestMigrationContext,
		row: { workflowId: string; name: string; rootCountDelta: number; workflowName: string },
	) => {
		const t = context.escape.tableName('workflow_statistics_delta');
		const c = (n: string) => context.escape.columnName(n);
		await context.runQuery(
			`INSERT INTO ${t} (${c('workflowId')}, ${c('name')}, ${c('rootCountDelta')}, ${c('workflowName')})
			 VALUES (:workflowId, :name, :rootCountDelta, :workflowName)`,
			row,
		);
	};

	test('up creates the delta table; down folds residual deltas into the counter then drops it', async () => {
		// up
		await runSingleMigration(MIGRATION_NAME);
		let context = createTestMigrationContext(dataSource);

		// A workflow already activated before rollback, plus three un-folded deltas (2 root, 1 non-root).
		await insertCounter(context, {
			workflowId: 'wf-1',
			name: 'production_success',
			count: 10,
			rootCount: 4,
			workflowName: 'WF One (old)',
		});
		await insertDelta(context, {
			workflowId: 'wf-1',
			name: 'production_success',
			rootCountDelta: 1,
			workflowName: 'WF One',
		});
		await insertDelta(context, {
			workflowId: 'wf-1',
			name: 'production_success',
			rootCountDelta: 1,
			workflowName: 'WF One',
		});
		await insertDelta(context, {
			workflowId: 'wf-1',
			name: 'production_success',
			rootCountDelta: 0,
			workflowName: 'WF One',
		});
		await context.queryRunner.release();

		// down: must fold (count += 3, rootCount += 2) before dropping — no counts lost on rollback.
		await undoLastSingleMigration();
		context = createTestMigrationContext(dataSource);

		const counterTable = context.escape.tableName('workflow_statistics');
		const countCol = context.escape.columnName('count');
		const rootCountCol = context.escape.columnName('rootCount');
		const wfIdCol = context.escape.columnName('workflowId');
		const counter = await context.runQuery<Array<{ count: number; rootCount: number }>>(
			`SELECT ${countCol}::int AS count, ${rootCountCol}::int AS "rootCount" FROM ${counterTable} WHERE ${wfIdCol} = :id`,
			{ id: 'wf-1' },
		);
		expect(counter).toHaveLength(1);
		expect(counter[0]).toMatchObject({ count: 13, rootCount: 6 });

		// delta table is gone
		const deltaTable = context.escape.tableName('workflow_statistics_delta');
		await expect(context.runQuery(`SELECT 1 FROM ${deltaTable}`)).rejects.toThrow();
		await context.queryRunner.release();
	});
});
