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

const MIGRATION_NAME = 'AddUnshareScopeToCustomRoles1771500000001';

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

describe('AddUnshareScopeToCustomRoles Migration', () => {
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
		it('should create workflow:unshare and credential:unshare scopes', async () => {
			const context = createTestMigrationContext(dataSource);

			expect(await getScopeBySlug(context, 'workflow:unshare')).toBeNull();
			expect(await getScopeBySlug(context, 'credential:unshare')).toBeNull();

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const workflowScope = await getScopeBySlug(postContext, 'workflow:unshare');
			expect(workflowScope).not.toBeNull();
			expect(workflowScope?.slug).toBe('workflow:unshare');

			const credentialScope = await getScopeBySlug(postContext, 'credential:unshare');
			expect(credentialScope).not.toBeNull();
			expect(credentialScope?.slug).toBe('credential:unshare');

			await postContext.queryRunner.release();
		});

		it('should add unshare scopes to roles that have share scopes, excluding project:personalOwner', async () => {
			const context = createTestMigrationContext(dataSource);

			// Set up scopes
			await insertTestScope(context, {
				slug: 'workflow:share',
				displayName: 'Share Workflow',
				description: 'Allows sharing workflows.',
			});
			await insertTestScope(context, {
				slug: 'credential:share',
				displayName: 'Share Credential',
				description: 'Allows sharing credentials.',
			});

			// Set up roles
			await insertTestRole(context, {
				slug: 'custom-editor',
				displayName: 'Custom Editor',
				roleType: 'project',
			});
			await insertTestRole(context, {
				slug: 'project:personalOwner',
				displayName: 'Personal Owner',
				roleType: 'project',
			});

			// Assign share scopes to both roles
			await insertTestRoleScope(context, {
				roleSlug: 'custom-editor',
				scopeSlug: 'workflow:share',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'custom-editor',
				scopeSlug: 'credential:share',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'project:personalOwner',
				scopeSlug: 'workflow:share',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'project:personalOwner',
				scopeSlug: 'credential:share',
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);

			// custom-editor should get both unshare scopes
			const customEditorScopes = await getRoleScopesByRole(postContext, 'custom-editor');
			const customEditorScopeSlugs = customEditorScopes.map((s) => s.scopeSlug).sort();
			expect(customEditorScopeSlugs).toEqual([
				'credential:share',
				'credential:unshare',
				'workflow:share',
				'workflow:unshare',
			]);

			// project:personalOwner should NOT get unshare scopes from migration
			const personalOwnerScopes = await getRoleScopesByRole(postContext, 'project:personalOwner');
			const personalOwnerScopeSlugs = personalOwnerScopes.map((s) => s.scopeSlug).sort();
			expect(personalOwnerScopeSlugs).toEqual(['credential:share', 'workflow:share']);
			expect(personalOwnerScopeSlugs).not.toContain('workflow:unshare');
			expect(personalOwnerScopeSlugs).not.toContain('credential:unshare');

			await postContext.queryRunner.release();
		});

		it('should not add workflow:unshare to roles without workflow:share', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'credential:share',
				displayName: 'Share Credential',
				description: 'Allows sharing credentials.',
			});
			await insertTestScope(context, {
				slug: 'workflow:read',
				displayName: 'Read Workflow',
				description: 'Allows reading workflows.',
			});

			await insertTestRole(context, {
				slug: 'cred-only-sharer',
				displayName: 'Credential Only Sharer',
				roleType: 'project',
			});

			// Only has credential:share, not workflow:share
			await insertTestRoleScope(context, {
				roleSlug: 'cred-only-sharer',
				scopeSlug: 'credential:share',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'cred-only-sharer',
				scopeSlug: 'workflow:read',
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const scopes = await getRoleScopesByRole(postContext, 'cred-only-sharer');
			const scopeSlugs = scopes.map((s) => s.scopeSlug).sort();

			// Should have credential:unshare but NOT workflow:unshare
			expect(scopeSlugs).toContain('credential:unshare');
			expect(scopeSlugs).not.toContain('workflow:unshare');

			await postContext.queryRunner.release();
		});

		it('should not duplicate unshare scopes for roles that already have them', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:share',
				displayName: 'Share Workflow',
				description: 'Allows sharing workflows.',
			});
			await insertTestScope(context, {
				slug: 'workflow:unshare',
				displayName: 'Unshare Workflow',
				description: 'Allows removing workflow shares.',
			});

			await insertTestRole(context, {
				slug: 'already-has-unshare',
				displayName: 'Already Has Unshare',
				roleType: 'project',
			});

			await insertTestRoleScope(context, {
				roleSlug: 'already-has-unshare',
				scopeSlug: 'workflow:share',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'already-has-unshare',
				scopeSlug: 'workflow:unshare',
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const scopes = await getRoleScopesByRole(postContext, 'already-has-unshare');
			const unshareCount = scopes.filter((s) => s.scopeSlug === 'workflow:unshare').length;
			expect(unshareCount).toBe(1);

			await postContext.queryRunner.release();
		});
	});

	describe('down migration', () => {
		it('should remove all unshare role_scope entries', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:share',
				displayName: 'Share Workflow',
				description: 'Allows sharing workflows.',
			});
			await insertTestScope(context, {
				slug: 'credential:share',
				displayName: 'Share Credential',
				description: 'Allows sharing credentials.',
			});
			await insertTestRole(context, {
				slug: 'role-with-share',
				displayName: 'Role With Share',
				roleType: 'project',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'role-with-share',
				scopeSlug: 'workflow:share',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'role-with-share',
				scopeSlug: 'credential:share',
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			// Verify up migration added the scopes
			const afterUp = createTestMigrationContext(dataSource);
			const workflowUnshareAfterUp = await getRoleScopesByScope(afterUp, 'workflow:unshare');
			expect(workflowUnshareAfterUp.length).toBeGreaterThan(0);
			const credentialUnshareAfterUp = await getRoleScopesByScope(afterUp, 'credential:unshare');
			expect(credentialUnshareAfterUp.length).toBeGreaterThan(0);
			await afterUp.queryRunner.release();

			// Run down migration
			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);

			const workflowUnshareAfterDown = await getRoleScopesByScope(postContext, 'workflow:unshare');
			expect(workflowUnshareAfterDown).toHaveLength(0);

			const credentialUnshareAfterDown = await getRoleScopesByScope(
				postContext,
				'credential:unshare',
			);
			expect(credentialUnshareAfterDown).toHaveLength(0);

			// Original share scopes should still be there
			const roleScopesAfterDown = await getRoleScopesByRole(postContext, 'role-with-share');
			const slugs = roleScopesAfterDown.map((s) => s.scopeSlug).sort();
			expect(slugs).toEqual(['credential:share', 'workflow:share']);

			await postContext.queryRunner.release();
		});
	});
});
