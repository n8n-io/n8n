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

const MIGRATION_NAME = 'CreateAgentEvalTables1784815940112';

const AGENT_EVAL_TABLES = [
	'agent_eval_dataset',
	'agent_eval_run',
	'agent_eval_result',
	'agent_eval_rating',
];

async function tableExists(context: TestMigrationContext, table: string): Promise<boolean> {
	const name = `${context.tablePrefix}${table}`;
	if (context.isSqlite) {
		const rows = await context.runQuery<Array<{ name: string }>>(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name = :name",
			{ name },
		);
		return rows.length > 0;
	}
	const rows = await context.runQuery<Array<{ tablename: string }>>(
		'SELECT tablename FROM pg_tables WHERE tablename = :name',
		{ name },
	);
	return rows.length > 0;
}

describe('CreateAgentEvalTables Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);

		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertProject(context: TestMigrationContext, id: string): Promise<void> {
		const table = context.escape.tableName('project');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt") VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Test Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
	}

	async function insertAgent(
		context: TestMigrationContext,
		data: { id: string; projectId: string },
	): Promise<void> {
		const table = context.escape.tableName('agents');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt") VALUES (:id, :name, :projectId, :integrations, :tools, :skills, :createdAt, :updatedAt)`,
			{
				id: data.id,
				name: 'Test Agent',
				projectId: data.projectId,
				integrations: '[]',
				tools: '{}',
				skills: '{}',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertDataset(
		context: TestMigrationContext,
		data: { id: string; agentId: string },
	): Promise<void> {
		const table = context.escape.tableName('agent_eval_dataset');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "agentId", "datasetSource", "datasetRef", "createdAt", "updatedAt") VALUES (:id, :name, :agentId, :datasetSource, :datasetRef, :createdAt, :updatedAt)`,
			{
				id: data.id,
				name: 'Test Dataset',
				agentId: data.agentId,
				datasetSource: 'data_table',
				datasetRef: JSON.stringify({ dataTableId: 'dt-1' }),
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertRun(
		context: TestMigrationContext,
		data: { id: string; datasetId: string },
	): Promise<void> {
		const table = context.escape.tableName('agent_eval_run');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "datasetId", "status", "cancelRequested", "createdAt", "updatedAt") VALUES (:id, :datasetId, :status, :cancelRequested, :createdAt, :updatedAt)`,
			{
				id: data.id,
				datasetId: data.datasetId,
				status: 'new',
				cancelRequested: false,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertResult(
		context: TestMigrationContext,
		data: { id: string; runId: string },
	): Promise<void> {
		const table = context.escape.tableName('agent_eval_result');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "runId", "status", "createdAt", "updatedAt") VALUES (:id, :runId, :status, :createdAt, :updatedAt)`,
			{ id: data.id, runId: data.runId, status: 'new', createdAt: now, updatedAt: now },
		);
	}

	async function insertRating(
		context: TestMigrationContext,
		data: { id: string; resultId: string },
	): Promise<void> {
		const table = context.escape.tableName('agent_eval_rating');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "resultId", "vote", "createdAt", "updatedAt") VALUES (:id, :resultId, :vote, :createdAt, :updatedAt)`,
			{ id: data.id, resultId: data.resultId, vote: 'up', createdAt: now, updatedAt: now },
		);
	}

	describe('up', () => {
		beforeAll(async () => {
			await runSingleMigration(MIGRATION_NAME);
		});

		it('creates all four agent-eval tables', async () => {
			const context = createTestMigrationContext(dataSource);
			for (const table of AGENT_EVAL_TABLES) {
				expect(await tableExists(context, table)).toBe(true);
			}
			await context.queryRunner.release();
		});

		it('persists a full dataset → run → result → rating chain through the FKs', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = randomUUID();
			const agentId = randomUUID();
			const datasetId = randomUUID();
			const runId = randomUUID();
			const resultId = randomUUID();
			const ratingId = randomUUID();

			await insertProject(context, projectId);
			await insertAgent(context, { id: agentId, projectId });
			await insertDataset(context, { id: datasetId, agentId });
			await insertRun(context, { id: runId, datasetId });
			await insertResult(context, { id: resultId, runId });
			await insertRating(context, { id: ratingId, resultId });

			const runTable = context.escape.tableName('agent_eval_run');
			const runs = await context.runQuery<Array<{ id: string; datasetId: string }>>(
				`SELECT "id", "datasetId" FROM ${runTable} WHERE "id" = :id`,
				{ id: runId },
			);
			expect(runs).toHaveLength(1);
			expect(runs[0].datasetId).toBe(datasetId);

			await context.queryRunner.release();
		});

		it('cascades deletes from dataset down to results and ratings', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = randomUUID();
			const agentId = randomUUID();
			const datasetId = randomUUID();
			const runId = randomUUID();
			const resultId = randomUUID();
			const ratingId = randomUUID();

			await insertProject(context, projectId);
			await insertAgent(context, { id: agentId, projectId });
			await insertDataset(context, { id: datasetId, agentId });
			await insertRun(context, { id: runId, datasetId });
			await insertResult(context, { id: resultId, runId });
			await insertRating(context, { id: ratingId, resultId });

			const datasetTable = context.escape.tableName('agent_eval_dataset');
			await context.runQuery(`DELETE FROM ${datasetTable} WHERE "id" = :id`, { id: datasetId });

			// The whole chain below the dataset must be gone, not just the leaf.
			const runTable = context.escape.tableName('agent_eval_run');
			const resultTable = context.escape.tableName('agent_eval_result');
			const ratingTable = context.escape.tableName('agent_eval_rating');

			const runs = await context.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${runTable} WHERE "id" = :id`,
				{ id: runId },
			);
			const results = await context.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${resultTable} WHERE "id" = :id`,
				{ id: resultId },
			);
			const ratings = await context.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${ratingTable} WHERE "id" = :id`,
				{ id: ratingId },
			);
			expect(runs).toHaveLength(0);
			expect(results).toHaveLength(0);
			expect(ratings).toHaveLength(0);

			await context.queryRunner.release();
		});
	});

	describe('down', () => {
		it('drops all four agent-eval tables', async () => {
			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			for (const table of AGENT_EVAL_TABLES) {
				expect(await tableExists(context, table)).toBe(false);
			}
			await context.queryRunner.release();
		});
	});
});
