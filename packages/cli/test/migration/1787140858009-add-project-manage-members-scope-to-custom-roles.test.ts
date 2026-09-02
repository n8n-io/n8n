import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'AddProjectManageMembersScopeToCustomRoles1787140858009';

const MANAGE_MEMBERS_SCOPE = 'project:manageMembers';
const UPDATE_SCOPE = 'project:update';

interface RoleData {
	slug: string;
	displayName: string;
	roleType: string;
	systemRole?: boolean;
}

interface RoleScopeRow {
	roleSlug: string;
	scopeSlug: string;
}

describe('AddProjectManageMembersScopeToCustomRoles Migration', () => {
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

	async function insertScope(context: TestMigrationContext, slug: string): Promise<void> {
		const tableName = context.escape.tableName('scope');
		const slugColumn = context.escape.columnName('slug');
		const displayNameColumn = context.escape.columnName('displayName');
		const descriptionColumn = context.escape.columnName('description');

		const existing = await context.runQuery<unknown[]>(
			`SELECT ${slugColumn} FROM ${tableName} WHERE ${slugColumn} = :slug`,
			{ slug },
		);
		if (existing.length > 0) return;

		await context.runQuery(
			`INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${descriptionColumn}) VALUES (:slug, :displayName, :description)`,
			{ slug, displayName: slug, description: null },
		);
	}

	async function insertRole(context: TestMigrationContext, roleData: RoleData): Promise<void> {
		const tableName = context.escape.tableName('role');
		const slugColumn = context.escape.columnName('slug');
		const displayNameColumn = context.escape.columnName('displayName');
		const roleTypeColumn = context.escape.columnName('roleType');
		const systemRoleColumn = context.escape.columnName('systemRole');
		const createdAtColumn = context.escape.columnName('createdAt');
		const updatedAtColumn = context.escape.columnName('updatedAt');

		const insertSql = context.isPostgres
			? `INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${roleTypeColumn}, ${systemRoleColumn}, ${createdAtColumn}, ${updatedAtColumn}) VALUES (:slug, :displayName, :roleType, :systemRole, :createdAt, :updatedAt) ON CONFLICT (${slugColumn}) DO NOTHING`
			: `INSERT OR IGNORE INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${roleTypeColumn}, ${systemRoleColumn}, ${createdAtColumn}, ${updatedAtColumn}) VALUES (:slug, :displayName, :roleType, :systemRole, :createdAt, :updatedAt)`;

		await context.runQuery(insertSql, {
			slug: roleData.slug,
			displayName: roleData.displayName,
			roleType: roleData.roleType,
			systemRole: roleData.systemRole ?? false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	async function grantScope(
		context: TestMigrationContext,
		roleSlug: string,
		scopeSlug: string,
	): Promise<void> {
		const tableName = context.escape.tableName('role_scope');
		const roleSlugColumn = context.escape.columnName('roleSlug');
		const scopeSlugColumn = context.escape.columnName('scopeSlug');

		await context.runQuery(
			`INSERT INTO ${tableName} (${roleSlugColumn}, ${scopeSlugColumn}) VALUES (:roleSlug, :scopeSlug)`,
			{ roleSlug, scopeSlug },
		);
	}

	async function scopesOfRole(context: TestMigrationContext, roleSlug: string): Promise<string[]> {
		const tableName = context.escape.tableName('role_scope');
		const roleSlugColumn = context.escape.columnName('roleSlug');
		const scopeSlugColumn = context.escape.columnName('scopeSlug');

		const rows = await context.runQuery<RoleScopeRow[]>(
			`SELECT ${roleSlugColumn} AS "roleSlug", ${scopeSlugColumn} AS "scopeSlug" FROM ${tableName} WHERE ${roleSlugColumn} = :roleSlug`,
			{ roleSlug },
		);

		return rows.map((r) => r.scopeSlug).sort();
	}

	async function findScope(
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
		it('creates the project:manageMembers scope when it does not exist', async () => {
			const context = createTestMigrationContext(dataSource);
			expect(await findScope(context, MANAGE_MEMBERS_SCOPE)).toBeNull();
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			expect(await findScope(postContext, MANAGE_MEMBERS_SCOPE)).not.toBeNull();
			await postContext.queryRunner.release();
		});

		it('grants project:manageMembers to custom project roles that have project:update', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertScope(context, UPDATE_SCOPE);
			await insertRole(context, {
				slug: 'project:custom-admin',
				displayName: 'Custom Admin',
				roleType: 'project',
			});
			await grantScope(context, 'project:custom-admin', UPDATE_SCOPE);

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			expect(await scopesOfRole(postContext, 'project:custom-admin')).toEqual([
				MANAGE_MEMBERS_SCOPE,
				UPDATE_SCOPE,
			]);
			await postContext.queryRunner.release();
		});

		it('leaves custom project roles without project:update untouched', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertScope(context, 'project:read');
			await insertRole(context, {
				slug: 'project:custom-viewer',
				displayName: 'Custom Viewer',
				roleType: 'project',
			});
			await grantScope(context, 'project:custom-viewer', 'project:read');

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			expect(await scopesOfRole(postContext, 'project:custom-viewer')).toEqual(['project:read']);
			await postContext.queryRunner.release();
		});

		it('leaves system roles untouched, since their scopes are reconciled on startup', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertScope(context, UPDATE_SCOPE);
			await insertRole(context, {
				slug: 'project:admin',
				displayName: 'Project Admin',
				roleType: 'project',
				systemRole: true,
			});
			await grantScope(context, 'project:admin', UPDATE_SCOPE);

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			expect(await scopesOfRole(postContext, 'project:admin')).toEqual([UPDATE_SCOPE]);
			await postContext.queryRunner.release();
		});

		it('leaves non-project roles untouched', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertScope(context, UPDATE_SCOPE);
			await insertRole(context, {
				slug: 'global:custom-admin',
				displayName: 'Custom Global Admin',
				roleType: 'global',
			});
			await grantScope(context, 'global:custom-admin', UPDATE_SCOPE);

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			expect(await scopesOfRole(postContext, 'global:custom-admin')).toEqual([UPDATE_SCOPE]);
			await postContext.queryRunner.release();
		});

		it('does not duplicate project:manageMembers for roles that already have it', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertScope(context, UPDATE_SCOPE);
			await insertScope(context, MANAGE_MEMBERS_SCOPE);
			await insertRole(context, {
				slug: 'project:already-granted',
				displayName: 'Already Granted',
				roleType: 'project',
			});
			await grantScope(context, 'project:already-granted', UPDATE_SCOPE);
			await grantScope(context, 'project:already-granted', MANAGE_MEMBERS_SCOPE);

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			expect(await scopesOfRole(postContext, 'project:already-granted')).toEqual([
				MANAGE_MEMBERS_SCOPE,
				UPDATE_SCOPE,
			]);
			await postContext.queryRunner.release();
		});
	});
});
