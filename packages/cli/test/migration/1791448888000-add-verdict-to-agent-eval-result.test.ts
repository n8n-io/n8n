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
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddVerdictToAgentEvalResult1791448888000';

describe('AddVerdictToAgentEvalResult migration', () => {
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

	/** Seeds a full project → agent → dataset → run → result chain, returning the result id. */
	async function seedResult(): Promise<{ resultId: string }> {
		const projectId = randomUUID();
		const agentId = randomUUID();
		const datasetId = randomUUID();
		const runId = randomUUID();
		const resultId = randomUUID();
		const now = new Date();

		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt")
				 VALUES (:projectId, 'Project', 'team', '[]', :now, :now)`,
				{ projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
				 VALUES (:agentId, 'Test Agent', :projectId, '[]', '{}', '{}', :now, :now)`,
				{ agentId, projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_eval_dataset')} ("id", "name", "agentId", "datasetSource", "datasetRef", "createdAt", "updatedAt")
				 VALUES (:datasetId, 'Test Dataset', :agentId, 'data_table', :datasetRef, :now, :now)`,
				{ datasetId, agentId, datasetRef: JSON.stringify({ dataTableId: 'dt-1' }), now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_eval_run')} ("id", "datasetId", "status", "cancelRequested", "createdAt", "updatedAt")
				 VALUES (:runId, :datasetId, 'new', :cancelRequested, :now, :now)`,
				{ runId, datasetId, cancelRequested: false, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_eval_result')} ("id", "runId", "status", "createdAt", "updatedAt")
				 VALUES (:resultId, :runId, 'success', :now, :now)`,
				{ resultId, runId, now },
			);
		});

		return { resultId };
	}

	async function columnNames(context: TestMigrationContext): Promise<string[]> {
		if (context.isSqlite) {
			const rows: Array<{ name: string }> = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName('agent_eval_result')})`,
			);
			return rows.map((row) => row.name);
		}
		const rows: Array<{ column_name: string }> = await context.queryRunner.query(
			'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
			[`${context.tablePrefix}agent_eval_result`],
		);
		return rows.map((row) => row.column_name);
	}

	it('reads an existing result back with a null verdict', async () => {
		const { resultId } = await seedResult();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await columnNames(context)).toContain('verdict');

			const rows = await context.runQuery<Array<{ verdict: string | null }>>(
				`SELECT "verdict" FROM ${context.escape.tableName('agent_eval_result')} WHERE "id" = :resultId`,
				{ resultId },
			);
			expect(rows).toEqual([{ verdict: null }]);
		});
	});

	it('stores and reads back a written verdict', async () => {
		const { resultId } = await seedResult();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const verdict = JSON.stringify({
			status: 'completed',
			outcome: 'fail',
			reasoning: 'Off-task.',
		});
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`UPDATE ${escape.tableName('agent_eval_result')} SET "verdict" = :verdict WHERE "id" = :resultId`,
				{ verdict, resultId },
			);
			const rows = await runQuery<Array<{ verdict: string | object | null }>>(
				`SELECT "verdict" FROM ${escape.tableName('agent_eval_result')} WHERE "id" = :resultId`,
				{ resultId },
			);
			expect(rows).toHaveLength(1);
			// Postgres returns a JSON column already parsed; SQLite returns text.
			const stored = rows[0].verdict;
			expect(typeof stored === 'string' ? JSON.parse(stored) : stored).toEqual({
				status: 'completed',
				outcome: 'fail',
				reasoning: 'Off-task.',
			});
		});
	});

	it('drops the column and preserves the result row', async () => {
		const { resultId } = await seedResult();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await columnNames(context)).not.toContain('verdict');

			const rows = await context.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${context.escape.tableName('agent_eval_result')} WHERE "id" = :resultId`,
				{ resultId },
			);
			expect(rows).toEqual([{ id: resultId }]);
		});
	});
});
