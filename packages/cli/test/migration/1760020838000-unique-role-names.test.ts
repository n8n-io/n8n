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

const MIGRATION_NAME = 'UniqueRoleNames1760020838000';

interface RoleData {
	slug: string;
	displayName: string;
	createdAt: Date;
	systemRole?: boolean;
	roleType?: string;
	description?: string | null;
}

interface RoleRow {
	slug: string;
	displayName: string;
	createdAt: Date;
}

describe('UniqueRoleNames Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		// Initialize DB connection without running migrations
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);

		// Run migrations up to (but not including) target migration
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	/**
	 * Helper function to insert a test role with controlled timestamp
	 */
	async function insertTestRole(context: TestMigrationContext, roleData: RoleData): Promise<void> {
		const tableName = context.escape.tableName('role');
		const slugColumn = context.escape.columnName('slug');
		const displayNameColumn = context.escape.columnName('displayName');
		const createdAtColumn = context.escape.columnName('createdAt');
		const updatedAtColumn = context.escape.columnName('updatedAt');
		const systemRoleColumn = context.escape.columnName('systemRole');
		const roleTypeColumn = context.escape.columnName('roleType');
		const descriptionColumn = context.escape.columnName('description');

		const systemRole = roleData.systemRole ?? false;
		const roleType = roleData.roleType ?? 'project';
		const description = roleData.description ?? null;

		await context.queryRunner.query(
			`INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${createdAtColumn}, ${updatedAtColumn}, ${systemRoleColumn}, ${roleTypeColumn}, ${descriptionColumn}) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				roleData.slug,
				roleData.displayName,
				roleData.createdAt,
				roleData.createdAt,
				systemRole,
				roleType,
				description,
			],
		);
	}

	/**
	 * Helper function to retrieve all roles ordered by creation date
	 */
	async function getAllRoles(context: TestMigrationContext): Promise<RoleRow[]> {
		const tableName = context.escape.tableName('role');
		const slugColumn = context.escape.columnName('slug');
		const displayNameColumn = context.escape.columnName('displayName');
		const createdAtColumn = context.escape.columnName('createdAt');

		const roles = await context.queryRunner.query(
			`SELECT ${slugColumn} as slug, ${displayNameColumn} as displayName, ${createdAtColumn} as createdAt FROM ${tableName} ORDER BY ${createdAtColumn} ASC`,
		);

		return roles;
	}

	describe('Schema Migration', () => {
		it('should create unique index and correctly rename all duplicate roles', async () => {
			// Create migration context for schema queries
			const context = createTestMigrationContext(dataSource);

			// Test Scenario 1: 3 roles with same displayName "Duplicate Name"
			await insertTestRole(context, {
				slug: 'test-role-oldest',
				displayName: 'Duplicate Name',
				createdAt: new Date('2024-01-01T00:00:00.000Z'),
			});
			await insertTestRole(context, {
				slug: 'test-role-middle',
				displayName: 'Duplicate Name',
				createdAt: new Date('2024-01-02T00:00:00.000Z'),
			});
			await insertTestRole(context, {
				slug: 'test-role-newest',
				displayName: 'Duplicate Name',
				createdAt: new Date('2024-01-03T00:00:00.000Z'),
			});

			// Test Scenario 2: 2 duplicate "Editor" roles
			await insertTestRole(context, {
				slug: 'editor-first',
				displayName: 'Editor',
				createdAt: new Date('2025-01-01T00:00:00.000Z'),
			});
			await insertTestRole(context, {
				slug: 'editor-second',
				displayName: 'Editor',
				createdAt: new Date('2025-01-02T00:00:00.000Z'),
			});

			// Test Scenario 3: 5 duplicate "Manager" roles
			for (let i = 1; i <= 5; i++) {
				await insertTestRole(context, {
					slug: `manager-${i}`,
					displayName: 'Manager',
					createdAt: new Date(`2025-02-0${i}T00:00:00.000Z`),
				});
			}

			// Test Scenario 4: Multiple independent duplicate groups
			// Group 1: 3 "Admin" roles
			await insertTestRole(context, {
				slug: 'admin-1',
				displayName: 'Admin',
				createdAt: new Date('2025-03-01T00:00:00.000Z'),
			});
			await insertTestRole(context, {
				slug: 'admin-2',
				displayName: 'Admin',
				createdAt: new Date('2025-03-02T00:00:00.000Z'),
			});
			await insertTestRole(context, {
				slug: 'admin-3',
				displayName: 'Admin',
				createdAt: new Date('2025-03-03T00:00:00.000Z'),
			});

			// Group 2: 2 "Reviewer" roles
			await insertTestRole(context, {
				slug: 'reviewer-1',
				displayName: 'Reviewer',
				createdAt: new Date('2025-03-04T00:00:00.000Z'),
			});
			await insertTestRole(context, {
				slug: 'reviewer-2',
				displayName: 'Reviewer',
				createdAt: new Date('2025-03-05T00:00:00.000Z'),
			});

			// Check conflict with generated display name conflict
			await insertTestRole(context, {
				slug: 'reviewer-3',
				displayName: 'Reviewer 2',
				createdAt: new Date('2025-03-05T00:00:00.000Z'),
			});

			// Group 3: 1 "Viewer" role (no duplicates)
			await insertTestRole(context, {
				slug: 'viewer-1',
				displayName: 'Viewer',
				createdAt: new Date('2025-03-06T00:00:00.000Z'),
			});

			// Verify pre-migration state - all roles exist with original displayNames
			const beforeRoles = await getAllRoles(context);
			expect(beforeRoles.filter((r) => r.displayName === 'Duplicate Name')).toHaveLength(3);
			expect(beforeRoles.filter((r) => r.displayName === 'Editor')).toHaveLength(2);
			expect(beforeRoles.filter((r) => r.displayName === 'Manager')).toHaveLength(5);
			expect(beforeRoles.filter((r) => r.displayName === 'Admin')).toHaveLength(3);
			expect(beforeRoles.filter((r) => r.displayName === 'Reviewer')).toHaveLength(2);
			expect(beforeRoles.filter((r) => r.displayName === 'Viewer')).toHaveLength(1);

			// Run the migration
			await runSingleMigration(MIGRATION_NAME);

			// Release old query runner before creating new one
			await context.queryRunner.release();

			// Create fresh context after migration
			const postMigrationContext = createTestMigrationContext(dataSource);

			const tableName = postMigrationContext.escape.tableName('role');
			const displayNameColumn = postMigrationContext.escape.columnName('displayName');
			const slugColumn = postMigrationContext.escape.columnName('slug');
			const indexName = postMigrationContext.escape.indexName('UniqueRoleDisplayName');

			// Verify all duplicate roles were renamed correctly
			const afterRoles = await getAllRoles(postMigrationContext);

			// Test Scenario 1: 3 "Duplicate Name" roles
			const oldestRole = afterRoles.find((r) => r.slug === 'test-role-oldest');
			const middleRole = afterRoles.find((r) => r.slug === 'test-role-middle');
			const newestRole = afterRoles.find((r) => r.slug === 'test-role-newest');
			expect(oldestRole?.displayName).toBe('Duplicate Name'); // Oldest keeps original
			expect(middleRole?.displayName).toBe('Duplicate Name 2'); // Second gets " 2"
			expect(newestRole?.displayName).toBe('Duplicate Name 3'); // Third gets " 3"

			// Test Scenario 2: 2 "Editor" roles
			const editorFirst = afterRoles.find((r) => r.slug === 'editor-first');
			const editorSecond = afterRoles.find((r) => r.slug === 'editor-second');
			expect(editorFirst?.displayName).toBe('Editor'); // Oldest keeps original
			expect(editorSecond?.displayName).toBe('Editor 2'); // Second gets " 2"

			// Test Scenario 3: 5 "Manager" roles
			const manager1 = afterRoles.find((r) => r.slug === 'manager-1');
			const manager2 = afterRoles.find((r) => r.slug === 'manager-2');
			const manager3 = afterRoles.find((r) => r.slug === 'manager-3');
			const manager4 = afterRoles.find((r) => r.slug === 'manager-4');
			const manager5 = afterRoles.find((r) => r.slug === 'manager-5');
			expect(manager1?.displayName).toBe('Manager'); // Oldest keeps original
			expect(manager2?.displayName).toBe('Manager 2');
			expect(manager3?.displayName).toBe('Manager 3');
			expect(manager4?.displayName).toBe('Manager 4');
			expect(manager5?.displayName).toBe('Manager 5');

			// Test Scenario 4: Multiple independent groups
			const admin1 = afterRoles.find((r) => r.slug === 'admin-1');
			const admin2 = afterRoles.find((r) => r.slug === 'admin-2');
			const admin3 = afterRoles.find((r) => r.slug === 'admin-3');
			expect(admin1?.displayName).toBe('Admin');
			expect(admin2?.displayName).toBe('Admin 2');
			expect(admin3?.displayName).toBe('Admin 3');

			const reviewer1 = afterRoles.find((r) => r.slug === 'reviewer-1');
			const reviewer2 = afterRoles.find((r) => r.slug === 'reviewer-2');
			expect(reviewer1?.displayName).toBe('Reviewer');
			expect(reviewer2?.displayName).toBe('Reviewer 3');

			const reviewer3 = afterRoles.find((r) => r.slug === 'reviewer-3');
			expect(reviewer3?.displayName).toBe('Reviewer 2');

			const viewer1 = afterRoles.find((r) => r.slug === 'viewer-1');
			expect(viewer1?.displayName).toBe('Viewer'); // Unchanged (no duplicates)

			// Verify unique index exists based on database type
			if (postMigrationContext.isSqlite) {
				const indexes = await postMigrationContext.queryRunner.query(
					`PRAGMA index_list(${tableName})`,
				);
				const uniqueIndex = indexes.find(
					(idx: { name: string; unique: number }) =>
						idx.name.includes('UniqueRoleDisplayName') && idx.unique === 1,
				);
				expect(uniqueIndex).toBeDefined();
			} else if (postMigrationContext.isPostgres) {
				const result = await postMigrationContext.queryRunner.query(
					`SELECT indexname FROM pg_indexes WHERE tablename = ${tableName} AND indexname = ${indexName}`,
				);
				expect(result).toHaveLength(1);

				// Verify index is unique
				const uniqueCheck = await postMigrationContext.queryRunner.query(
					`SELECT i.relname as index_name, ix.indisunique
					FROM pg_class t
					JOIN pg_index ix ON t.oid = ix.indrelid
					JOIN pg_class i ON i.oid = ix.indexrelid
					WHERE t.relname = ${tableName} AND i.relname = ${indexName}`,
				);
				expect(uniqueCheck[0].indisunique).toBe(true);
			} else if (postMigrationContext.isMysql) {
				const result = await postMigrationContext.queryRunner.query(
					`SHOW INDEXES FROM ${tableName} WHERE Key_name = ${indexName}`,
				);
				expect(result).toHaveLength(1);
				expect(result[0].Non_unique).toBe(0); // 0 means unique
			}

			// Verify index enforces uniqueness by attempting duplicate insert
			await postMigrationContext.queryRunner.query(
				`INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${postMigrationContext.escape.columnName('createdAt')}, ${postMigrationContext.escape.columnName('updatedAt')}, ${postMigrationContext.escape.columnName('systemRole')}, ${postMigrationContext.escape.columnName('roleType')}) VALUES (?, ?, ?, ?, ?, ?)`,
				['test-duplicate-attempt', 'Unique Test Name', new Date(), new Date(), false, 'project'],
			);

			const attemptDuplicateInsert = async () => {
				return await postMigrationContext.queryRunner.query(
					`INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${postMigrationContext.escape.columnName('createdAt')}, ${postMigrationContext.escape.columnName('updatedAt')}, ${postMigrationContext.escape.columnName('systemRole')}, ${postMigrationContext.escape.columnName('roleType')}) VALUES (?, ?, ?, ?, ?, ?)`,
					[
						'test-duplicate-attempt-2',
						'Unique Test Name',
						new Date(),
						new Date(),
						false,
						'project',
					],
				);
			};

			await expect(attemptDuplicateInsert()).rejects.toThrow();

			// Cleanup
			await postMigrationContext.queryRunner.release();
		});

		it('should remove unique index on rollback', async () => {
			// NOTE: This test skips duplicate scenarios since migration already ran in previous test
			// We're testing rollback functionality independently

			// Run up() migration first (already done in test set up)
			// runSingleMigration checks if already executed and skips if needed
			await runSingleMigration(MIGRATION_NAME);

			// Create fresh context
			const upContext = createTestMigrationContext(dataSource);

			const tableName = upContext.escape.tableName('role');
			const indexName = upContext.escape.indexName('UniqueRoleDisplayName');

			// Verify unique index exists
			if (upContext.isSqlite) {
				const indexes = await upContext.queryRunner.query(`PRAGMA index_list(${tableName})`);
				const uniqueIndex = indexes.find(
					(idx: { name: string; unique: number }) =>
						idx.name.includes('UniqueRoleDisplayName') && idx.unique === 1,
				);
				expect(uniqueIndex).toBeDefined();
			} else if (upContext.isPostgres) {
				const result = await upContext.queryRunner.query(
					`SELECT indexname FROM pg_indexes WHERE tablename = ${tableName} AND indexname = ${indexName}`,
				);
				expect(result).toHaveLength(1);
			} else if (upContext.isMysql) {
				const result = await upContext.queryRunner.query(
					`SHOW INDEXES FROM ${tableName} WHERE Key_name = ${indexName}`,
				);
				expect(result).toHaveLength(1);
			}

			await upContext.queryRunner.release();

			await undoLastSingleMigration();

			// Create fresh context after rollback
			const postRollbackContext = createTestMigrationContext(dataSource);

			// Verify index is removed (DB-specific queries)
			if (postRollbackContext.isSqlite) {
				const indexes = await postRollbackContext.queryRunner.query(
					`PRAGMA index_list(${tableName})`,
				);
				const uniqueIndex = indexes.find(
					(idx: { name: string; unique: number }) =>
						idx.name.includes('UniqueRoleDisplayName') && idx.unique === 1,
				);
				expect(uniqueIndex).toBeUndefined();
			} else if (postRollbackContext.isPostgres) {
				const result = await postRollbackContext.queryRunner.query(
					`SELECT indexname FROM pg_indexes WHERE tablename = ${tableName} AND indexname = ${indexName}`,
				);
				expect(result).toHaveLength(0);
			} else if (postRollbackContext.isMysql) {
				const result = await postRollbackContext.queryRunner.query(
					`SHOW INDEXES FROM ${tableName} WHERE Key_name = ${indexName}`,
				);
				expect(result).toHaveLength(0);
			}

			// Verify duplicate displayNames can be inserted again
			// Insert 2 roles with same displayName to confirm duplicates allowed
			const slugColumn = postRollbackContext.escape.columnName('slug');
			const displayNameColumn = postRollbackContext.escape.columnName('displayName');
			const createdAtColumn = postRollbackContext.escape.columnName('createdAt');
			const updatedAtColumn = postRollbackContext.escape.columnName('updatedAt');
			const systemRoleColumn = postRollbackContext.escape.columnName('systemRole');
			const roleTypeColumn = postRollbackContext.escape.columnName('roleType');

			await postRollbackContext.queryRunner.query(
				`INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${createdAtColumn}, ${updatedAtColumn}, ${systemRoleColumn}, ${roleTypeColumn}) VALUES (?, ?, ?, ?, ?, ?)`,
				['rollback-test-1', 'Duplicate After Rollback', new Date(), new Date(), false, 'project'],
			);

			await postRollbackContext.queryRunner.query(
				`INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${createdAtColumn}, ${updatedAtColumn}, ${systemRoleColumn}, ${roleTypeColumn}) VALUES (?, ?, ?, ?, ?, ?)`,
				['rollback-test-2', 'Duplicate After Rollback', new Date(), new Date(), false, 'project'],
			);

			// Verify both roles were inserted successfully
			const duplicateRoles = await postRollbackContext.queryRunner.query(
				`SELECT ${slugColumn} as slug, ${displayNameColumn} as displayName FROM ${tableName} WHERE ${displayNameColumn} = ?`,
				['Duplicate After Rollback'],
			);

			expect(duplicateRoles).toHaveLength(2);

			// Cleanup
			await postRollbackContext.queryRunner.release();
		});
	});

	describe('Post-Migration Capacity', () => {
		it('should accept unique displayNames after migration', async () => {
			const context = createTestMigrationContext(dataSource);

			const tableName = context.escape.tableName('role');
			const slugColumn = context.escape.columnName('slug');
			const displayNameColumn = context.escape.columnName('displayName');
			const createdAtColumn = context.escape.columnName('createdAt');
			const updatedAtColumn = context.escape.columnName('updatedAt');
			const systemRoleColumn = context.escape.columnName('systemRole');
			const roleTypeColumn = context.escape.columnName('roleType');

			// Insert role with unique displayName
			await context.queryRunner.query(
				`INSERT INTO ${tableName} (${slugColumn}, ${displayNameColumn}, ${createdAtColumn}, ${updatedAtColumn}, ${systemRoleColumn}, ${roleTypeColumn}) VALUES (?, ?, ?, ?, ?, ?)`,
				['unique-role-test', 'Unique Role Name', new Date(), new Date(), false, 'project'],
			);

			// Verify retrieval using SQL
			const [result] = await context.queryRunner.query(
				`SELECT ${slugColumn} as slug, ${displayNameColumn} as displayName FROM ${tableName} WHERE ${slugColumn} = ?`,
				['unique-role-test'],
			);

			expect(result).toBeDefined();
			expect(result.displayName).toBe('Unique Role Name');

			// Cleanup
			await context.queryRunner.release();
		});
	});
});
