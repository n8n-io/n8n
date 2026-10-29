import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateProjectExecutionLimitTable1793271136710';
const TABLE = 'project_execution_limit';

describe('CreateProjectExecutionLimitTable migration', () => {
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

	async function insertProject(context: TestMigrationContext) {
		const id = randomUUID();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
		return id;
	}

	async function insertLimit(
		context: TestMigrationContext,
		projectId: string,
		maxExecutions: number | null,
	) {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(TABLE)} ("projectId", "maxExecutions", "createdAt", "updatedAt")
			 VALUES (:projectId, :maxExecutions, :createdAt, :updatedAt)`,
			{ projectId, maxExecutions, createdAt: now, updatedAt: now },
		);
	}

	async function countLimits(context: TestMigrationContext, projectId: string) {
		const rows = await context.runQuery<Array<{ c: number }>>(
			`SELECT COUNT(*) as c FROM ${context.escape.tableName(TABLE)} WHERE "projectId" = :projectId`,
			{ projectId },
		);
		return Number(rows[0].c);
	}

	it('stores one cap per project', async () => {
		const context = createTestMigrationContext(dataSource);
		const projectId = await insertProject(context);

		await insertLimit(context, projectId, 5000);

		await expect(insertLimit(context, projectId, 6000)).rejects.toThrow();
		await context.queryRunner.release();
	});

	it.each([
		['a missing max executions value', null],
		['a zero max executions value', 0],
	])('rejects %s', async (_, maxExecutions) => {
		const context = createTestMigrationContext(dataSource);
		const projectId = await insertProject(context);

		await expect(insertLimit(context, projectId, maxExecutions)).rejects.toThrow();
		await context.queryRunner.release();
	});

	it('rejects a cap for a project that does not exist', async () => {
		const context = createTestMigrationContext(dataSource);

		await expect(insertLimit(context, randomUUID(), 5000)).rejects.toThrow();
		await context.queryRunner.release();
	});

	it('drops the cap when its project is deleted', async () => {
		const context = createTestMigrationContext(dataSource);
		const projectId = await insertProject(context);
		await insertLimit(context, projectId, 5000);

		await context.runQuery(`DELETE FROM ${context.escape.tableName('project')} WHERE "id" = :id`, {
			id: projectId,
		});

		expect(await countLimits(context, projectId)).toBe(0);
		await context.queryRunner.release();
	});

	it('drops the table on down and can be re-applied', async () => {
		await undoLastSingleMigration();

		const context = createTestMigrationContext(dataSource);
		const table = `${context.tablePrefix}${TABLE}`;
		expect(await context.queryRunner.hasTable(table)).toBe(false);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		const afterContext = createTestMigrationContext(dataSource);
		expect(await afterContext.queryRunner.hasTable(table)).toBe(true);
		await afterContext.queryRunner.release();
	});
});
