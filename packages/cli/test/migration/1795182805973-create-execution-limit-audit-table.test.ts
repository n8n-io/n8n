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

const MIGRATION_NAME = 'CreateExecutionLimitAuditTable1795182805973';
const TABLE = 'execution_limit_audit';

type AuditRow = {
	projectId: string | null;
	field: string | null;
	oldValue: string | null;
	newValue: string | null;
	updatedBy: string | null;
	loginId: string | null;
};

describe('CreateExecutionLimitAuditTable migration', () => {
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

	async function insertRow(context: TestMigrationContext, row: Partial<AuditRow>) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(TABLE)} ("projectId", "field", "oldValue", "newValue", "updatedBy", "loginId")
			 VALUES (:projectId, :field, :oldValue, :newValue, :updatedBy, :loginId)`,
			{
				projectId: null,
				field: 'instanceMaxExecutions',
				oldValue: null,
				newValue: null,
				updatedBy: null,
				loginId: null,
				...row,
			},
		);
	}

	it('stores many changes of one limit, with the time of each change', async () => {
		const context = createTestMigrationContext(dataSource);
		const projectId = randomUUID();
		const change = {
			projectId,
			field: 'projectMaxExecutions',
			updatedBy: randomUUID(),
			loginId: 'login-1',
		};

		await insertRow(context, { ...change, newValue: '100' });
		await insertRow(context, { ...change, oldValue: '100', newValue: '200' });

		const rows = await context.runQuery<Array<{ id: number; createdAt: string | Date }>>(
			`SELECT "id", "createdAt" FROM ${context.escape.tableName(TABLE)} WHERE "projectId" = :projectId ORDER BY "id"`,
			{ projectId },
		);
		expect(rows).toHaveLength(2);
		expect(Number(rows[1].id)).toBeGreaterThan(Number(rows[0].id));
		expect(rows[0].createdAt).toBeTruthy();
		await context.queryRunner.release();
	});

	it('accepts a change with no project, no values and no user', async () => {
		const context = createTestMigrationContext(dataSource);

		await expect(insertRow(context, {})).resolves.not.toThrow();
		await context.queryRunner.release();
	});

	it.each([
		['a missing field', { field: null }],
		['an unknown field', { field: 'maxExecutions' }],
		['a project limit with no project', { field: 'projectMaxExecutions' }],
		['an instance setting with a project', { projectId: randomUUID() }],
	])('rejects %s', async (_, row) => {
		const context = createTestMigrationContext(dataSource);

		await expect(insertRow(context, row)).rejects.toThrow();
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
