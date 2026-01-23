import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { AuthRolesService, Role, RoleRepository, Scope, ScopeRepository } from '@n8n/db';
import { ALL_SCOPES, ALL_ROLES, scopeInformation } from '@n8n/permissions';

describe('AuthRolesService', () => {
	const logger = mockInstance(Logger);
	const scopeRepository = mockInstance(ScopeRepository);
	const roleRepository = mockInstance(RoleRepository);

	const authRolesService = new AuthRolesService(logger, scopeRepository, roleRepository);

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('init - syncScopes', () => {
		test('should create new scopes that do not exist in database', async () => {
			//
			// ARRANGE
			//
			scopeRepository.find.mockResolvedValue([]);
			scopeRepository.save.mockResolvedValue([] as any);
			roleRepository.find.mockResolvedValue([]);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			expect(scopeRepository.save).toHaveBeenCalled();
			const savedScopes = scopeRepository.save.mock.calls[0][0] as Scope[];
			expect(savedScopes.length).toBe(ALL_SCOPES.length);

			// Verify all scopes from ALL_SCOPES were created
			ALL_SCOPES.forEach((scopeSlug) => {
				expect(savedScopes.some((s) => s.slug === scopeSlug)).toBe(true);
			});
		});

		test('should update existing scopes when displayName or description changes', async () => {
			//
			// ARRANGE
			//
			const testScopeSlug = ALL_SCOPES[0];
			const outdatedScope = new Scope();
			outdatedScope.slug = testScopeSlug;
			outdatedScope.displayName = 'Outdated Display Name';
			outdatedScope.description = 'Outdated Description';

			scopeRepository.find.mockResolvedValueOnce([outdatedScope]);
			scopeRepository.save.mockResolvedValue([] as any);
			scopeRepository.find.mockResolvedValueOnce([outdatedScope]); // For syncRoles
			roleRepository.find.mockResolvedValue([]);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			expect(scopeRepository.save).toHaveBeenCalled();
			const savedScopes = scopeRepository.save.mock.calls[0][0] as Scope[];
			const updatedScope = savedScopes.find((s) => s.slug === testScopeSlug);

			expect(updatedScope).toBeDefined();
			expect(updatedScope?.displayName).toBe(
				scopeInformation[testScopeSlug]?.displayName ?? testScopeSlug,
			);
			expect(updatedScope?.description).toBe(scopeInformation[testScopeSlug]?.description ?? null);
		});

		test('should not update scopes when displayName and description are already correct', async () => {
			//
			// ARRANGE
			//
			const allCorrectScopes = ALL_SCOPES.map((slug) => {
				const scope = new Scope();
				scope.slug = slug;
				scope.displayName = scopeInformation[slug]?.displayName ?? slug;
				scope.description = scopeInformation[slug]?.description ?? null;
				return scope;
			});

			scopeRepository.find.mockResolvedValueOnce(allCorrectScopes);
			scopeRepository.find.mockResolvedValueOnce(allCorrectScopes); // For syncRoles
			roleRepository.find.mockResolvedValue([]);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			// Save should not be called for scopes (might be called for roles)
			const scopeSaveCalls = scopeRepository.save.mock.calls.filter((call) => {
				const arg = call[0];
				return Array.isArray(arg) && arg.length > 0 && arg[0] instanceof Scope;
			});
			expect(scopeSaveCalls.length).toBe(0);
		});

		test('should delete obsolete scopes that are no longer in ALL_SCOPES', async () => {
			//
			// ARRANGE
			//
			const obsoleteScope = new Scope();
			//@ts-expect-error
			obsoleteScope.slug = 'obsolete:scope';
			obsoleteScope.displayName = 'Obsolete Scope';
			obsoleteScope.description = 'This scope should be deleted';

			scopeRepository.find.mockResolvedValueOnce([obsoleteScope]);
			scopeRepository.remove.mockResolvedValue([] as any);
			roleRepository.find.mockResolvedValueOnce([]);
			scopeRepository.find.mockResolvedValueOnce([]); // For syncRoles
			roleRepository.find.mockResolvedValueOnce([]);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			expect(scopeRepository.remove).toHaveBeenCalledWith([obsoleteScope]);

			// Verify the logic correctly identified the obsolete scope
			const removedScopes = scopeRepository.remove.mock.calls[0][0] as unknown as Scope[];
			expect(removedScopes).toHaveLength(1);
			expect(removedScopes[0].slug).toBe('obsolete:scope');

			// Verify the scope is actually obsolete (not in ALL_SCOPES)
			expect(ALL_SCOPES).not.toContain('obsolete:scope');
		});

		test('should remove obsolete scopes from roles before deleting them', async () => {
			//
			// ARRANGE
			//
			const obsoleteScope = new Scope();
			//@ts-expect-error
			obsoleteScope.slug = 'obsolete:scope';
			obsoleteScope.displayName = 'Obsolete Scope';

			const validScope = new Scope();
			validScope.slug = ALL_SCOPES[0];
			validScope.displayName = 'Valid Scope';

			const roleWithObsoleteScope = new Role();
			roleWithObsoleteScope.slug = 'test:role';
			roleWithObsoleteScope.displayName = 'Test Role';
			roleWithObsoleteScope.scopes = [obsoleteScope, validScope];

			scopeRepository.find.mockResolvedValueOnce([obsoleteScope, validScope]);
			roleRepository.find.mockResolvedValueOnce([roleWithObsoleteScope]);
			roleRepository.save.mockResolvedValue([] as any);
			scopeRepository.remove.mockResolvedValue([] as any);
			scopeRepository.find.mockResolvedValueOnce([validScope]); // For syncRoles
			roleRepository.find.mockResolvedValueOnce([]);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			// Verify role was saved with obsolete scope removed
			expect(roleRepository.save).toHaveBeenCalled();
			const savedRoles = roleRepository.save.mock.calls[0][0] as Role[];
			const updatedRole = savedRoles.find((r) => r.slug === roleWithObsoleteScope.slug);

			// Verify the logic actually filtered out the obsolete scope
			expect(updatedRole?.scopes.length).toBe(1);
			expect(updatedRole?.scopes[0].slug).toBe(validScope.slug);
			expect(updatedRole?.scopes.map((s) => s.slug)).not.toContain('obsolete:scope');

			// Verify obsolete scope was then deleted
			expect(scopeRepository.remove).toHaveBeenCalledWith([obsoleteScope]);
			const removedScopes = scopeRepository.remove.mock.calls[0][0] as unknown as Scope[];
			expect(removedScopes[0].slug).toBe('obsolete:scope');
		});

		test('should handle multiple obsolete scopes across multiple roles', async () => {
			//
			// ARRANGE
			//
			const obsoleteScope1 = new Scope();
			//@ts-expect-error
			obsoleteScope1.slug = 'obsolete:scope1';
			const obsoleteScope2 = new Scope();
			//@ts-expect-error
			obsoleteScope2.slug = 'obsolete:scope2';
			const validScope = new Scope();
			validScope.slug = ALL_SCOPES[0];

			const role1 = new Role();
			role1.slug = 'test:role1';
			role1.scopes = [obsoleteScope1, validScope];

			const role2 = new Role();
			role2.slug = 'test:role2';
			role2.scopes = [obsoleteScope2, validScope];

			const role3 = new Role();
			role3.slug = 'test:role3';
			role3.scopes = [obsoleteScope1, obsoleteScope2, validScope];

			scopeRepository.find.mockResolvedValueOnce([obsoleteScope1, obsoleteScope2, validScope]);
			roleRepository.find.mockResolvedValueOnce([role1, role2, role3]);
			roleRepository.save.mockResolvedValue([] as any);
			scopeRepository.remove.mockResolvedValue([] as any);
			scopeRepository.find.mockResolvedValueOnce([validScope]); // For syncRoles
			roleRepository.find.mockResolvedValueOnce([]);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			// Verify all roles were updated to remove obsolete scopes
			expect(roleRepository.save).toHaveBeenCalled();
			const savedRoles = roleRepository.save.mock.calls[0][0] as Role[];
			expect(savedRoles.length).toBe(3);

			// Verify each role has the correct scopes after filtering
			savedRoles.forEach((role) => {
				expect(role.scopes.length).toBe(1);
				expect(role.scopes[0].slug).toBe(validScope.slug);

				// Verify obsolete scopes were actually removed
				const roleScopeSlugs = role.scopes.map((s) => s.slug);
				expect(roleScopeSlugs).not.toContain('obsolete:scope1');
				expect(roleScopeSlugs).not.toContain('obsolete:scope2');
			});

			// Verify obsolete scopes were deleted
			expect(scopeRepository.remove).toHaveBeenCalledWith([obsoleteScope1, obsoleteScope2]);
			const removedScopes = scopeRepository.remove.mock.calls[0][0] as unknown as Scope[];
			expect(removedScopes).toHaveLength(2);
			expect(removedScopes.map((s) => s.slug)).toContain('obsolete:scope1');
			expect(removedScopes.map((s) => s.slug)).toContain('obsolete:scope2');
		});

		test('should not delete valid scopes that are in ALL_SCOPES', async () => {
			//
			// ARRANGE
			//
			// Create only valid scopes (all in ALL_SCOPES)
			const validScopes = ALL_SCOPES.slice(0, 5).map((slug) => {
				const scope = new Scope();
				scope.slug = slug;
				scope.displayName = scopeInformation[slug]?.displayName ?? slug;
				scope.description = scopeInformation[slug]?.description ?? null;
				return scope;
			});

			scopeRepository.find.mockResolvedValue(validScopes);
			roleRepository.find.mockResolvedValue([]);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			// Verify remove was NOT called for valid scopes
			expect(scopeRepository.remove).not.toHaveBeenCalled();

			// Verify all scopes are indeed in ALL_SCOPES
			validScopes.forEach((scope) => {
				expect(ALL_SCOPES).toContain(scope.slug);
			});
		});

		test('should only delete obsolete scopes and keep valid ones', async () => {
			//
			// ARRANGE
			//
			const validScope1 = new Scope();
			validScope1.slug = ALL_SCOPES[0];
			const validScope2 = new Scope();
			validScope2.slug = ALL_SCOPES[1];
			const obsoleteScope1 = new Scope();
			//@ts-expect-error
			obsoleteScope1.slug = 'obsolete:one';
			const obsoleteScope2 = new Scope();
			//@ts-expect-error
			obsoleteScope2.slug = 'obsolete:two';

			// Mix of valid and obsolete scopes
			const mixedScopes = [validScope1, obsoleteScope1, validScope2, obsoleteScope2];

			scopeRepository.find.mockResolvedValueOnce(mixedScopes);
			scopeRepository.remove.mockResolvedValue([] as any);
			roleRepository.find.mockResolvedValueOnce([]);
			scopeRepository.find.mockResolvedValueOnce([validScope1, validScope2]); // For syncRoles
			roleRepository.find.mockResolvedValueOnce([]);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			// Verify ONLY obsolete scopes were deleted
			expect(scopeRepository.remove).toHaveBeenCalled();
			const removedScopes = scopeRepository.remove.mock.calls[0][0] as unknown as Scope[];

			expect(removedScopes).toHaveLength(2);
			expect(removedScopes.map((s) => s.slug)).toContain('obsolete:one');
			expect(removedScopes.map((s) => s.slug)).toContain('obsolete:two');
			expect(removedScopes.map((s) => s.slug)).not.toContain(validScope1.slug);
			expect(removedScopes.map((s) => s.slug)).not.toContain(validScope2.slug);
		});
	});

	describe('init - syncRoles', () => {
		test('should create new system roles that do not exist in database', async () => {
			//
			// ARRANGE
			//
			const allScopes = ALL_SCOPES.map((slug) => {
				const scope = new Scope();
				scope.slug = slug;
				return scope;
			});

			scopeRepository.find.mockResolvedValue(allScopes);
			roleRepository.find.mockResolvedValueOnce([]); // For finding existing roles
			roleRepository.create.mockImplementation((data) => data as Role);
			roleRepository.save.mockResolvedValue([] as any);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			const expectedRoleCount = Object.values(ALL_ROLES).flat().length;

			// Verify create was called for each role
			expect(roleRepository.create).toHaveBeenCalledTimes(expectedRoleCount);

			// Verify save was called for each role namespace
			expect(roleRepository.save).toHaveBeenCalled();
		});

		test('should update existing roles when displayName or description changes', async () => {
			//
			// ARRANGE
			//
			const firstRoleDefinition = ALL_ROLES.global[0];
			const outdatedRole = new Role();
			outdatedRole.slug = firstRoleDefinition.slug;
			outdatedRole.displayName = 'Outdated Display Name';
			outdatedRole.description = 'Outdated Description';
			outdatedRole.roleType = 'global';
			outdatedRole.systemRole = true;
			outdatedRole.scopes = [];

			const allScopes = ALL_SCOPES.map((slug) => {
				const scope = new Scope();
				scope.slug = slug;
				return scope;
			});

			scopeRepository.find.mockResolvedValue(allScopes);
			roleRepository.find.mockResolvedValueOnce([outdatedRole]);
			roleRepository.save.mockResolvedValue([] as any);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			expect(roleRepository.save).toHaveBeenCalled();
			const savedRoles = roleRepository.save.mock.calls[0][0] as Role[];
			const updatedRole = savedRoles.find((r) => r.slug === firstRoleDefinition.slug);

			expect(updatedRole?.displayName).toBe(firstRoleDefinition.displayName);
			expect(updatedRole?.description).toBe(firstRoleDefinition.description ?? null);
		});

		test('should update role scopes when they differ from definition', async () => {
			//
			// ARRANGE
			//
			const roleDefinition = ALL_ROLES.global[0];
			const existingRole = new Role();
			existingRole.slug = roleDefinition.slug;
			existingRole.displayName = roleDefinition.displayName;
			existingRole.description = roleDefinition.description ?? null;
			existingRole.roleType = 'global';
			existingRole.systemRole = true;
			existingRole.scopes = []; // Empty scopes - should be updated

			const allScopes = ALL_SCOPES.map((slug) => {
				const scope = new Scope();
				scope.slug = slug;
				return scope;
			});

			scopeRepository.find.mockResolvedValue(allScopes);
			roleRepository.find.mockResolvedValueOnce([existingRole]);
			roleRepository.save.mockResolvedValue([] as any);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			expect(roleRepository.save).toHaveBeenCalled();
			const savedRoles = roleRepository.save.mock.calls[0][0] as Role[];
			const updatedRole = savedRoles.find((r) => r.slug === roleDefinition.slug);

			expect(updatedRole?.scopes.length).toBeGreaterThan(0);

			// Verify scopes match the definition
			const scopeSlugs = updatedRole?.scopes.map((s) => s.slug) ?? [];
			roleDefinition.scopes.forEach((expectedScope) => {
				expect(scopeSlugs).toContain(expectedScope);
			});
		});

		test('should remove scopes from roles when they should not have them', async () => {
			//
			// ARRANGE
			//
			const roleDefinition = ALL_ROLES.global[0];
			const extraScope = new Scope();
			//@ts-expect-error
			extraScope.slug = 'extra:scope:not:in:definition';

			const existingRole = new Role();
			existingRole.slug = roleDefinition.slug;
			existingRole.displayName = roleDefinition.displayName;
			existingRole.roleType = 'global';
			existingRole.systemRole = true;
			existingRole.scopes = [extraScope]; // Has scope that shouldn't be there

			const allScopes = ALL_SCOPES.map((slug) => {
				const scope = new Scope();
				scope.slug = slug;
				return scope;
			});
			allScopes.push(extraScope);

			scopeRepository.find.mockResolvedValue(allScopes);
			roleRepository.find.mockResolvedValue([existingRole]); // Changed from mockResolvedValueOnce
			roleRepository.save.mockResolvedValue([] as any);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			expect(roleRepository.save).toHaveBeenCalled();
			const savedRoles = roleRepository.save.mock.calls[0][0] as Role[];
			const updatedRole = savedRoles.find((r) => r.slug === roleDefinition.slug);

			const scopeSlugs = updatedRole?.scopes.map((s) => s.slug) ?? [];
			expect(scopeSlugs).not.toContain(extraScope.slug);
		});

		test('should handle roles across different role types', async () => {
			//
			// ARRANGE
			//
			const allScopes = ALL_SCOPES.map((slug) => {
				const scope = new Scope();
				scope.slug = slug;
				return scope;
			});

			scopeRepository.find.mockResolvedValue(allScopes);
			roleRepository.find.mockResolvedValueOnce([]);
			roleRepository.create.mockImplementation((data) => data as Role);
			roleRepository.save.mockResolvedValue([] as any);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			// Verify save was called for each role namespace
			const roleNamespaces = Object.keys(ALL_ROLES);
			expect(roleRepository.save).toHaveBeenCalledTimes(roleNamespaces.length);

			// Verify each namespace's roles were created with correct roleType
			roleRepository.create.mock.calls.forEach((call) => {
				const roleData = call[0] as any;
				expect(roleData.roleType).toBeDefined();
				expect(roleNamespaces).toContain(roleData.roleType);
			});
		});

		test('should not update roles when they are already correct', async () => {
			//
			// ARRANGE
			//
			// Create roles that match the definitions exactly
			const correctRoles = Object.entries(ALL_ROLES).flatMap(([namespace, roles]) =>
				roles.map((roleDef) => {
					const role = new Role();
					role.slug = roleDef.slug;
					role.displayName = roleDef.displayName;
					role.description = roleDef.description ?? null;
					role.roleType = namespace as any;
					role.systemRole = true;
					role.scopes = roleDef.scopes.map((scopeSlug) => {
						const scope = new Scope();
						scope.slug = scopeSlug as Scope['slug'];
						return scope;
					});
					return role;
				}),
			);

			const allScopes = ALL_SCOPES.map((slug) => {
				const scope = new Scope();
				scope.slug = slug;
				return scope;
			});

			scopeRepository.find.mockResolvedValue(allScopes);
			roleRepository.find.mockResolvedValueOnce(correctRoles);
			roleRepository.save.mockResolvedValue([] as any);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			// Save should not have been called since all roles are correct
			expect(roleRepository.save).not.toHaveBeenCalled();
		});

		test('should log when updating roles', async () => {
			//
			// ARRANGE
			//
			const allScopes = ALL_SCOPES.map((slug) => {
				const scope = new Scope();
				scope.slug = slug;
				return scope;
			});

			scopeRepository.find.mockResolvedValue(allScopes);
			roleRepository.find.mockResolvedValueOnce([]);
			roleRepository.create.mockImplementation((data) => data as Role);
			roleRepository.save.mockResolvedValue([] as any);

			//
			// ACT
			//
			await authRolesService.init();

			//
			// ASSERT
			//
			Object.keys(ALL_ROLES).forEach((roleNamespace) => {
				expect(logger.debug).toHaveBeenCalledWith(
					expect.stringContaining(`${roleNamespace} roles`),
				);
			});
		});
	});
});
