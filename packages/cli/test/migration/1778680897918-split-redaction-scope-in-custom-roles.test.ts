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

const MIGRATION_NAME = 'SplitRedactionScopeInCustomRoles1778680897918';

interface ScopeData {
	slug: string;
	displayName: string;
	description: string;
}

interface RoleData {
	slug: string;
	displayName: string;
	roleType: string;
}

interface RoleScopeData {
	roleSlug: string;
	scopeSlug: string;
}

interface RoleScopeRow {
	roleSlug: string;
	scopeSlug: string;
}

describe('SplitRedactionScopeInCustomRoles Migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertTestScope(context: TestMigrationContext, data: ScopeData): Promise<void> {
		const table = context.escape.tableName('scope');
		const slug = context.escape.columnName('slug');
		const displayName = context.escape.columnName('displayName');
		const description = context.escape.columnName('description');

		const existing = await context.runQuery<unknown[]>(
			`SELECT ${slug} FROM ${table} WHERE ${slug} = :slug`,
			{ slug: data.slug },
		);
		if (existing.length === 0) {
			await context.runQuery(
				`INSERT INTO ${table} (${slug}, ${displayName}, ${description}) VALUES (:slug, :displayName, :description)`,
				{ slug: data.slug, displayName: data.displayName, description: data.description },
			);
		}
	}

	async function insertTestRole(context: TestMigrationContext, data: RoleData): Promise<void> {
		const table = context.escape.tableName('role');
		const slug = context.escape.columnName('slug');
		const displayName = context.escape.columnName('displayName');
		const roleType = context.escape.columnName('roleType');
		const systemRole = context.escape.columnName('systemRole');
		const createdAt = context.escape.columnName('createdAt');
		const updatedAt = context.escape.columnName('updatedAt');

		const sql = context.isPostgres
			? `INSERT INTO ${table} (${slug}, ${displayName}, ${roleType}, ${systemRole}, ${createdAt}, ${updatedAt}) VALUES (:slug, :displayName, :roleType, :systemRole, :createdAt, :updatedAt) ON CONFLICT (${slug}) DO NOTHING`
			: `INSERT OR IGNORE INTO ${table} (${slug}, ${displayName}, ${roleType}, ${systemRole}, ${createdAt}, ${updatedAt}) VALUES (:slug, :displayName, :roleType, :systemRole, :createdAt, :updatedAt)`;

		await context.runQuery(sql, {
			slug: data.slug,
			displayName: data.displayName,
			roleType: data.roleType,
			systemRole: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	async function insertTestRoleScope(
		context: TestMigrationContext,
		data: RoleScopeData,
	): Promise<void> {
		const table = context.escape.tableName('role_scope');
		const roleSlug = context.escape.columnName('roleSlug');
		const scopeSlug = context.escape.columnName('scopeSlug');

		await context.runQuery(
			`INSERT INTO ${table} (${roleSlug}, ${scopeSlug}) VALUES (:roleSlug, :scopeSlug)`,
			{ roleSlug: data.roleSlug, scopeSlug: data.scopeSlug },
		);
	}

	async function getRoleScopesByRole(
		context: TestMigrationContext,
		roleSlug: string,
	): Promise<RoleScopeRow[]> {
		const table = context.escape.tableName('role_scope');
		const roleSlugCol = context.escape.columnName('roleSlug');
		const scopeSlugCol = context.escape.columnName('scopeSlug');

		return await context.runQuery<RoleScopeRow[]>(
			`SELECT ${roleSlugCol} AS "roleSlug", ${scopeSlugCol} AS "scopeSlug" FROM ${table} WHERE ${roleSlugCol} = :roleSlug`,
			{ roleSlug },
		);
	}

	async function getRoleScopesByScope(
		context: TestMigrationContext,
		scopeSlug: string,
	): Promise<RoleScopeRow[]> {
		const table = context.escape.tableName('role_scope');
		const roleSlugCol = context.escape.columnName('roleSlug');
		const scopeSlugCol = context.escape.columnName('scopeSlug');

		return await context.runQuery<RoleScopeRow[]>(
			`SELECT ${roleSlugCol} AS "roleSlug", ${scopeSlugCol} AS "scopeSlug" FROM ${table} WHERE ${scopeSlugCol} = :scopeSlug`,
			{ scopeSlug },
		);
	}

	async function getScopeBySlug(
		context: TestMigrationContext,
		slug: string,
	): Promise<{ slug: string } | null> {
		const table = context.escape.tableName('scope');
		const slugCol = context.escape.columnName('slug');

		const rows = await context.runQuery<Array<Record<string, string>>>(
			`SELECT ${slugCol} AS "slug" FROM ${table} WHERE ${slugCol} = :slug`,
			{ slug },
		);
		return rows[0] ? (rows[0] as { slug: string }) : null;
	}

	describe('up migration', () => {
		it('should insert workflow:enableRedaction and workflow:disableRedaction into the scope table', async () => {
			const context = createTestMigrationContext(dataSource);

			expect(await getScopeBySlug(context, 'workflow:enableRedaction')).toBeNull();
			expect(await getScopeBySlug(context, 'workflow:disableRedaction')).toBeNull();

			await context.queryRunner.release();
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);

			expect((await getScopeBySlug(postContext, 'workflow:enableRedaction'))?.slug).toBe(
				'workflow:enableRedaction',
			);
			expect((await getScopeBySlug(postContext, 'workflow:disableRedaction'))?.slug).toBe(
				'workflow:disableRedaction',
			);

			await postContext.queryRunner.release();
		});

		it('should grant both new scopes to roles that had workflow:updateRedactionSetting', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:updateRedactionSetting',
				displayName: 'Manage Data Redaction',
				description: 'Allows managing data redaction on workflows.',
			});
			await insertTestRole(context, {
				slug: 'custom-admin',
				displayName: 'Custom Admin',
				roleType: 'project',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'custom-admin',
				scopeSlug: 'workflow:updateRedactionSetting',
			});

			await context.queryRunner.release();
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const scopes = await getRoleScopesByRole(postContext, 'custom-admin');
			const slugs = scopes.map((s) => s.scopeSlug).sort();

			expect(slugs).toContain('workflow:enableRedaction');
			expect(slugs).toContain('workflow:disableRedaction');
			expect(slugs).not.toContain('workflow:updateRedactionSetting');

			await postContext.queryRunner.release();
		});

		it('should remove workflow:updateRedactionSetting from role_scope and scope table', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:updateRedactionSetting',
				displayName: 'Manage Data Redaction',
				description: 'Allows managing data redaction on workflows.',
			});
			await insertTestRole(context, {
				slug: 'role-with-old-scope',
				displayName: 'Role With Old Scope',
				roleType: 'project',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'role-with-old-scope',
				scopeSlug: 'workflow:updateRedactionSetting',
			});

			await context.queryRunner.release();
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);

			const oldScopeEntries = await getRoleScopesByScope(
				postContext,
				'workflow:updateRedactionSetting',
			);
			expect(oldScopeEntries).toHaveLength(0);

			expect(await getScopeBySlug(postContext, 'workflow:updateRedactionSetting')).toBeNull();

			await postContext.queryRunner.release();
		});

		it('should not grant new scopes to roles that did not have workflow:updateRedactionSetting', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:read',
				displayName: 'Read Workflow',
				description: 'Allows reading workflows.',
			});
			await insertTestRole(context, {
				slug: 'read-only-role',
				displayName: 'Read Only Role',
				roleType: 'project',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'read-only-role',
				scopeSlug: 'workflow:read',
			});

			await context.queryRunner.release();
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const scopes = await getRoleScopesByRole(postContext, 'read-only-role');
			const slugs = scopes.map((s) => s.scopeSlug);

			expect(slugs).not.toContain('workflow:enableRedaction');
			expect(slugs).not.toContain('workflow:disableRedaction');

			await postContext.queryRunner.release();
		});

		it('should not duplicate new scopes for roles that already have them', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:updateRedactionSetting',
				displayName: 'Manage Data Redaction',
				description: 'Allows managing data redaction on workflows.',
			});
			await insertTestScope(context, {
				slug: 'workflow:enableRedaction',
				displayName: 'Enable Data Redaction',
				description: 'Allows enabling data redaction on workflows.',
			});
			await insertTestRole(context, {
				slug: 'role-already-has-enable',
				displayName: 'Role Already Has Enable',
				roleType: 'project',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'role-already-has-enable',
				scopeSlug: 'workflow:updateRedactionSetting',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'role-already-has-enable',
				scopeSlug: 'workflow:enableRedaction',
			});

			await context.queryRunner.release();
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const scopes = await getRoleScopesByRole(postContext, 'role-already-has-enable');
			const enableCount = scopes.filter((s) => s.scopeSlug === 'workflow:enableRedaction').length;
			expect(enableCount).toBe(1);

			await postContext.queryRunner.release();
		});

		it('should handle multiple roles independently', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:updateRedactionSetting',
				displayName: 'Manage Data Redaction',
				description: 'Allows managing data redaction on workflows.',
			});
			await insertTestScope(context, {
				slug: 'workflow:read',
				displayName: 'Read Workflow',
				description: 'Allows reading workflows.',
			});

			await insertTestRole(context, {
				slug: 'role-with-redaction',
				displayName: 'Role With Redaction',
				roleType: 'project',
			});
			await insertTestRole(context, {
				slug: 'role-without-redaction',
				displayName: 'Role Without Redaction',
				roleType: 'project',
			});

			await insertTestRoleScope(context, {
				roleSlug: 'role-with-redaction',
				scopeSlug: 'workflow:updateRedactionSetting',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'role-without-redaction',
				scopeSlug: 'workflow:read',
			});

			await context.queryRunner.release();
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);

			const withRedaction = await getRoleScopesByRole(postContext, 'role-with-redaction');
			const withRedactionSlugs = withRedaction.map((s) => s.scopeSlug).sort();
			expect(withRedactionSlugs).toEqual(['workflow:disableRedaction', 'workflow:enableRedaction']);

			const withoutRedaction = await getRoleScopesByRole(postContext, 'role-without-redaction');
			const withoutRedactionSlugs = withoutRedaction.map((s) => s.scopeSlug);
			expect(withoutRedactionSlugs).not.toContain('workflow:enableRedaction');
			expect(withoutRedactionSlugs).not.toContain('workflow:disableRedaction');

			await postContext.queryRunner.release();
		});
	});

	describe('down migration', () => {
		it('should restore workflow:updateRedactionSetting and remove both new scopes', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:updateRedactionSetting',
				displayName: 'Manage Data Redaction',
				description: 'Allows managing data redaction on workflows.',
			});
			await insertTestRole(context, {
				slug: 'role-to-revert',
				displayName: 'Role To Revert',
				roleType: 'project',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'role-to-revert',
				scopeSlug: 'workflow:updateRedactionSetting',
			});

			await context.queryRunner.release();
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			// Verify up migration worked
			const afterUp = createTestMigrationContext(dataSource);
			const scopesAfterUp = await getRoleScopesByRole(afterUp, 'role-to-revert');
			expect(scopesAfterUp.map((s) => s.scopeSlug).sort()).toEqual([
				'workflow:disableRedaction',
				'workflow:enableRedaction',
			]);
			await afterUp.queryRunner.release();

			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const scopesAfterDown = await getRoleScopesByRole(postContext, 'role-to-revert');
			const slugs = scopesAfterDown.map((s) => s.scopeSlug);

			expect(slugs).toContain('workflow:updateRedactionSetting');
			expect(slugs).not.toContain('workflow:enableRedaction');
			expect(slugs).not.toContain('workflow:disableRedaction');

			await postContext.queryRunner.release();
		});

		it('should remove both new scopes from role_scope and scope table after down migration', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:updateRedactionSetting',
				displayName: 'Manage Data Redaction',
				description: 'Allows managing data redaction on workflows.',
			});
			await insertTestRole(context, {
				slug: 'another-role',
				displayName: 'Another Role',
				roleType: 'project',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'another-role',
				scopeSlug: 'workflow:updateRedactionSetting',
			});

			await context.queryRunner.release();
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);

			const enableEntries = await getRoleScopesByScope(postContext, 'workflow:enableRedaction');
			expect(enableEntries).toHaveLength(0);

			const disableEntries = await getRoleScopesByScope(postContext, 'workflow:disableRedaction');
			expect(disableEntries).toHaveLength(0);

			expect(await getScopeBySlug(postContext, 'workflow:enableRedaction')).toBeNull();
			expect(await getScopeBySlug(postContext, 'workflow:disableRedaction')).toBeNull();

			await postContext.queryRunner.release();
		});
	});
});
