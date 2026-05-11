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

const MIGRATION_NAME = 'AddWorkflowUnpublishScopeToCustomRoles1769900001000';

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

describe('AddWorkflowUnpublishScopeToCustomRoles Migration', () => {
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

		const rows = await context.runQuery<RoleScopeRow[]>(
			`SELECT ${roleSlugColumn} AS "roleSlug", ${scopeSlugColumn} AS "scopeSlug" FROM ${tableName} WHERE ${roleSlugColumn} = :roleSlug`,
			{ roleSlug },
		);

		return rows;
	}

	async function getRoleScopesByScope(
		context: TestMigrationContext,
		scopeSlug: string,
	): Promise<RoleScopeRow[]> {
		const tableName = context.escape.tableName('role_scope');
		const roleSlugColumn = context.escape.columnName('roleSlug');
		const scopeSlugColumn = context.escape.columnName('scopeSlug');

		const rows = await context.runQuery<RoleScopeRow[]>(
			`SELECT ${roleSlugColumn} AS "roleSlug", ${scopeSlugColumn} AS "scopeSlug" FROM ${tableName} WHERE ${scopeSlugColumn} = :scopeSlug`,
			{ scopeSlug },
		);

		return rows;
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
		it('should create workflow:unpublish scope when it does not exist', async () => {
			const context = createTestMigrationContext(dataSource);

			expect(await getScopeBySlug(context, 'workflow:unpublish')).toBeNull();

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const scope = await getScopeBySlug(postContext, 'workflow:unpublish');
			expect(scope).not.toBeNull();
			expect(scope?.slug).toBe('workflow:unpublish');

			await postContext.queryRunner.release();
		});

		it('should add workflow:unpublish to roles that have workflow:publish except project:personalOwner', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:publish',
				displayName: 'Publish Workflow',
				description: 'Allows publishing workflows.',
			});
			await insertTestScope(context, {
				slug: 'workflow:read',
				displayName: 'Read Workflow',
				description: 'Allows reading workflows.',
			});

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

			await insertTestRoleScope(context, {
				roleSlug: 'custom-editor',
				scopeSlug: 'workflow:publish',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'project:personalOwner',
				scopeSlug: 'workflow:publish',
			});

			const customEditorBefore = await getRoleScopesByRole(context, 'custom-editor');
			expect(customEditorBefore.map((s) => s.scopeSlug)).toEqual(['workflow:publish']);

			const unpublishBefore = await getRoleScopesByScope(context, 'workflow:unpublish');
			expect(unpublishBefore).toHaveLength(0);

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);

			const customEditorAfter = await getRoleScopesByRole(postContext, 'custom-editor');
			expect(customEditorAfter.map((s) => s.scopeSlug).sort()).toEqual([
				'workflow:publish',
				'workflow:unpublish',
			]);

			const personalOwnerAfter = await getRoleScopesByRole(postContext, 'project:personalOwner');
			expect(personalOwnerAfter.map((s) => s.scopeSlug)).toEqual(['workflow:publish']);
			expect(personalOwnerAfter.some((s) => s.scopeSlug === 'workflow:unpublish')).toBe(false);

			const unpublishAfter = await getRoleScopesByScope(postContext, 'workflow:unpublish');
			expect(unpublishAfter).toHaveLength(1);
			expect(unpublishAfter[0].roleSlug).toBe('custom-editor');

			await postContext.queryRunner.release();
		});

		it('should not add workflow:unpublish to project:personalOwner even when it has workflow:publish', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:publish',
				displayName: 'Publish Workflow',
				description: 'Allows publishing workflows.',
			});
			await insertTestRole(context, {
				slug: 'project:personalOwner',
				displayName: 'Personal Owner',
				roleType: 'project',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'project:personalOwner',
				scopeSlug: 'workflow:publish',
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const personalOwnerScopes = await getRoleScopesByRole(postContext, 'project:personalOwner');
			expect(personalOwnerScopes.map((s) => s.scopeSlug)).toEqual(['workflow:publish']);
			expect(personalOwnerScopes.some((s) => s.scopeSlug === 'workflow:unpublish')).toBe(false);

			await postContext.queryRunner.release();
		});

		it('should not duplicate workflow:unpublish for roles that already have it', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:publish',
				displayName: 'Publish Workflow',
				description: 'Allows publishing workflows.',
			});
			await insertTestScope(context, {
				slug: 'workflow:unpublish',
				displayName: 'Unpublish Workflow',
				description: 'Allows unpublishing workflows.',
			});
			await insertTestRole(context, {
				slug: 'already-has-unpublish',
				displayName: 'Already Has Unpublish',
				roleType: 'project',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'already-has-unpublish',
				scopeSlug: 'workflow:publish',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'already-has-unpublish',
				scopeSlug: 'workflow:unpublish',
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const scopes = await getRoleScopesByRole(postContext, 'already-has-unpublish');
			const unpublishCount = scopes.filter((s) => s.scopeSlug === 'workflow:unpublish').length;
			expect(unpublishCount).toBe(1);

			await postContext.queryRunner.release();
		});
	});

	describe('down migration', () => {
		it('should remove all workflow:unpublish role_scope entries', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestScope(context, {
				slug: 'workflow:publish',
				displayName: 'Publish Workflow',
				description: 'Allows publishing workflows.',
			});
			await insertTestRole(context, {
				slug: 'role-with-publish',
				displayName: 'Role With Publish',
				roleType: 'project',
			});
			await insertTestRoleScope(context, {
				roleSlug: 'role-with-publish',
				scopeSlug: 'workflow:publish',
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const afterUp = createTestMigrationContext(dataSource);
			const unpublishAfterUp = await getRoleScopesByScope(afterUp, 'workflow:unpublish');
			expect(unpublishAfterUp.length).toBeGreaterThan(0);
			await afterUp.queryRunner.release();

			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const unpublishAfterDown = await getRoleScopesByScope(postContext, 'workflow:unpublish');
			expect(unpublishAfterDown).toHaveLength(0);

			const roleScopesAfterDown = await getRoleScopesByRole(postContext, 'role-with-publish');
			expect(roleScopesAfterDown.map((s) => s.scopeSlug)).toEqual(['workflow:publish']);

			await postContext.queryRunner.release();
		});
	});
});
