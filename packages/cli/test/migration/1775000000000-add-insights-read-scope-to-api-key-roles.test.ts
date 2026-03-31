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

const MIGRATION_NAME = 'AddInsightsReadScopeToApiKeyRoles1775000000000';

interface RoleScopeRow {
	roleSlug: string;
	scopeSlug: string;
}

describe('AddInsightsReadScopeToApiKeyRoles Migration', () => {
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

	async function insertTestRole(
		context: TestMigrationContext,
		role: { slug: string; displayName: string; roleType: string; systemRole?: boolean },
	) {
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
			slug: role.slug,
			displayName: role.displayName,
			roleType: role.roleType,
			systemRole: role.systemRole ?? true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	async function getScopeBySlug(context: TestMigrationContext, slug: string) {
		const tableName = context.escape.tableName('scope');
		const slugColumn = context.escape.columnName('slug');

		const rows = await context.runQuery<Array<Record<string, string>>>(
			`SELECT ${slugColumn} AS "slug" FROM ${tableName} WHERE ${slugColumn} = :slug`,
			{ slug },
		);

		return rows[0] ?? null;
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

	describe('up migration', () => {
		it('should create insights:read scope and assign it to owner, admin, and member roles', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestRole(context, {
				slug: 'global:owner',
				displayName: 'Owner',
				roleType: 'global',
			});
			await insertTestRole(context, {
				slug: 'global:admin',
				displayName: 'Admin',
				roleType: 'global',
			});
			await insertTestRole(context, {
				slug: 'global:member',
				displayName: 'Member',
				roleType: 'global',
			});
			await insertTestRole(context, {
				slug: 'global:chatUser',
				displayName: 'Chat User',
				roleType: 'global',
			});

			expect(await getScopeBySlug(context, 'insights:read')).toBeNull();
			expect(await getRoleScopesByScope(context, 'insights:read')).toHaveLength(0);

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const scope = await getScopeBySlug(postContext, 'insights:read');
			expect(scope).not.toBeNull();

			const roleScopes = await getRoleScopesByScope(postContext, 'insights:read');
			const roleSlugs = roleScopes.map((row) => row.roleSlug).sort();

			expect(roleSlugs).toEqual(['global:admin', 'global:member', 'global:owner']);
			expect(roleSlugs).not.toContain('global:chatUser');

			await postContext.queryRunner.release();
		});
	});

	describe('down migration', () => {
		it('should remove insights:read from role_scope and delete insights:read scope', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertTestRole(context, {
				slug: 'global:owner',
				displayName: 'Owner',
				roleType: 'global',
			});
			await insertTestRole(context, {
				slug: 'global:admin',
				displayName: 'Admin',
				roleType: 'global',
			});
			await insertTestRole(context, {
				slug: 'global:member',
				displayName: 'Member',
				roleType: 'global',
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const afterUp = createTestMigrationContext(dataSource);
			expect(await getRoleScopesByScope(afterUp, 'insights:read')).toHaveLength(3);
			await afterUp.queryRunner.release();

			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			expect(await getRoleScopesByScope(postContext, 'insights:read')).toHaveLength(0);
			expect(await getScopeBySlug(postContext, 'insights:read')).toBeNull();
			await postContext.queryRunner.release();
		});
	});
});
