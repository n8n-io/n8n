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

const MIGRATION_NAME = 'SplitRedactionScopeInCustomRoles1784000000012';

const OLD_SCOPE = 'workflow:updateRedactionSetting';
const NEW_ENABLE_SCOPE = 'workflow:enableRedaction';
const NEW_DISABLE_SCOPE = 'workflow:disableRedaction';

interface ScopeData {
	slug: string;
	displayName: string;
	description: string;
}

interface RoleData {
	slug: string;
	displayName: string;
	roleType: string;
	systemRole?: boolean;
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

	async function insertTestScope(
		context: TestMigrationContext,
		scopeData: ScopeData,
	): Promise<void> {
		const tableName = context.escape.tableName('scope');
		const slugColumn = context.escape.columnName('slug');
		const displayNameColumn = context.escape.columnName('displayName');
		const descriptionColumn = context.escape.columnName('description');

		const existingScope = await context.runQuery<unknown[]>(
			`SELECT ${slugColumn} FROM ${tableName} WHERE ${slugColumn} = :slug`,
			{ slug: scopeData.slug },
		);

		if (existingScope.length === 0) {
			await context.runQuery(
				`INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${descriptionColumn}) VALUES (:slug, :displayName, :description)`,
				{
					slug: scopeData.slug,
					displayName: scopeData.displayName,
					description: scopeData.description,
				},
			);
		}
	}

	async function insertTestRole(context: TestMigrationContext, roleData: RoleData): Promise<void> {
		const tableName = context.escape.tableName('role');
		const slugColumn = context.escape.columnName('slug');
		const displayNameColumn = context.escape.columnName('displayName');
		const roleTypeColumn = context.escape.columnName('roleType');
		const systemRoleColumn = context.escape.columnName('systemRole');
		const createdAtColumn = context.escape.columnName('createdAt');
		const updatedAtColumn = context.escape.columnName('updatedAt');

		const systemRole = roleData.systemRole ?? false;

		const insertSql = context.isPostgres
			? `INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${roleTypeColumn}, ${systemRoleColumn}, ${createdAtColumn}, ${updatedAtColumn}) VALUES (:slug, :displayName, :roleType, :systemRole, :createdAt, :updatedAt) ON CONFLICT (${slugColumn}) DO NOTHING`
			: `INSERT OR IGNORE INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${roleTypeColumn}, ${systemRoleColumn}, ${createdAtColumn}, ${updatedAtColumn}) VALUES (:slug, :displayName, :roleType, :systemRole, :createdAt, :updatedAt)`;

		await context.runQuery(insertSql, {
			slug: roleData.slug,
			displayName: roleData.displayName,
			roleType: roleData.roleType,
			systemRole,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	async function insertTestRoleScope(
		context: TestMigrationContext,
		roleScopeData: RoleScopeData,
	): Promise<void> {
		const tableName = context.escape.tableName('role_scope');
		const roleSlugColumn = context.escape.columnName('roleSlug');
		const scopeSlugColumn = context.escape.columnName('scopeSlug');

		await context.runQuery(
			`INSERT INTO ${tableName} (${roleSlugColumn}, ${scopeSlugColumn}) VALUES (:roleSlug, :scopeSlug)`,
			{ roleSlug: roleScopeData.roleSlug, scopeSlug: roleScopeData.scopeSlug },
		);
	}

	async function getRoleScopesByRole(
		context: TestMigrationContext,
		roleSlug: string,
	): Promise<RoleScopeRow[]> {
		const tableName = context.escape.tableName('role_scope');
		const roleSlugColumn = context.escape.columnName('roleSlug');
		const scopeSlugColumn = context.escape.columnName('scopeSlug');

		return await context.runQuery<RoleScopeRow[]>(
			`SELECT ${roleSlugColumn} AS "roleSlug", ${scopeSlugColumn} AS "scopeSlug" FROM ${tableName} WHERE ${roleSlugColumn} = :roleSlug`,
			{ roleSlug },
		);
	}

	async function getRoleScopesByScope(
		context: TestMigrationContext,
		scopeSlug: string,
	): Promise<RoleScopeRow[]> {
		const tableName = context.escape.tableName('role_scope');
		const roleSlugColumn = context.escape.columnName('roleSlug');
		const scopeSlugColumn = context.escape.columnName('scopeSlug');

		return await context.runQuery<RoleScopeRow[]>(
			`SELECT ${roleSlugColumn} AS "roleSlug", ${scopeSlugColumn} AS "scopeSlug" FROM ${tableName} WHERE ${scopeSlugColumn} = :scopeSlug`,
			{ scopeSlug },
		);
	}

	async function getScopeBySlug(
		context: TestMigrationContext,
		slug: string,
	): Promise<{ slug: string } | null> {
		const tableName = context.escape.tableName('scope');
		const slugColumn = context.escape.columnName('slug');

		const rows = await context.runQuery<Array<Record<string, string>>>(
			`SELECT ${slugColumn} AS "slug" FROM ${tableName} WHERE ${slugColumn} = :slug`,
			{ slug },
		);

		return rows[0] ? (rows[0] as { slug: string }) : null;
	}

	describe('up migration', () => {
		it('should create workflow:enableRedaction and workflow:disableRedaction scopes', async () => {
			const context = createTestMigrationContext(dataSource);

			expect(await getScopeBySlug(context, NEW_ENABLE_SCOPE)).toBeNull();
			expect(await getScopeBySlug(context, NEW_DISABLE_SCOPE)).toBeNull();

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const enableScope = await getScopeBySlug(postContext, NEW_ENABLE_SCOPE);
			expect(enableScope).not.toBeNull();
			expect(enableScope?.slug).toBe(NEW_ENABLE_SCOPE);

			const disableScope = await getScopeBySlug(postContext, NEW_DISABLE_SCOPE);
			expect(disableScope).not.toBeNull();
			expect(disableScope?.slug).toBe(NEW_DISABLE_SCOPE);

			await postContext.queryRunner.release();
		});

		it('should grant both new scopes to custom roles that had the old scope, excluding project:personalOwner', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: OLD_SCOPE,
				displayName: 'Update Redaction Setting',
				description: 'Allows updating workflow redaction settings.',
			});

			await insertTestRole(context, {
				slug: 'custom-redaction-admin',
				displayName: 'Custom Redaction Admin',
				roleType: 'project',
			});
			await insertTestRole(context, {
				slug: 'project:personalOwner',
				displayName: 'Personal Owner',
				roleType: 'project',
			});

			await insertTestRoleScope(context, {
				roleSlug: 'custom-redaction-admin',
				scopeSlug: OLD_SCOPE,
			});
			await insertTestRoleScope(context, {
				roleSlug: 'project:personalOwner',
				scopeSlug: OLD_SCOPE,
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);

			const customScopes = await getRoleScopesByRole(postContext, 'custom-redaction-admin');
			const customSlugs = customScopes.map((s) => s.scopeSlug).sort();
			expect(customSlugs).toEqual([OLD_SCOPE, NEW_ENABLE_SCOPE, NEW_DISABLE_SCOPE].sort());

			const personalOwnerScopes = await getRoleScopesByRole(postContext, 'project:personalOwner');
			const personalOwnerSlugs = personalOwnerScopes.map((s) => s.scopeSlug).sort();
			expect(personalOwnerSlugs).toEqual([OLD_SCOPE]);
			expect(personalOwnerSlugs).not.toContain(NEW_ENABLE_SCOPE);
			expect(personalOwnerSlugs).not.toContain(NEW_DISABLE_SCOPE);

			await postContext.queryRunner.release();
		});

		it('should not grant the new scopes to roles without the old scope', async () => {
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
			const slugs = scopes.map((s) => s.scopeSlug).sort();

			expect(slugs).not.toContain(NEW_ENABLE_SCOPE);
			expect(slugs).not.toContain(NEW_DISABLE_SCOPE);
			expect(slugs).toEqual(['workflow:read']);

			await postContext.queryRunner.release();
		});

		it('should not duplicate the new scopes for roles that already have them', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: OLD_SCOPE,
				displayName: 'Update Redaction Setting',
				description: 'Allows updating workflow redaction settings.',
			});
			await insertTestScope(context, {
				slug: NEW_ENABLE_SCOPE,
				displayName: 'Enable Workflow Data Redaction',
				description: 'Allows enabling data redaction on workflows.',
			});

			await insertTestRole(context, {
				slug: 'already-has-enable',
				displayName: 'Already Has Enable Scope',
				roleType: 'project',
			});

			await insertTestRoleScope(context, {
				roleSlug: 'already-has-enable',
				scopeSlug: OLD_SCOPE,
			});
			await insertTestRoleScope(context, {
				roleSlug: 'already-has-enable',
				scopeSlug: NEW_ENABLE_SCOPE,
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const scopes = await getRoleScopesByRole(postContext, 'already-has-enable');
			const enableCount = scopes.filter((s) => s.scopeSlug === NEW_ENABLE_SCOPE).length;
			expect(enableCount).toBe(1);

			await postContext.queryRunner.release();
		});
	});

