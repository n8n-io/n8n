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
import { v7 as uuidv7 } from 'uuid';

const MIGRATION_NAME = 'CreateExecutionLimitPolicyTables1795778458855';
const POLICY_TABLE = 'execution_limit_policy';
const ASSIGNMENT_TABLE = 'execution_limit_policy_assignment';
const GROUP_ASSIGNMENT_TABLE = 'execution_limit_policy_group_assignment';
const OLD_TABLE = 'project_execution_limit';

describe('CreateExecutionLimitPolicyTables migration', () => {
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

	async function insertPolicy(
		context: TestMigrationContext,
		{ name = `policy-${randomUUID()}`, maxExecutions = 100 as number | null } = {},
	) {
		const id = uuidv7();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(POLICY_TABLE)} ("id", "name", "maxExecutions", "createdAt", "updatedAt")
			 VALUES (:id, :name, :maxExecutions, :createdAt, :updatedAt)`,
			{ id, name, maxExecutions, createdAt: now, updatedAt: now },
		);
		return id;
	}

	async function insertAssignment(
		context: TestMigrationContext,
		policyId: string,
		projectId: string,
	) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(ASSIGNMENT_TABLE)} ("policyId", "projectId", "createdAt")
			 VALUES (:policyId, :projectId, :createdAt)`,
			{ policyId, projectId, createdAt: new Date() },
		);
	}

	async function insertGroupAssignment(
		context: TestMigrationContext,
		policyId: string,
		group: string,
	) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(GROUP_ASSIGNMENT_TABLE)} ("policyId", ${context.escape.columnName('group')}, "createdAt")
			 VALUES (:policyId, :group, :createdAt)`,
			{ policyId, group, createdAt: new Date() },
		);
	}

	async function count(context: TestMigrationContext, table: string, policyId: string) {
		const rows = await context.runQuery<Array<{ c: number }>>(
			`SELECT COUNT(*) as c FROM ${context.escape.tableName(table)} WHERE "policyId" = :policyId`,
			{ policyId },
		);
		return Number(rows[0].c);
	}

	async function countByProject(context: TestMigrationContext, projectId: string) {
		const rows = await context.runQuery<Array<{ c: number }>>(
			`SELECT COUNT(*) as c FROM ${context.escape.tableName(ASSIGNMENT_TABLE)} WHERE "projectId" = :projectId`,
			{ projectId },
		);
		return Number(rows[0].c);
	}

	describe('policy', () => {
		it('rejects a second policy with the same name', async () => {
			const context = createTestMigrationContext(dataSource);
			await insertPolicy(context, { name: 'Free tier' });

			await expect(insertPolicy(context, { name: 'Free tier' })).rejects.toThrow();
			await context.queryRunner.release();
		});

		it.each([
			['a missing max executions value', null],
			['a zero max executions value', 0],
		])('rejects %s', async (_, maxExecutions) => {
			const context = createTestMigrationContext(dataSource);

			await expect(insertPolicy(context, { maxExecutions })).rejects.toThrow();
			await context.queryRunner.release();
		});
	});

	describe('project assignment', () => {
		it('allows two policies on one project', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = await insertProject(context);
			const first = await insertPolicy(context);
			const second = await insertPolicy(context);

			await insertAssignment(context, first, projectId);
			await insertAssignment(context, second, projectId);

			expect(await countByProject(context, projectId)).toBe(2);
			await context.queryRunner.release();
		});

		it('rejects the same policy twice on one project', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = await insertProject(context);
			const policyId = await insertPolicy(context);
			await insertAssignment(context, policyId, projectId);

			await expect(insertAssignment(context, policyId, projectId)).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('rejects an assignment to a project that does not exist', async () => {
			const context = createTestMigrationContext(dataSource);
			const policyId = await insertPolicy(context);

			await expect(insertAssignment(context, policyId, randomUUID())).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('rejects an assignment of a policy that does not exist', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = await insertProject(context);

			await expect(insertAssignment(context, uuidv7(), projectId)).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('drops the assignments of a project when the project is deleted', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = await insertProject(context);
			const policyId = await insertPolicy(context);
			await insertAssignment(context, policyId, projectId);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('project')} WHERE "id" = :id`,
				{ id: projectId },
			);

			expect(await countByProject(context, projectId)).toBe(0);
			await context.queryRunner.release();
		});
	});

	describe('group assignment', () => {
		it.each(['newProjects', 'personalProjects'])('accepts the %s group', async (group) => {
			const context = createTestMigrationContext(dataSource);
			const policyId = await insertPolicy(context);

			await insertGroupAssignment(context, policyId, group);

			expect(await count(context, GROUP_ASSIGNMENT_TABLE, policyId)).toBe(1);
			await context.queryRunner.release();
		});

		it('rejects an unknown group', async () => {
			const context = createTestMigrationContext(dataSource);
			const policyId = await insertPolicy(context);

			await expect(insertGroupAssignment(context, policyId, 'teamProjects')).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('allows two policies on one group', async () => {
			const context = createTestMigrationContext(dataSource);
			const first = await insertPolicy(context);
			const second = await insertPolicy(context);

			await insertGroupAssignment(context, first, 'newProjects');
			await insertGroupAssignment(context, second, 'newProjects');

			expect(await count(context, GROUP_ASSIGNMENT_TABLE, first)).toBe(1);
			expect(await count(context, GROUP_ASSIGNMENT_TABLE, second)).toBe(1);
			await context.queryRunner.release();
		});

		it('rejects an assignment of a policy that does not exist', async () => {
			const context = createTestMigrationContext(dataSource);

			await expect(insertGroupAssignment(context, uuidv7(), 'newProjects')).rejects.toThrow();
			await context.queryRunner.release();
		});
	});

	it('drops the rows of both assignment tables when the policy is deleted', async () => {
		const context = createTestMigrationContext(dataSource);
		const projectId = await insertProject(context);
		const policyId = await insertPolicy(context);
		await insertAssignment(context, policyId, projectId);
		await insertGroupAssignment(context, policyId, 'personalProjects');

		await context.runQuery(
			`DELETE FROM ${context.escape.tableName(POLICY_TABLE)} WHERE "id" = :id`,
			{ id: policyId },
		);

		expect(await count(context, ASSIGNMENT_TABLE, policyId)).toBe(0);
		expect(await count(context, GROUP_ASSIGNMENT_TABLE, policyId)).toBe(0);
		await context.queryRunner.release();
	});

	it('creates the columns and the cascading foreign keys of the three tables', async () => {
		const context = createTestMigrationContext(dataSource);
		const getTable = async (name: string) =>
			await context.queryRunner.getTable(`${context.tablePrefix}${name}`);
		const cascadeTo = (column: string, table: string) =>
			expect.objectContaining({
				columnNames: [column],
				referencedTableName: `${context.tablePrefix}${table}`,
				referencedColumnNames: ['id'],
				onDelete: 'CASCADE',
			});
		const idType = context.isPostgres ? 'uuid' : 'varchar';

		const policy = await getTable(POLICY_TABLE);
		expect(policy?.columns.map(({ name, type }) => [name, type])).toEqual(
			expect.arrayContaining([
				['id', idType],
				['maxExecutions', 'integer'],
			]),
		);
		expect(policy?.columns.map(({ name }) => name).sort()).toEqual(
			['createdAt', 'id', 'maxExecutions', 'name', 'updatedAt'].sort(),
		);
		expect(policy?.foreignKeys).toHaveLength(0);

		const assignment = await getTable(ASSIGNMENT_TABLE);
		expect(assignment?.columns.map(({ name }) => name).sort()).toEqual(
			['createdAt', 'policyId', 'projectId'].sort(),
		);
		expect(assignment?.foreignKeys).toHaveLength(2);
		expect(assignment?.foreignKeys).toEqual(
			expect.arrayContaining([
				cascadeTo('policyId', POLICY_TABLE),
				cascadeTo('projectId', 'project'),
			]),
		);

		const groupAssignment = await getTable(GROUP_ASSIGNMENT_TABLE);
		expect(groupAssignment?.columns.map(({ name }) => name).sort()).toEqual(
			['createdAt', 'group', 'policyId'].sort(),
		);
		expect(groupAssignment?.foreignKeys).toEqual([cascadeTo('policyId', POLICY_TABLE)]);
		await context.queryRunner.release();
	});

	it('removes the single project limit table', async () => {
		const context = createTestMigrationContext(dataSource);

		expect(await context.queryRunner.hasTable(`${context.tablePrefix}${OLD_TABLE}`)).toBe(false);
		await context.queryRunner.release();
	});

	it('drops the three tables on down, restores the old table and can be re-applied', async () => {
		await undoLastSingleMigration();

		const context = createTestMigrationContext(dataSource);
		const prefixed = (table: string) => `${context.tablePrefix}${table}`;
		for (const table of [POLICY_TABLE, ASSIGNMENT_TABLE, GROUP_ASSIGNMENT_TABLE]) {
			expect(await context.queryRunner.hasTable(prefixed(table))).toBe(false);
		}
		const restored = await context.queryRunner.getTable(prefixed(OLD_TABLE));
		expect(restored?.columns.map(({ name }) => name).sort()).toEqual(
			['createdAt', 'maxExecutions', 'projectId', 'updatedAt'].sort(),
		);
		expect(restored?.foreignKeys).toEqual([
			expect.objectContaining({
				columnNames: ['projectId'],
				referencedTableName: prefixed('project'),
				onDelete: 'CASCADE',
			}),
		]);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		const afterContext = createTestMigrationContext(dataSource);
		for (const table of [POLICY_TABLE, ASSIGNMENT_TABLE, GROUP_ASSIGNMENT_TABLE]) {
			expect(await afterContext.queryRunner.hasTable(prefixed(table))).toBe(true);
		}
		expect(await afterContext.queryRunner.hasTable(prefixed(OLD_TABLE))).toBe(false);
		await afterContext.queryRunner.release();
	});
});
