import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'AddExecutionScopesToCustomRoles1789407043661';

const EXECUTION_READ = 'execution:read';
const EXECUTION_LIST = 'execution:list';
const EXECUTION_DELETE = 'execution:delete';
const WORKFLOW_READ = 'workflow:read';
const WORKFLOW_EXECUTE = 'workflow:execute';
const WORKFLOW_DELETE = 'workflow:delete';

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

describe('AddExecutionScopesToCustomRoles Migration', () => {
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

	async function grantScopes(
		context: TestMigrationContext,
		roleSlug: string,
		scopeSlugs: string[],
	): Promise<void> {
		const tableName = context.escape.tableName('role_scope');
		const roleSlugColumn = context.escape.columnName('roleSlug');
		const scopeSlugColumn = context.escape.columnName('scopeSlug');

		for (const scopeSlug of scopeSlugs) {
			await insertScope(context, scopeSlug);
			await context.runQuery(
				`INSERT INTO ${tableName} (${roleSlugColumn}, ${scopeSlugColumn}) VALUES (:roleSlug, :scopeSlug)`,
				{ roleSlug, scopeSlug },
			);
		}
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

	/** Seeds a custom project role with `scopes`, runs the migration, and returns the role's scopes afterwards. */
	async function migrateRole(
		slug: string,
		scopes: string[],
		roleData: Partial<RoleData> = {},
	): Promise<string[]> {
		const context = createTestMigrationContext(dataSource);
		await insertRole(context, {
			slug,
			displayName: slug,
			roleType: 'project',
			...roleData,
		});
		await grantScopes(context, slug, scopes);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		const result = await scopesOfRole(postContext, slug);
		await postContext.queryRunner.release();
		return result;
	}

	describe('up migration', () => {
		it('creates the execution scopes when they do not exist', async () => {
			const context = createTestMigrationContext(dataSource);
			expect(await findScope(context, EXECUTION_READ)).toBeNull();
			expect(await findScope(context, EXECUTION_LIST)).toBeNull();
			expect(await findScope(context, EXECUTION_DELETE)).toBeNull();
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			expect(await findScope(postContext, EXECUTION_READ)).not.toBeNull();
			expect(await findScope(postContext, EXECUTION_LIST)).not.toBeNull();
			expect(await findScope(postContext, EXECUTION_DELETE)).not.toBeNull();
			await postContext.queryRunner.release();
		});

		it('grants execution:read and execution:list to custom project roles that have workflow:read', async () => {
			expect(await migrateRole('project:custom-viewer', [WORKFLOW_READ])).toEqual([
				EXECUTION_LIST,
				EXECUTION_READ,
				WORKFLOW_READ,
			]);
		});

		it('grants execution:delete to custom project roles that have workflow:execute', async () => {
			expect(await migrateRole('project:custom-runner', [WORKFLOW_READ, WORKFLOW_EXECUTE])).toEqual(
				[EXECUTION_DELETE, EXECUTION_LIST, EXECUTION_READ, WORKFLOW_EXECUTE, WORKFLOW_READ],
			);
		});

		it('grants execution:delete to custom project roles that have workflow:delete', async () => {
			expect(await migrateRole('project:custom-deleter', [WORKFLOW_DELETE])).toEqual([
				EXECUTION_DELETE,
				WORKFLOW_DELETE,
			]);
		});

		it('leaves custom project roles without workflow read, execute or delete untouched', async () => {
			expect(await migrateRole('project:custom-credentials', ['credential:read'])).toEqual([
				'credential:read',
			]);
		});

		it('leaves system roles untouched, since their scopes are reconciled on startup', async () => {
			expect(
				await migrateRole('project:admin', [WORKFLOW_READ, WORKFLOW_EXECUTE], {
					systemRole: true,
				}),
			).toEqual([WORKFLOW_EXECUTE, WORKFLOW_READ]);
		});

		it('leaves non-project roles untouched', async () => {
			expect(
				await migrateRole('global:custom-admin', [WORKFLOW_READ, WORKFLOW_EXECUTE], {
					roleType: 'global',
				}),
			).toEqual([WORKFLOW_EXECUTE, WORKFLOW_READ]);
		});

		it('does not duplicate execution scopes for roles that already have them', async () => {
			expect(
				await migrateRole('project:already-granted', [
					WORKFLOW_READ,
					WORKFLOW_EXECUTE,
					EXECUTION_READ,
					EXECUTION_LIST,
					EXECUTION_DELETE,
				]),
			).toEqual([
				EXECUTION_DELETE,
				EXECUTION_LIST,
				EXECUTION_READ,
				WORKFLOW_EXECUTE,
				WORKFLOW_READ,
			]);
		});
	});
});
