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
import { nanoid } from 'nanoid';

const MIGRATION_NAME = 'AddScalingFieldsToTestRun1771417407753';

describe('AddScalingFieldsToTestRun Migration', () => {
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

	async function insertTestWorkflow(context: TestMigrationContext, workflowId: string) {
		const tableName = context.escape.tableName('workflow_entity');
		await context.runQuery(
			`INSERT INTO ${tableName} (${context.escape.columnName('id')}, ${context.escape.columnName('name')}, ${context.escape.columnName('active')}, ${context.escape.columnName('nodes')}, ${context.escape.columnName('connections')}, ${context.escape.columnName('createdAt')}, ${context.escape.columnName('updatedAt')}, ${context.escape.columnName('triggerCount')}, ${context.escape.columnName('versionId')})
			 VALUES (:id, :name, :active, :nodes, :connections, :createdAt, :updatedAt, :triggerCount, :versionId)`,
			{
				id: workflowId,
				name: 'Test Workflow',
				active: false,
				nodes: '[]',
				connections: '{}',
				createdAt: new Date(),
				updatedAt: new Date(),
				triggerCount: 0,
				versionId: nanoid(),
			},
		);
	}

	async function insertTestRun(
		context: TestMigrationContext,
		testRunId: string,
		workflowId: string,
	) {
		const tableName = context.escape.tableName('test_run');
		await context.runQuery(
			`INSERT INTO ${tableName} (${context.escape.columnName('id')}, ${context.escape.columnName('status')}, ${context.escape.columnName('workflowId')}, ${context.escape.columnName('createdAt')}, ${context.escape.columnName('updatedAt')})
			 VALUES (:id, :status, :workflowId, :createdAt, :updatedAt)`,
			{
				id: testRunId,
				status: 'new',
				workflowId,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function getColumnMeta(context: TestMigrationContext, columnName: string) {
		if (context.isSqlite) {
			const rows: Array<{ name: string; notnull: number; dflt_value: string | null }> =
				await context.queryRunner.query(
					`PRAGMA table_info(${context.escape.tableName('test_run')})`,
				);
			return rows.find((r) => r.name === columnName);
		}
		const rows: Array<{
			column_name: string;
			is_nullable: string;
			column_default: string | null;
		}> = await context.queryRunner.query(
			'SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}test_run`, columnName],
		);
		return rows[0];
	}

	describe('up', () => {
		it('should add runningInstanceId as a nullable column', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			const col = await getColumnMeta(context, 'runningInstanceId');
			expect(col).toBeDefined();
			if (context.isSqlite) expect((col as any).notnull).toBe(0);
			else expect((col as any).is_nullable).toBe('YES');

			await context.queryRunner.release();
		});

		it('should add cancelRequested as NOT NULL with default FALSE', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			const col = await getColumnMeta(context, 'cancelRequested');
			expect(col).toBeDefined();
			if (context.isSqlite) expect((col as any).notnull).toBe(1);
			else expect((col as any).is_nullable).toBe('NO');

			await context.queryRunner.release();
		});

		it('should set defaults on existing rows', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflowId = nanoid(16);
			const testRunId = nanoid(16);
			await insertTestWorkflow(context, workflowId);
			await insertTestRun(context, testRunId, workflowId);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);

			const postContext = createTestMigrationContext(dataSource);
			const tableName = postContext.escape.tableName('test_run');
			const rows: Array<{ runningInstanceId: string | null; cancelRequested: boolean | null }> =
				await postContext.runQuery(
					`SELECT * FROM ${tableName} WHERE ${postContext.escape.columnName('id')} = :id`,
					{ id: testRunId },
				);
			expect(rows[0].runningInstanceId).toBeNull();
			expect(Boolean(rows[0].cancelRequested)).toBe(false);

			await postContext.queryRunner.release();
		});

		it('should reject NULL for cancelRequested', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);
			const workflowId = nanoid(16);
			await insertTestWorkflow(context, workflowId);

			const tableName = context.escape.tableName('test_run');
			await expect(
				context.runQuery(
					`INSERT INTO ${tableName} (${context.escape.columnName('id')}, ${context.escape.columnName('status')}, ${context.escape.columnName('workflowId')}, ${context.escape.columnName('cancelRequested')}, ${context.escape.columnName('createdAt')}, ${context.escape.columnName('updatedAt')})
					 VALUES (:id, :status, :workflowId, :cancelRequested, :createdAt, :updatedAt)`,
					{
						id: nanoid(16),
						status: 'new',
						workflowId,
						cancelRequested: null,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				),
			).rejects.toThrow();

			await context.queryRunner.release();
		});
	});

	describe('down', () => {
		it('should remove both columns', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await getColumnMeta(context, 'runningInstanceId')).toBeUndefined();
			expect(await getColumnMeta(context, 'cancelRequested')).toBeUndefined();
			await context.queryRunner.release();
		});
	});
});
