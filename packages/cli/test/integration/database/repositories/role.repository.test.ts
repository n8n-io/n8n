import { testDb, linkUserToProject, createTeamProject } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { AuthRolesService, RoleRepository, ScopeRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import {
	createRole,
	createSystemRole,
	createCustomRoleWithScopes,
	createTestScopes,
} from '../../shared/db/roles';
import { createUser } from '../../shared/db/users';

describe('RoleRepository', () => {
	let roleRepository: RoleRepository;
	let scopeRepository: ScopeRepository;

	beforeAll(async () => {
		await testDb.init();
		roleRepository = Container.get(RoleRepository);
		scopeRepository = Container.get(ScopeRepository);
	});

	beforeEach(async () => {
		// Truncate in the correct order to respect foreign key constraints
		// user table references role via roleSlug
		// ProjectRelation references role
		await testDb.truncate(['User', 'ProjectRelation', 'Project', 'Role', 'Scope']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findAll()', () => {
		it('should return empty array when no roles exist', async () => {
			//
			// ARRANGE & ACT
			//
			const roles = await roleRepository.findAll();

			//
			// ASSERT
			//
			expect(roles).toEqual([]);
		});

		it('should return all roles when roles exist', async () => {
			//
			// ARRANGE
			//
			const role1 = await createRole({ slug: 'test-role-1', displayName: 'Role 1' });
			const role2 = await createRole({ slug: 'test-role-2', displayName: 'Role 2' });
			const role3 = await createSystemRole({ slug: 'system-role-1', displayName: 'System Role' });

			//
			// ACT
			//
			const roles = await roleRepository.findAll();

			//
			// ASSERT
			//
			expect(roles).toHaveLength(3);
			expect(roles).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ slug: role1.slug, displayName: role1.displayName }),
					expect.objectContaining({ slug: role2.slug, displayName: role2.displayName }),
					expect.objectContaining({ slug: role3.slug, displayName: role3.displayName }),
				]),
			);
		});

		it('should return roles with their eager-loaded scopes', async () => {
			//
			// ARRANGE
			//
			const { readScope, writeScope } = await createTestScopes();
			await createCustomRoleWithScopes([readScope, writeScope], {
				slug: 'test-role-with-scopes',
				displayName: 'Role With Scopes',
			});

			//
			// ACT
			//
			const roles = await roleRepository.findAll();

			//
			// ASSERT
			//
			expect(roles).toHaveLength(1);
			expect(roles[0].scopes).toHaveLength(2);
			expect(roles[0].scopes).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ slug: readScope.slug }),
					expect.objectContaining({ slug: writeScope.slug }),
				]),
			);
		});
	});

	describe('findBySlug()', () => {
		it('should return null when role does not exist', async () => {
			//
			// ARRANGE & ACT
			//
			const role = await roleRepository.findBySlug('non-existent-role');

			//
			// ASSERT
			//
			expect(role).toBeNull();
		});

		it('should return role when it exists', async () => {
			//
			// ARRANGE
			//
			const createdRole = await createRole({
				slug: 'test-find-role',
				displayName: 'Test Find Role',
				description: 'A role for testing findBySlug',
				roleType: 'project',
			});

			//
			// ACT
			//
			const foundRole = await roleRepository.findBySlug('test-find-role');

			//
			// ASSERT
			//
			expect(foundRole).not.toBeNull();
			expect(foundRole!.slug).toBe(createdRole.slug);
			expect(foundRole!.displayName).toBe(createdRole.displayName);
			expect(foundRole!.description).toBe(createdRole.description);
			expect(foundRole!.roleType).toBe(createdRole.roleType);
		});

		it('should return role with eager-loaded scopes', async () => {
			//
			// ARRANGE
			//
			const { readScope, writeScope, adminScope } = await createTestScopes();
			await createCustomRoleWithScopes([readScope, writeScope, adminScope], {
				slug: 'test-role-with-all-scopes',
				displayName: 'Role With All Scopes',
			});

			//
			// ACT
			//
			const foundRole = await roleRepository.findBySlug('test-role-with-all-scopes');

			//
			// ASSERT
			//
			expect(foundRole).not.toBeNull();
			expect(foundRole!.scopes).toHaveLength(3);
			expect(foundRole!.scopes).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ slug: readScope.slug }),
					expect.objectContaining({ slug: writeScope.slug }),
					expect.objectContaining({ slug: adminScope.slug }),
				]),
			);
		});

		it('should find system roles correctly', async () => {
			//
			// ARRANGE
			//
			const systemRole = await createSystemRole({
				slug: 'system-test-role',
				displayName: 'System Test Role',
			});

			//
			// ACT
			//
			const foundRole = await roleRepository.findBySlug('system-test-role');

			//
			// ASSERT
			//
			expect(foundRole).not.toBeNull();
			expect(foundRole!.systemRole).toBe(true);
			expect(foundRole!.slug).toBe(systemRole.slug);
		});
	});

	describe('removeBySlug()', () => {
		it('should successfully remove existing role', async () => {
			//
			// ARRANGE
			//
			await createRole({
				slug: 'role-to-delete',
				displayName: 'Role To Delete',
			});

			// Verify role exists
			let foundRole = await roleRepository.findBySlug('role-to-delete');
			expect(foundRole).not.toBeNull();

			//
			// ACT
			//
			await roleRepository.removeBySlug('role-to-delete');

			//
			// ASSERT
			//
			foundRole = await roleRepository.findBySlug('role-to-delete');
			expect(foundRole).toBeNull();

			// Verify it's removed from database
			const allRoles = await roleRepository.findAll();
			expect(allRoles.find((r) => r.slug === 'role-to-delete')).toBeUndefined();
		});

		it('should throw error when trying to remove non-existent role', async () => {
			//
			// ARRANGE & ACT & ASSERT
			//
			await expect(roleRepository.removeBySlug('non-existent-role')).rejects.toThrow(
				'Failed to delete role "non-existent-role"',
			);
		});

		it('should remove role with associated scopes (many-to-many relationship)', async () => {
			//
			// ARRANGE
			//
			const { readScope, writeScope } = await createTestScopes();
			await createCustomRoleWithScopes([readScope, writeScope], {
				slug: 'role-with-scopes-to-delete',
				displayName: 'Role With Scopes To Delete',
			});

			// Verify role and scopes exist
			let foundRole = await roleRepository.findBySlug('role-with-scopes-to-delete');
			expect(foundRole).not.toBeNull();
			expect(foundRole!.scopes).toHaveLength(2);

			//
			// ACT
			//
			await roleRepository.removeBySlug('role-with-scopes-to-delete');

			//
			// ASSERT
			//
			foundRole = await roleRepository.findBySlug('role-with-scopes-to-delete');
			expect(foundRole).toBeNull();

			// Verify scopes still exist (should not cascade delete)
			const foundScopes = await scopeRepository.findByList([readScope.slug, writeScope.slug]);
			expect(foundScopes).toHaveLength(2);
		});
	});

	describe('updateRole()', () => {
		describe('transaction handling', () => {
			it('should use transactions for non-SQLite legacy databases', async () => {
				//
				// ARRANGE
				//
				const { type: dbType, sqlite: sqliteConfig } = Container.get(GlobalConfig).database;
				// Skip this test for legacy SQLite
				if (dbType === 'sqlite' && sqliteConfig.poolSize === 0) {
					return;
				}

				await createRole({
					slug: 'role-for-transaction-test',
					displayName: 'Original Name',
					description: 'Original Description',
				});

				// Spy on transaction method to verify it's called
				const transactionSpy = jest.spyOn(roleRepository.manager, 'transaction');

				//
				// ACT
				//
				const updatedRole = await roleRepository.updateRole('role-for-transaction-test', {
					displayName: 'Updated Name',
					description: 'Updated Description',
				});

				//
				// ASSERT
				//
				expect(transactionSpy).toHaveBeenCalled();
				expect(updatedRole.displayName).toBe('Updated Name');
				expect(updatedRole.description).toBe('Updated Description');

				transactionSpy.mockRestore();
			});

			it('should use direct manager for SQLite legacy databases', async () => {
				//
				// ARRANGE
				//
				const { type: dbType, sqlite: sqliteConfig } = Container.get(GlobalConfig).database;
				// Only run this test for legacy SQLite
				if (dbType !== 'sqlite' || sqliteConfig.poolSize !== 0) {
					return;
				}

				await createRole({
					slug: 'role-for-legacy-test',
					displayName: 'Original Name',
					description: 'Original Description',
				});

				// Spy on transaction method to verify it's NOT called
				const transactionSpy = jest.spyOn(roleRepository.manager, 'transaction');

				//
				// ACT
				//
				const updatedRole = await roleRepository.updateRole('role-for-legacy-test', {
					displayName: 'Updated Name',
					description: 'Updated Description',
				});

				//
				// ASSERT
				//
				expect(transactionSpy).not.toHaveBeenCalled();
				expect(updatedRole.displayName).toBe('Updated Name');
				expect(updatedRole.description).toBe('Updated Description');

				transactionSpy.mockRestore();
			});
		});

		describe('successful updates', () => {
			it('should update role displayName', async () => {
				//
				// ARRANGE
				//
				await createRole({
					slug: 'role-for-name-update',
					displayName: 'Original Name',
					description: 'Original Description',
				});

				//
				// ACT
				//
				const updatedRole = await roleRepository.updateRole('role-for-name-update', {
					displayName: 'New Display Name',
				});

				//
				// ASSERT
				//
				expect(updatedRole.displayName).toBe('New Display Name');
				expect(updatedRole.description).toBe('Original Description'); // Should remain unchanged
				expect(updatedRole.slug).toBe('role-for-name-update'); // Should remain unchanged

				// Verify in database
				const foundRole = await roleRepository.findBySlug('role-for-name-update');
				expect(foundRole!.displayName).toBe('New Display Name');
			});

			it('should update role description', async () => {
				//
				// ARRANGE
				//
				await createRole({
					slug: 'role-for-desc-update',
					displayName: 'Test Role',
					description: 'Original Description',
				});

				//
				// ACT
				//
				const updatedRole = await roleRepository.updateRole('role-for-desc-update', {
					description: 'New Description',
				});

				//
				// ASSERT
				//
				expect(updatedRole.description).toBe('New Description');
				expect(updatedRole.displayName).toBe('Test Role'); // Should remain unchanged

				// Verify in database
				const foundRole = await roleRepository.findBySlug('role-for-desc-update');
				expect(foundRole!.description).toBe('New Description');
			});

			it('should update role scopes', async () => {
				//
				// ARRANGE
				//
				const { readScope, writeScope, deleteScope, adminScope } = await createTestScopes();
				await createCustomRoleWithScopes([readScope, writeScope], {
					slug: 'role-for-scope-update',
					displayName: 'Role For Scope Update',
				});

				//
				// ACT
				//
				const updatedRole = await roleRepository.updateRole('role-for-scope-update', {
					scopes: [deleteScope, adminScope],
				});

				//
				// ASSERT
				//
				expect(updatedRole.scopes).toHaveLength(2);
				expect(updatedRole.scopes).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ slug: deleteScope.slug }),
						expect.objectContaining({ slug: adminScope.slug }),
					]),
				);

				// Verify in database
				const foundRole = await roleRepository.findBySlug('role-for-scope-update');
				expect(foundRole!.scopes).toHaveLength(2);
				expect(foundRole!.scopes.map((s) => s.slug)).toEqual(
					expect.arrayContaining([deleteScope.slug, adminScope.slug]),
				);
			});

			it('should update multiple fields simultaneously', async () => {
				//
				// ARRANGE
				//
				const { readScope } = await createTestScopes();
				await createRole({
					slug: 'role-for-multi-update',
					displayName: 'Original Name',
					description: 'Original Description',
				});

				//
				// ACT
				//
				const updatedRole = await roleRepository.updateRole('role-for-multi-update', {
					displayName: 'Updated Name',
					description: 'Updated Description',
					scopes: [readScope],
				});

				//
				// ASSERT
				//
				expect(updatedRole.displayName).toBe('Updated Name');
				expect(updatedRole.description).toBe('Updated Description');
				expect(updatedRole.scopes).toHaveLength(1);
				expect(updatedRole.scopes[0].slug).toBe(readScope.slug);

				// Verify in database
				const foundRole = await roleRepository.findBySlug('role-for-multi-update');
				expect(foundRole!.displayName).toBe('Updated Name');
				expect(foundRole!.description).toBe('Updated Description');
				expect(foundRole!.scopes).toHaveLength(1);
			});

			it('should set scopes to empty array', async () => {
				//
				// ARRANGE
				//
				const { readScope, writeScope } = await createTestScopes();
				await createCustomRoleWithScopes([readScope, writeScope], {
					slug: 'role-for-empty-scopes',
					displayName: 'Role With Scopes',
				});

				//
				// ACT
				//
				const updatedRole = await roleRepository.updateRole('role-for-empty-scopes', {
					scopes: [],
				});

				//
				// ASSERT
				//
				expect(updatedRole.scopes).toEqual([]);

				// Verify in database
				const foundRole = await roleRepository.findBySlug('role-for-empty-scopes');
				expect(foundRole!.scopes).toEqual([]);
			});
		});

		describe('system role protection', () => {
			it('should throw error when trying to update system role', async () => {
				//
				// ARRANGE
				//
				await createSystemRole({
					slug: 'system-role-protected',
					displayName: 'Protected System Role',
				});

				//
				// ACT & ASSERT
				//
				await expect(
					roleRepository.updateRole('system-role-protected', {
						displayName: 'Attempt To Change System Role',
					}),
				).rejects.toThrow('Cannot update system roles');
			});

			it('should not modify system role in database when update fails', async () => {
				//
				// ARRANGE
				//
				await createSystemRole({
					slug: 'system-role-immutable',
					displayName: 'Immutable System Role',
					description: 'Original Description',
				});

				//
				// ACT
				//
				try {
					await roleRepository.updateRole('system-role-immutable', {
						displayName: 'Malicious Change',
						description: 'Malicious Description',
					});
				} catch (error) {
					// Expected to throw
				}

				//
				// ASSERT
				//
				const foundRole = await roleRepository.findBySlug('system-role-immutable');
				expect(foundRole!.displayName).toBe('Immutable System Role');
				expect(foundRole!.description).toBe('Original Description');
				expect(foundRole!.systemRole).toBe(true);
			});
		});

		describe('error scenarios', () => {
			it('should throw error when role does not exist', async () => {
				//
				// ARRANGE & ACT & ASSERT
				//
				await expect(
					roleRepository.updateRole('non-existent-role', {
						displayName: 'New Name',
					}),
				).rejects.toThrow('Role not found');
			});
		});

		describe('edge cases', () => {
			it('should handle null description update', async () => {
				//
				// ARRANGE
				//
				await createRole({
					slug: 'role-for-null-desc',
					displayName: 'Role With Description',
					description: 'Original Description',
				});

				//
				// ACT
				//
				const updatedRole = await roleRepository.updateRole('role-for-null-desc', {
					description: null,
				});

				//
				// ASSERT
				//
				expect(updatedRole.description).toBeNull();

				// Verify in database
				const foundRole = await roleRepository.findBySlug('role-for-null-desc');
				expect(foundRole!.description).toBeNull();
			});

			it('should handle update with no changes', async () => {
				//
				// ARRANGE
				//
				await createRole({
					slug: 'role-for-no-change',
					displayName: 'Unchanged Role',
					description: 'Unchanged Description',
				});

				//
				// ACT
				//
				const updatedRole = await roleRepository.updateRole('role-for-no-change', {});

				//
				// ASSERT
				//
				expect(updatedRole.displayName).toBe('Unchanged Role');
				expect(updatedRole.description).toBe('Unchanged Description');
			});

			it('should handle undefined scope update (no change to scopes)', async () => {
				//
				// ARRANGE
				//
				const { readScope } = await createTestScopes();
				await createCustomRoleWithScopes([readScope], {
					slug: 'role-for-undefined-scopes',
					displayName: 'Role With Scope',
				});

				//
				// ACT
				//
				const updatedRole = await roleRepository.updateRole('role-for-undefined-scopes', {
					displayName: 'Updated Name',
					scopes: undefined,
				});

				//
				// ASSERT
				//
				expect(updatedRole.displayName).toBe('Updated Name');

				// When scopes is undefined, it should not modify scopes, and the returned role should have scopes loaded
				// However, the updateRole method may not have eager loaded scopes, so let's verify with a fresh fetch
				const foundRole = await roleRepository.findBySlug('role-for-undefined-scopes');
				expect(foundRole!.scopes).toHaveLength(1);
				expect(foundRole!.scopes[0].slug).toBe(readScope.slug);
			});
		});
	});

	describe('countUsersWithRole()', () => {
		beforeEach(async () => {
			// make sure to initalize the default roles for user creation
			await Container.get(AuthRolesService).init();
		});

		describe('global roles', () => {
			it('should return 0 when no users have the global role', async () => {
				//
				// ARRANGE
				//
				const globalRole = await createRole({
					slug: 'global-empty-role',
					displayName: 'Global Empty Role',
					roleType: 'global',
				});

				//
				// ACT
				//
				const count = await roleRepository.countUsersWithRole(globalRole);

				//
				// ASSERT
				//
				expect(count).toBe(0);
			});

			it('should return correct count when multiple users have the global role', async () => {
				//
				// ARRANGE
				//
				const globalRole = await createRole({
					slug: 'global-multi-role',
					displayName: 'Global Multi Role',
					roleType: 'global',
				});

				await createUser({ role: globalRole });
				await createUser({ role: globalRole });
				await createUser({ role: globalRole });

				// Create user with different role to ensure isolation
				const otherRole = await createRole({
					slug: 'other-global-role',
					displayName: 'Other Global Role',
					roleType: 'global',
				});
				await createUser({ role: otherRole });

				//
				// ACT
				//
				const count = await roleRepository.countUsersWithRole(globalRole);

				//
				// ASSERT
				//
				expect(count).toBe(3);
			});
		});

		describe('project roles', () => {
			it('should return 0 when no project relations exist for the project role', async () => {
				//
				// ARRANGE
				//
				const projectRole = await createRole({
					slug: 'project-empty-role',
					displayName: 'Project Empty Role',
					roleType: 'project',
				});

				//
				// ACT
				//
				const count = await roleRepository.countUsersWithRole(projectRole);

				//
				// ASSERT
				//
				expect(count).toBe(0);
			});

			it('should return correct count when multiple users have the project role', async () => {
				//
				// ARRANGE
				//
				const projectRole = await createRole({
					slug: 'project-multi-role',
					displayName: 'Project Multi Role',
					roleType: 'project',
				});

				// Create users and projects
				const user1 = await createUser();
				const user2 = await createUser();
				const user3 = await createUser();
				const project1 = await createTeamProject('Test Project 1');
				const project2 = await createTeamProject('Test Project 2');

				// Link users to projects with the target role
				await linkUserToProject(user1, project1, projectRole.slug);
				await linkUserToProject(user2, project1, projectRole.slug);
				await linkUserToProject(user3, project2, projectRole.slug);

				//
				// ACT
				//
				const count = await roleRepository.countUsersWithRole(projectRole);

				//
				// ASSERT
				//
				expect(count).toBe(3);
			});

			it('should only count users with the specific project role slug', async () => {
				//
				// ARRANGE
				//
				const targetRole = await createRole({
					slug: 'project-target-role',
					displayName: 'Project Target Role',
					roleType: 'project',
				});

				const otherRole = await createRole({
					slug: 'project-other-role',
					displayName: 'Project Other Role',
					roleType: 'project',
				});

				const user1 = await createUser();
				const user2 = await createUser();
				const user3 = await createUser();
				const project = await createTeamProject('Test Project');

				// Link users with different roles
				await linkUserToProject(user1, project, targetRole.slug as any);
				await linkUserToProject(user2, project, targetRole.slug as any);
				await linkUserToProject(user3, project, otherRole.slug as any);

				//
				// ACT
				//
				const count = await roleRepository.countUsersWithRole(targetRole);

				//
				// ASSERT
				//
				expect(count).toBe(2);
			});
		});

		describe('edge cases', () => {
			it('should handle project roles when query returns null count', async () => {
				//
				// ARRANGE
				//
				const projectRole = await createRole({
					slug: 'project-null-count-role',
					displayName: 'Project Null Count Role',
					roleType: 'project',
				});

				// Create a project role but don't link any users to it
				// This ensures the query returns a row but with null/0 count

				//
				// ACT
				//
				const count = await roleRepository.countUsersWithRole(projectRole);

				//
				// ASSERT
				//
				expect(count).toBe(0);
			});
		});
	});
});
