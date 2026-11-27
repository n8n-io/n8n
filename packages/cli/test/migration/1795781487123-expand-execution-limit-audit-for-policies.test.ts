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

const MIGRATION_NAME = 'ExpandExecutionLimitAuditForPolicies1795781487123';
const TABLE = 'execution_limit_audit';

type AuditRow = {
	projectId: string | null;
	field: string | null;
	oldValue: string | null;
	newValue: string | null;
	updatedBy: string | null;
	loginId: string | null;
	policyId: string | null;
};

type StoredRow = { id: number | string; field: string; createdAt: string | Date };

const POLICY_FIELDS = ['policy', 'projectPolicy', 'newProjectsPolicy', 'personalProjectsPolicy'];

describe('ExpandExecutionLimitAuditForPolicies migration', () => {
	let dataSource: DataSource;
	let seeded: StoredRow[];

	const projectId = randomUUID();
	const userId = randomUUID();

	// Inserts a row of the shape before this migration, so it has no policyId.
	async function insertOldRow(context: TestMigrationContext, row: Partial<AuditRow>) {
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

	async function insertRow(context: TestMigrationContext, row: Partial<AuditRow>) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(TABLE)} ("projectId", "field", "oldValue", "newValue", "updatedBy", "loginId", "policyId")
			 VALUES (:projectId, :field, :oldValue, :newValue, :updatedBy, :loginId, :policyId)`,
			{
				projectId: null,
				field: 'instanceMaxExecutions',
				oldValue: null,
				newValue: null,
				updatedBy: null,
				loginId: null,
				policyId: null,
				...row,
			},
		);
	}

	async function readRows(context: TestMigrationContext) {
		return await context.runQuery<StoredRow[]>(
			`SELECT "id", "field", "createdAt" FROM ${context.escape.tableName(TABLE)} ORDER BY "id"`,
		);
	}

	const time = (value: string | Date) => new Date(value).getTime();
	const normalized = (rows: StoredRow[]) =>
		rows.map(({ id, field, createdAt }) => ({ id: Number(id), field, createdAt: time(createdAt) }));

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);

		const oldContext = createTestMigrationContext(dataSource);
		await insertOldRow(oldContext, {
			field: 'instanceMaxExecutions',
			oldValue: null,
			newValue: '1000',
			updatedBy: userId,
		});
		await insertOldRow(oldContext, {
			projectId,
			field: 'projectMaxExecutions',
			oldValue: '10',
			newValue: '20',
			loginId: 'login-1',
		});
		await insertOldRow(oldContext, {
			field: 'periodUnit',
			oldValue: JSON.stringify('month'),
			newValue: JSON.stringify('week'),
		});
		seeded = await readRows(oldContext);
		await oldContext.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('keeps the rows, their ids and their times', async () => {
		const context = createTestMigrationContext(dataSource);

		const rows = await readRows(context);

		expect(seeded).toHaveLength(3);
		expect(normalized(rows)).toEqual(normalized(seeded));
		await context.queryRunner.release();
	});

	it('keeps the values and the user of a row', async () => {
		const context = createTestMigrationContext(dataSource);

		const rows = await context.runQuery<
			Array<{ field: string; newValue: unknown; updatedBy: string | null; loginId: string | null }>
		>(
			`SELECT "field", "newValue", "updatedBy", "loginId" FROM ${context.escape.tableName(TABLE)} WHERE "field" IN ('instanceMaxExecutions', 'projectMaxExecutions') ORDER BY "id"`,
		);

		expect(rows.map((row) => [row.field, row.updatedBy, row.loginId])).toEqual([
			['instanceMaxExecutions', userId, null],
			['projectMaxExecutions', null, 'login-1'],
		]);
		const parse = (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value);
		expect(rows.map((row) => Number(parse(row.newValue)))).toEqual([1000, 20]);
		await context.queryRunner.release();
	});

	it('gives a new row an id above the kept rows', async () => {
		const context = createTestMigrationContext(dataSource);
		const highest = Math.max(...seeded.map(({ id }) => Number(id)));

		await insertRow(context, { field: 'instanceMaxExecutions', newValue: '5' });

		const rows = await readRows(context);
		expect(Number(rows[rows.length - 1].id)).toBeGreaterThan(highest);
		await context.queryRunner.release();
	});

	describe('accepted rows', () => {
		it.each([
			['a policy', { field: 'policy', policyId: randomUUID() }],
			['a policy of a project', { field: 'projectPolicy', projectId, policyId: randomUUID() }],
			['a policy of the new projects', { field: 'newProjectsPolicy', policyId: randomUUID() }],
			[
				'a policy of the personal projects',
				{ field: 'personalProjectsPolicy', policyId: randomUUID() },
			],
			['an earlier project limit', { field: 'projectMaxExecutions', projectId }],
			['an earlier default project limit', { field: 'defaultProjectMaxExecutions' }],
			['an instance setting', { field: 'periodUnit' }],
		])('accepts %s', async (_, row) => {
			const context = createTestMigrationContext(dataSource);

			await expect(insertRow(context, row)).resolves.not.toThrow();
			await context.queryRunner.release();
		});

		it('stores a string value and an object value, and reads them back', async () => {
			const context = createTestMigrationContext(dataSource);
			const policyId = randomUUID();
			const objectValue = { id: randomUUID(), name: 'Free tier' };
			await insertRow(context, {
				field: 'policy',
				policyId,
				oldValue: JSON.stringify('Free'),
				newValue: JSON.stringify(objectValue),
			});

			// Cast to text: the Postgres driver parses json columns and SQLite does not.
			const [row] = await context.runQuery<Array<{ oldValue: string; newValue: string }>>(
				`SELECT CAST("oldValue" AS TEXT) AS "oldValue", CAST("newValue" AS TEXT) AS "newValue" FROM ${context.escape.tableName(TABLE)} WHERE "policyId" = :policyId`,
				{ policyId },
			);

			expect(JSON.parse(row.oldValue)).toBe('Free');
			expect(JSON.parse(row.newValue)).toEqual(objectValue);
			await context.queryRunner.release();
		});
	});

	describe('rejected rows', () => {
		it.each([
			['an unknown field', { field: 'maxExecutions' }],
			['a missing field', { field: null }],
			['a policy with no policy id', { field: 'policy' }],
			['a policy of a project with no policy id', { field: 'projectPolicy', projectId }],
			['a policy of the new projects with no policy id', { field: 'newProjectsPolicy' }],
			['a policy of the personal projects with no policy id', { field: 'personalProjectsPolicy' }],
			['a policy of a project with no project', { field: 'projectPolicy', policyId: randomUUID() }],
			['a project limit with no project', { field: 'projectMaxExecutions' }],
			['an instance setting with a project', { field: 'periodUnit', projectId }],
			['a policy with a project', { field: 'policy', projectId, policyId: randomUUID() }],
			[
				'a policy of the new projects with a project',
				{ field: 'newProjectsPolicy', projectId, policyId: randomUUID() },
			],
		])('rejects %s', async (_, row) => {
			const context = createTestMigrationContext(dataSource);

			await expect(insertRow(context, row)).rejects.toThrow();
			await context.queryRunner.release();
		});
	});

	it('removes the policy rows on down, keeps the others with their ids and restores the old checks', async () => {
		const setup = createTestMigrationContext(dataSource);
		const beforeDown = await readRows(setup);
		await setup.queryRunner.release();
		const kept = beforeDown.filter(({ field }) => !POLICY_FIELDS.includes(field));
		expect(kept.length).toBeLessThan(beforeDown.length);

		await undoLastSingleMigration();

		const context = createTestMigrationContext(dataSource);
		const rows = await readRows(context);
		expect(normalized(rows)).toEqual(normalized(kept));
		expect(rows.some(({ field }) => POLICY_FIELDS.includes(field))).toBe(false);
		expect(await context.queryRunner.hasColumn(`${context.tablePrefix}${TABLE}`, 'policyId')).toBe(
			false,
		);

		// Inserts of the old shape, without policyId.
		await expect(insertOldRow(context, { field: 'projectMaxExecutions' })).rejects.toThrow();
		await expect(insertOldRow(context, { field: 'periodUnit', projectId })).rejects.toThrow();
		await expect(insertOldRow(context, { field: 'policy' })).rejects.toThrow();
		await expect(
			insertOldRow(context, { field: 'projectMaxExecutions', projectId }),
		).resolves.not.toThrow();
		await context.queryRunner.release();
	});

	it('runs again after down', async () => {
		await runSingleMigration(MIGRATION_NAME);

		const context = createTestMigrationContext(dataSource);
		expect(await context.queryRunner.hasColumn(`${context.tablePrefix}${TABLE}`, 'policyId')).toBe(
			true,
		);
		await expect(
			insertRow(context, { field: 'policy', policyId: randomUUID() }),
		).resolves.not.toThrow();
		await context.queryRunner.release();
	});
});
