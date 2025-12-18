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

const MIGRATION_NAME = 'AddWorkflowPublishScopeToProjectRoles1766064542000';

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

describe('AddWorkflowPublishScopeToProjectRoles Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);

		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	/**
	 * Helper function to insert a test scope
	 */
	async function insertTestScope(
		context: TestMigrationContext,
		scopeData: ScopeData,
	): Promise<void> {
		const tableName = context.escape.tableName('scope');
		const slugColumn = context.escape.columnName('slug');
		const displayNameColumn = context.escape.columnName('displayName');
		const descriptionColumn = context.escape.columnName('description');

		const existingScope = await context.queryRunner.query(
			`SELECT ${slugColumn} FROM ${tableName} WHERE ${slugColumn} = ?`,
			[scopeData.slug],
		);

		if (existingScope.length === 0) {
			await context.queryRunner.query(
				`INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${descriptionColumn}) VALUES (?, ?, ?)`,
				[scopeData.slug, scopeData.displayName, scopeData.description],
			);
		}
	}

	/**
	 * Helper function to insert a test role
	 */
	async function insertTestRole(context: TestMigrationContext, roleData: RoleData): Promise<void> {
		const tableName = context.escape.tableName('role');
		const slugColumn = context.escape.columnName('slug');
		const displayNameColumn = context.escape.columnName('displayName');
		const roleTypeColumn = context.escape.columnName('roleType');
		const systemRoleColumn = context.escape.columnName('systemRole');
		const createdAtColumn = context.escape.columnName('createdAt');
		const updatedAtColumn = context.escape.columnName('updatedAt');

		const systemRole = roleData.systemRole ?? false;

		await context.queryRunner.query(
			`INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${roleTypeColumn}, ${systemRoleColumn}, ${createdAtColumn}, ${updatedAtColumn}) VALUES (?, ?, ?, ?, ?, ?)`,
			[roleData.slug, roleData.displayName, roleData.roleType, systemRole, new Date(), new Date()],
		);
	}

	/**
	 * Helper function to link a role to a scope
	 */
	async function insertTestRoleScope(
		context: TestMigrationContext,
		roleScopeData: RoleScopeData,
	): Promise<void> {
		const tableName = context.escape.tableName('role_scope');
		const roleSlugColumn = context.escape.columnName('roleSlug');
		const scopeSlugColumn = context.escape.columnName('scopeSlug');

		await context.queryRunner.query(
			`INSERT INTO ${tableName} (${roleSlugColumn}, ${scopeSlugColumn}) VALUES (?, ?)`,
			[roleScopeData.roleSlug, roleScopeData.scopeSlug],
		);
	}

	/**
	 * Helper function to get all scopes for a given role
	 */
	async function getRoleScopesByRole(
		context: TestMigrationContext,
		roleSlug: string,
	): Promise<RoleScopeRow[]> {
		const tableName = context.escape.tableName('role_scope');
		const roleSlugColumn = context.escape.columnName('roleSlug');
		const scopeSlugColumn = context.escape.columnName('scopeSlug');

		const scopes = await context.queryRunner.query(
			`SELECT ${roleSlugColumn} as roleSlug, ${scopeSlugColumn} as scopeSlug FROM ${tableName} WHERE ${roleSlugColumn} = ?`,
			[roleSlug],
		);

		return scopes;
	}

	/**
	 * Helper function to get all role_scope entries for a given scope
	 */
	async function getRoleScopesByScope(
		context: TestMigrationContext,
		scopeSlug: string,
	): Promise<RoleScopeRow[]> {
		const tableName = context.escape.tableName('role_scope');
		const roleSlugColumn = context.escape.columnName('roleSlug');
		const scopeSlugColumn = context.escape.columnName('scopeSlug');

		const roleScopeEntries = await context.queryRunner.query(
			`SELECT ${roleSlugColumn} as roleSlug, ${scopeSlugColumn} as scopeSlug FROM ${tableName} WHERE ${scopeSlugColumn} = ?`,
			[scopeSlug],
		);

		return roleScopeEntries;
	}

	describe('up migration', () => {
		it('adds the workflow:publish scope to any project role that has the workflow:update scope', async () => {
			const context = createTestMigrationContext(dataSource);

			// Insert prerequisite scopes
			await insertTestScope(context, {
				slug: 'workflow:update',
				displayName: 'Update Workflow',
				description: 'Allows updating workflows.',
			});
			await insertTestScope(context, {
				slug: 'workflow:read',
				displayName: 'Read Workflow',
				description: 'Allows reading workflows.',
			});

			// Insert test roles (unique slugs for test independence)
			// test1-project-editor: has workflow:update → should get workflow:publish
			await insertTestRole(context, {
				slug: 'test1-project-editor',
				displayName: 'Test1 Project Editor',
				roleType: 'project',
			});

			// test1-project-admin: has workflow:update + workflow:read → should get workflow:publish
			await insertTestRole(context, {
				slug: 'test1-project-admin',
				displayName: 'Test1 Project Admin',
				roleType: 'project',
			});

			// test1-project-viewer: has workflow:read only → should NOT get workflow:publish
			await insertTestRole(context, {
				slug: 'test1-project-viewer',
				displayName: 'Test1 Project Viewer',
				roleType: 'project',
			});

			// test1-global-admin: has workflow:update but is NOT a project role → should NOT get workflow:publish
			await insertTestRole(context, {
				slug: 'test1-global-admin',
				displayName: 'Test1 Global Admin',
				roleType: 'global',
			});

			// Link roles to scopes
			await insertTestRoleScope(context, {
				roleSlug: 'test1-project-editor',
				scopeSlug: 'workflow:update',
			});

			await insertTestRoleScope(context, {
				roleSlug: 'test1-project-admin',
				scopeSlug: 'workflow:update',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'test1-project-admin',
				scopeSlug: 'workflow:read',
			});

			await insertTestRoleScope(context, {
				roleSlug: 'test1-project-viewer',
				scopeSlug: 'workflow:read',
			});

			await insertTestRoleScope(context, {
				roleSlug: 'test1-global-admin',
				scopeSlug: 'workflow:update',
			});

			// Verify pre-migration state
			const editorScopesBefore = await getRoleScopesByRole(context, 'test1-project-editor');
			expect(editorScopesBefore).toHaveLength(1);
			expect(editorScopesBefore[0].scopeSlug).toBe('workflow:update');

			const adminScopesBefore = await getRoleScopesByRole(context, 'test1-project-admin');
			expect(adminScopesBefore).toHaveLength(2);

			const publishScopesBefore = await getRoleScopesByScope(context, 'workflow:publish');
			expect(publishScopesBefore).toHaveLength(0);

			// Run migration
			await runSingleMigration(MIGRATION_NAME);

			// Release old context
			await context.queryRunner.release();

			// Create fresh context after migration
			const postContext = createTestMigrationContext(dataSource);

			// Verify post-migration state
			// test1-project-editor should have workflow:publish
			const editorScopesAfter = await getRoleScopesByRole(postContext, 'test1-project-editor');
			expect(editorScopesAfter).toHaveLength(2);
			expect(editorScopesAfter.map((s) => s.scopeSlug).sort()).toEqual([
				'workflow:publish',
				'workflow:update',
			]);

			// test1-project-admin should have workflow:publish
			const adminScopesAfter = await getRoleScopesByRole(postContext, 'test1-project-admin');
			expect(adminScopesAfter).toHaveLength(3);
			expect(adminScopesAfter.map((s) => s.scopeSlug).sort()).toEqual([
				'workflow:publish',
				'workflow:read',
				'workflow:update',
			]);

			// test1-project-viewer should NOT have workflow:publish
			const viewerScopesAfter = await getRoleScopesByRole(postContext, 'test1-project-viewer');
			expect(viewerScopesAfter).toHaveLength(1);
			expect(viewerScopesAfter[0].scopeSlug).toBe('workflow:read');

			// test1-global-admin should NOT have workflow:publish
			const globalAdminScopesAfter = await getRoleScopesByRole(postContext, 'test1-global-admin');
			expect(globalAdminScopesAfter).toHaveLength(1);
			expect(globalAdminScopesAfter[0].scopeSlug).toBe('workflow:update');

			// Cleanup
			await postContext.queryRunner.release();
		});

		it('does nothing if the project role to update has a conflict while updating', async () => {
			const context = createTestMigrationContext(dataSource);

			// Insert scopes
			await insertTestScope(context, {
				slug: 'workflow:update',
				displayName: 'Update Workflow',
				description: 'Allows updating workflows.',
			});
			await insertTestScope(context, {
				slug: 'workflow:publish',
				displayName: 'Publish Workflow',
				description: 'Allows publishing and unpublishing workflows.',
			});

			// Insert project role (unique slug for test independence)
			await insertTestRole(context, {
				slug: 'test2-project-editor-existing',
				displayName: 'Test2 Project Editor Existing',
				roleType: 'project',
			});

			// Link role to BOTH workflow:update AND workflow:publish (already has both)
			await insertTestRoleScope(context, {
				roleSlug: 'test2-project-editor-existing',
				scopeSlug: 'workflow:update',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'test2-project-editor-existing',
				scopeSlug: 'workflow:publish',
			});

			// Verify pre-migration: role already has both scopes
			const scopesBefore = await getRoleScopesByRole(context, 'test2-project-editor-existing');
			expect(scopesBefore).toHaveLength(2);
			expect(scopesBefore.map((s) => s.scopeSlug).sort()).toEqual([
				'workflow:publish',
				'workflow:update',
			]);

			// Run migration (should handle conflict gracefully)
			await runSingleMigration(MIGRATION_NAME);

			// Release old context
			await context.queryRunner.release();

			// Create fresh context after migration
			const postContext = createTestMigrationContext(dataSource);

			// Verify post-migration: role still has both scopes, no duplicates
			const scopesAfter = await getRoleScopesByRole(postContext, 'test2-project-editor-existing');
			expect(scopesAfter).toHaveLength(2);
			expect(scopesAfter.map((s) => s.scopeSlug).sort()).toEqual([
				'workflow:publish',
				'workflow:update',
			]);

			// Verify exactly ONE workflow:publish entry for this role
			const publishScopes = scopesAfter.filter((s) => s.scopeSlug === 'workflow:publish');
			expect(publishScopes).toHaveLength(1);

			// Cleanup
			await postContext.queryRunner.release();
		});
	});

	describe('down migration', () => {
		it('removes the workflow:publish scope from any project role', async () => {
			// First run up migration to set up data
			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);

			// Verify workflow:publish entries exist
			const publishScopesBefore = await getRoleScopesByScope(context, 'workflow:publish');
			expect(publishScopesBefore.length).toBeGreaterThan(0);

			// Also verify workflow:update entries exist (should remain after rollback)
			const updateScopesBefore = await getRoleScopesByScope(context, 'workflow:update');
			expect(updateScopesBefore.length).toBeGreaterThan(0);

			await context.queryRunner.release();

			// Run rollback
			await undoLastSingleMigration();

			// Create fresh context after rollback
			const postContext = createTestMigrationContext(dataSource);

			// Verify workflow:publish entries are removed
			const publishScopesAfter = await getRoleScopesByScope(postContext, 'workflow:publish');
			expect(publishScopesAfter).toHaveLength(0);

			// Verify workflow:update entries remain intact
			const updateScopesAfter = await getRoleScopesByScope(postContext, 'workflow:update');
			expect(updateScopesAfter.length).toBe(updateScopesBefore.length);

			// Cleanup
			await postContext.queryRunner.release();
		});
	});
});
