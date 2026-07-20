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

const MIGRATION_NAME = 'MakeRoleMappingRuleRoleNullable1784556173999';

describe('MakeRoleMappingRuleRoleNullable Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		// Note: Migration tests must run sequentially (maxWorkers: 1) to avoid conflicts
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertRole(context: TestMigrationContext, slug: string): Promise<void> {
		const table = context.escape.tableName('role');
		const columns = ['slug', 'displayName', 'roleType', 'systemRole', 'createdAt', 'updatedAt']
			.map((c) => context.escape.columnName(c))
			.join(', ');

		await context.runQuery(
			`INSERT INTO ${table} (${columns}) VALUES (:slug, :displayName, :roleType, :systemRole, :createdAt, :updatedAt)`,
			{
				slug,
				displayName: 'Test Role',
				roleType: 'global',
				systemRole: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertRule(
		context: TestMigrationContext,
		id: string,
		roleSlug: string | null,
		order: number,
	): Promise<void> {
		const table = context.escape.tableName('role_mapping_rule');
		const columns = ['id', 'expression', 'role', 'type', 'order', 'createdAt', 'updatedAt']
			.map((c) => context.escape.columnName(c))
			.join(', ');

		await context.runQuery(
			`INSERT INTO ${table} (${columns}) VALUES (:id, :expression, :role, :type, :order, :createdAt, :updatedAt)`,
			{
				id,
				expression: 'claims.group === "test"',
				role: roleSlug,
				type: 'instance',
				order,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertProjectWithRuleLink(
		context: TestMigrationContext,
		projectId: string,
		ruleId: string,
	): Promise<void> {
		const projectTable = context.escape.tableName('project');
		const projectColumns = ['id', 'name', 'type', 'createdAt', 'updatedAt']
			.map((c) => context.escape.columnName(c))
			.join(', ');
		await context.runQuery(
			`INSERT INTO ${projectTable} (${projectColumns}) VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
			{
				id: projectId,
				name: 'Test Project',
				type: 'team',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);

		const joinTable = context.escape.tableName('role_mapping_rule_project');
		const joinColumns = ['roleMappingRuleId', 'projectId']
			.map((c) => context.escape.columnName(c))
			.join(', ');
		await context.runQuery(
			`INSERT INTO ${joinTable} (${joinColumns}) VALUES (:ruleId, :projectId)`,
			{ ruleId, projectId },
		);
	}

	async function getRuleRoles(
		context: TestMigrationContext,
	): Promise<Array<{ id: string; role: string | null }>> {
		const table = context.escape.tableName('role_mapping_rule');
		const idColumn = context.escape.columnName('id');
		const roleColumn = context.escape.columnName('role');

		return await context.runQuery(
			`SELECT ${idColumn} as "id", ${roleColumn} as "role" FROM ${table}`,
		);
	}

	async function countRuleProjectLinks(
		context: TestMigrationContext,
		ruleId: string,
	): Promise<number> {
		const table = context.escape.tableName('role_mapping_rule_project');
		const ruleIdColumn = context.escape.columnName('roleMappingRuleId');

		const rows: Array<{ count: number | string }> = await context.runQuery(
			`SELECT COUNT(*) as "count" FROM ${table} WHERE ${ruleIdColumn} = :ruleId`,
			{ ruleId },
		);
		return Number(rows[0].count);
	}

	it('should keep existing rules and their project links and allow rules without a role', async () => {
		const roleSlug = `global:test-${nanoid(8)}`;
		const ruleId = nanoid(16);
		const projectId = nanoid();

		let context = createTestMigrationContext(dataSource);
		await insertRole(context, roleSlug);
		await insertRule(context, ruleId, roleSlug, 0);
		// Join-table rows reference the rule with ON DELETE CASCADE — they must
		// survive the SQLite table recreation performed by this migration.
		await insertProjectWithRuleLink(context, projectId, ruleId);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);

		dataSource = Container.get(DataSource);
		context = createTestMigrationContext(dataSource);

		const rules = await getRuleRoles(context);
		expect(rules).toHaveLength(1);
		expect(rules[0]).toEqual({ id: ruleId, role: roleSlug });
		expect(await countRuleProjectLinks(context, ruleId)).toBe(1);

		// The relaxed constraint accepts rules without a role (block access)
		const blockRuleId = nanoid(16);
		await insertRule(context, blockRuleId, null, 1);
		const rulesAfterInsert = await getRuleRoles(context);
		expect(rulesAfterInsert.find((r) => r.id === blockRuleId)?.role).toBeNull();

		await context.queryRunner.release();
	});

	it('should delete block-access rules and restore the constraint on rollback', async () => {
		await runSingleMigration(MIGRATION_NAME);

		dataSource = Container.get(DataSource);
		let context = createTestMigrationContext(dataSource);

		const roleSlug = `global:test-${nanoid(8)}`;
		const roleRuleId = nanoid(16);
		const blockRuleId = nanoid(16);
		await insertRole(context, roleSlug);
		await insertRule(context, roleRuleId, roleSlug, 0);
		await insertRule(context, blockRuleId, null, 1);
		await context.queryRunner.release();

		await undoLastSingleMigration();

		dataSource = Container.get(DataSource);
		context = createTestMigrationContext(dataSource);

		// The rule without a role cannot be represented and is dropped; the rest survive
		const rules = await getRuleRoles(context);
		expect(rules).toHaveLength(1);
		expect(rules[0]).toEqual({ id: roleRuleId, role: roleSlug });

		// NOT NULL is enforced again
		await expect(insertRule(context, nanoid(16), null, 2)).rejects.toThrow();

		await context.queryRunner.release();
	});
});