	describe('down migration', () => {
		it('should remove all role_scope entries for the new scopes', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: OLD_SCOPE,
				displayName: 'Update Redaction Setting',
				description: 'Allows updating workflow redaction settings.',
			});

			await insertTestRole(context, {
				slug: 'role-with-old-scope',
				displayName: 'Role With Old Scope',
				roleType: 'project',
			});

			await insertTestRoleScope(context, {
				roleSlug: 'role-with-old-scope',
				scopeSlug: OLD_SCOPE,
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const afterUp = createTestMigrationContext(dataSource);
			expect((await getRoleScopesByScope(afterUp, NEW_ENABLE_SCOPE)).length).toBeGreaterThan(0);
			expect((await getRoleScopesByScope(afterUp, NEW_DISABLE_SCOPE)).length).toBeGreaterThan(0);
			await afterUp.queryRunner.release();

			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);

			expect(await getRoleScopesByScope(postContext, NEW_ENABLE_SCOPE)).toHaveLength(0);
			expect(await getRoleScopesByScope(postContext, NEW_DISABLE_SCOPE)).toHaveLength(0);

			const remaining = await getRoleScopesByRole(postContext, 'role-with-old-scope');
			const slugs = remaining.map((s) => s.scopeSlug).sort();
			expect(slugs).toEqual([OLD_SCOPE]);

			await postContext.queryRunner.release();
		});
	});
});
