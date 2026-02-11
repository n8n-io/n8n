import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import {
	AuthRolesService,
	Role,
	RoleRepository,
	Scope,
	ScopeRepository,
	SettingsRepository,
} from '@n8n/db';
import {
	ALL_SCOPES,
	ALL_ROLES,
	scopeInformation,
	PROJECT_OWNER_ROLE_SLUG,
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';

const SHARING_SCOPES = PERSONAL_SPACE_SHARING_SETTING.scopes;

describe('AuthRolesService', () => {
	const logger = mockInstance(Logger);
	const scopeRepository = mockInstance(ScopeRepository);
	const roleRepository = mockInstance(RoleRepository);
	const settingsRepository = mockInstance(SettingsRepository);

	const authRolesService = new AuthRolesService(
		logger,
		scopeRepository,
		roleRepository,
		settingsRepository,
	);

	// Helper functions for creating test data
	function createScope(
		slug: string,
		options?: Partial<Pick<Scope, 'displayName' | 'description'>>,
	): Scope {
		const scope = new Scope();
		scope.slug = slug as Scope['slug'];
		if (options?.displayName !== undefined) {
			scope.displayName = options.displayName;
		} else {
			scope.displayName = scopeInformation[slug as Scope['slug']]?.displayName ?? slug;
		}
		if (options?.description !== undefined) {
			scope.description = options.description;
		} else {
			scope.description = scopeInformation[slug as Scope['slug']]?.description ?? null;
		}
		return scope;
	}

	function createMinimalScope(slug: string): Scope {
		const scope = new Scope();
		scope.slug = slug as Scope['slug'];
		return scope;
	}

	function createAllScopes(): Scope[] {
		return ALL_SCOPES.map((slug) => createScope(slug));
	}

	function createObsoleteScope(slug: string): Scope {
		const scope = new Scope();
		// @ts-expect-error - intentionally creating obsolete scope for testing deletion
		scope.slug = slug;
		scope.displayName = slug;
		return scope;
	}

	function createRole(
		slug: string,
		options?: Partial<
			Pick<Role, 'displayName' | 'description' | 'roleType' | 'systemRole' | 'scopes'>
		>,
	): Role {
		const role = new Role();
		role.slug = slug;
		role.displayName = options?.displayName ?? slug;
		role.description = options?.description ?? null;
		role.roleType = options?.roleType ?? 'global';
		role.systemRole = options?.systemRole ?? true;
		role.scopes = options?.scopes ?? [];
		return role;
	}

	function setupDefaultMocks(allScopes: Scope[]): void {
		scopeRepository.find.mockResolvedValue(allScopes);
		roleRepository.find.mockResolvedValue([]);
		roleRepository.create.mockImplementation((data) => data as Role);
		roleRepository.save.mockImplementation(async (entities) => entities as any);
	}

	beforeEach(() => {
		jest.restoreAllMocks();
		// AuthRolesService uses findByKeys; default to [] so missing settings => undefined => backward compat (grant scopes)
		settingsRepository.findByKeys.mockResolvedValue([]);
	});

	describe('init - syncScopes', () => {
		test('should create new scopes that do not exist in database', async () => {
			scopeRepository.find.mockResolvedValue([]);
			scopeRepository.save.mockImplementation(async (entities) => entities as any);
			roleRepository.find.mockResolvedValue([]);

			await authRolesService.init();

			expect(scopeRepository.save).toHaveBeenCalled();
			const savedScopes = scopeRepository.save.mock.calls[0][0] as Scope[];
			expect(savedScopes).toHaveLength(ALL_SCOPES.length);

			const savedScopeSlugs = savedScopes.map((s) => s.slug);
			ALL_SCOPES.forEach((scopeSlug) => {
				expect(savedScopeSlugs).toContain(scopeSlug);
			});
		});

		test('should update existing scopes when displayName or description changes', async () => {
			const testScopeSlug = ALL_SCOPES[0];
			const outdatedScope = createScope(testScopeSlug, {
				displayName: 'Outdated Display Name',
				description: 'Outdated Description',
			});

			scopeRepository.find.mockResolvedValueOnce([outdatedScope]);
			scopeRepository.save.mockImplementation(async (entities) => entities as any);
			scopeRepository.find.mockResolvedValueOnce([outdatedScope]);
			roleRepository.find.mockResolvedValue([]);

			await authRolesService.init();

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
			const allCorrectScopes = createAllScopes();

			scopeRepository.find.mockResolvedValueOnce(allCorrectScopes);
			scopeRepository.find.mockResolvedValueOnce(allCorrectScopes);
			roleRepository.find.mockResolvedValue([]);

			await authRolesService.init();

			const scopeSaveCalls = scopeRepository.save.mock.calls.filter((call) => {
				const arg = call[0];
				return Array.isArray(arg) && arg.length > 0 && arg[0] instanceof Scope;
			});
			expect(scopeSaveCalls).toHaveLength(0);
		});

		test('should delete obsolete scopes that are no longer in ALL_SCOPES', async () => {
			const obsoleteScope = createObsoleteScope('obsolete:scope');
			obsoleteScope.description = 'This scope should be deleted';

			scopeRepository.find.mockResolvedValueOnce([obsoleteScope]);
			scopeRepository.remove.mockImplementation(async (entities) => entities as any);
			roleRepository.find.mockResolvedValueOnce([]);
			scopeRepository.find.mockResolvedValueOnce([]);
			roleRepository.find.mockResolvedValueOnce([]);

			await authRolesService.init();

			expect(scopeRepository.remove).toHaveBeenCalledWith([obsoleteScope]);
			const removedScopes = scopeRepository.remove.mock.calls[0][0];
			expect(removedScopes).toHaveLength(1);
			expect((removedScopes as unknown as Scope[])[0].slug).toBe('obsolete:scope');
			expect(ALL_SCOPES).not.toContain('obsolete:scope');
		});

		test('should remove obsolete scopes from roles before deleting them', async () => {
			const obsoleteScope = createObsoleteScope('obsolete:scope');
			const validScope = createScope(ALL_SCOPES[0]);

			const roleWithObsoleteScope = createRole('test:role', {
				scopes: [obsoleteScope, validScope],
			});

			scopeRepository.find.mockResolvedValueOnce([obsoleteScope, validScope]);
			roleRepository.find.mockResolvedValueOnce([roleWithObsoleteScope]);
			roleRepository.save.mockImplementation(async (entities) => entities as any);
			scopeRepository.remove.mockImplementation(async (entities) => entities as any);
			scopeRepository.find.mockResolvedValueOnce([validScope]);
			roleRepository.find.mockResolvedValueOnce([]);

			await authRolesService.init();

			expect(roleRepository.save).toHaveBeenCalled();
			const savedRoles = roleRepository.save.mock.calls[0][0] as Role[];
			const updatedRole = savedRoles.find((r) => r.slug === roleWithObsoleteScope.slug);

			expect(updatedRole?.scopes).toHaveLength(1);
			expect(updatedRole?.scopes[0].slug).toBe(validScope.slug);
			expect(updatedRole?.scopes.map((s) => s.slug)).not.toContain('obsolete:scope');
			expect(scopeRepository.remove).toHaveBeenCalledWith([obsoleteScope]);
		});

		test('should handle multiple obsolete scopes across multiple roles', async () => {
			const obsoleteScope1 = createObsoleteScope('obsolete:scope1');
			const obsoleteScope2 = createObsoleteScope('obsolete:scope2');
			const validScope = createScope(ALL_SCOPES[0]);

			const role1 = createRole('test:role1', { scopes: [obsoleteScope1, validScope] });
			const role2 = createRole('test:role2', { scopes: [obsoleteScope2, validScope] });
			const role3 = createRole('test:role3', {
				scopes: [obsoleteScope1, obsoleteScope2, validScope],
			});

			scopeRepository.find.mockResolvedValueOnce([obsoleteScope1, obsoleteScope2, validScope]);
			roleRepository.find.mockResolvedValueOnce([role1, role2, role3]);
			roleRepository.save.mockImplementation(async (entities) => entities as any);
			scopeRepository.remove.mockImplementation(async (entities) => entities as any);
			scopeRepository.find.mockResolvedValueOnce([validScope]);
			roleRepository.find.mockResolvedValueOnce([]);

			await authRolesService.init();

			expect(roleRepository.save).toHaveBeenCalled();
			const savedRoles = roleRepository.save.mock.calls[0][0] as Role[];
			expect(savedRoles).toHaveLength(3);

			savedRoles.forEach((role) => {
				expect(role.scopes).toHaveLength(1);
				expect(role.scopes[0].slug).toBe(validScope.slug);
				expect(role.scopes.map((s) => s.slug)).not.toContain('obsolete:scope1');
				expect(role.scopes.map((s) => s.slug)).not.toContain('obsolete:scope2');
			});

			expect(scopeRepository.remove).toHaveBeenCalledWith([obsoleteScope1, obsoleteScope2]);
			const removedScopes = scopeRepository.remove.mock.calls[0][0];
			expect(removedScopes).toHaveLength(2);
			expect((removedScopes as unknown as Scope[]).map((s) => s.slug)).toContain('obsolete:scope1');
			expect((removedScopes as unknown as Scope[]).map((s) => s.slug)).toContain('obsolete:scope2');
		});

		test('should not delete valid scopes that are in ALL_SCOPES', async () => {
			const validScopes = ALL_SCOPES.slice(0, 5).map((slug) => createScope(slug));

			scopeRepository.find.mockResolvedValue(validScopes);
			roleRepository.find.mockResolvedValue([]);

			await authRolesService.init();

			expect(scopeRepository.remove).not.toHaveBeenCalled();
			validScopes.forEach((scope) => {
				expect(ALL_SCOPES).toContain(scope.slug);
			});
		});

		test('should only delete obsolete scopes and keep valid ones', async () => {
			const validScope1 = createScope(ALL_SCOPES[0]);
			const validScope2 = createScope(ALL_SCOPES[1]);
			const obsoleteScope1 = createObsoleteScope('obsolete:one');
			const obsoleteScope2 = createObsoleteScope('obsolete:two');

			const mixedScopes = [validScope1, obsoleteScope1, validScope2, obsoleteScope2];

			scopeRepository.find.mockResolvedValueOnce(mixedScopes);
			scopeRepository.remove.mockImplementation(async (entities) => entities as any);
			roleRepository.find.mockResolvedValueOnce([]);
			scopeRepository.find.mockResolvedValueOnce([validScope1, validScope2]);
			roleRepository.find.mockResolvedValueOnce([]);

			await authRolesService.init();

			expect(scopeRepository.remove).toHaveBeenCalled();
			const removedScopes = scopeRepository.remove.mock.calls[0][0];

			expect(removedScopes).toHaveLength(2);
			const removedSlugs = (removedScopes as unknown as Scope[]).map((s) => s.slug);
			expect(removedSlugs).toContain('obsolete:one');
			expect(removedSlugs).toContain('obsolete:two');
			expect(removedSlugs).not.toContain(validScope1.slug);
			expect(removedSlugs).not.toContain(validScope2.slug);
		});
	});

	describe('init - syncRoles', () => {
		test('should create new system roles that do not exist in database', async () => {
			const allScopes = createAllScopes();
			setupDefaultMocks(allScopes);
			// syncScopes and syncRoles each call roleRepository.find() once
			roleRepository.find.mockResolvedValue([]);

			await authRolesService.init();

			const expectedRoleCount = Object.values(ALL_ROLES).flat().length;
			expect(roleRepository.create).toHaveBeenCalledTimes(expectedRoleCount);
			expect(roleRepository.save).toHaveBeenCalled();
		});

		test('should update existing roles when displayName or description changes', async () => {
			const firstRoleDefinition = ALL_ROLES.global[0];
			const outdatedRole = createRole(firstRoleDefinition.slug, {
				displayName: 'Outdated Display Name',
				description: 'Outdated Description',
				roleType: 'global',
			});

			const allScopes = createAllScopes();
			scopeRepository.find.mockResolvedValue(allScopes);
			// syncScopes and syncRoles each call roleRepository.find() once
			roleRepository.find.mockResolvedValue([outdatedRole]);
			roleRepository.save.mockImplementation(async (entities) => entities as any);

			await authRolesService.init();

			expect(roleRepository.save).toHaveBeenCalled();
			const savedRoles = roleRepository.save.mock.calls[0][0] as Role[];
			const updatedRole = savedRoles.find((r) => r.slug === firstRoleDefinition.slug);

			expect(updatedRole?.displayName).toBe(firstRoleDefinition.displayName);
			expect(updatedRole?.description).toBe(firstRoleDefinition.description ?? null);
		});

		test('should update role scopes when they differ from definition', async () => {
			const roleDefinition = ALL_ROLES.global[0];
			const existingRole = createRole(roleDefinition.slug, {
				displayName: roleDefinition.displayName,
				description: roleDefinition.description ?? null,
				roleType: 'global',
				scopes: [],
			});

			const allScopes = createAllScopes();
			scopeRepository.find.mockResolvedValue(allScopes);
			// syncScopes and syncRoles each call roleRepository.find() once
			roleRepository.find.mockResolvedValue([existingRole]);
			roleRepository.save.mockImplementation(async (entities) => entities as any);

			await authRolesService.init();

			expect(roleRepository.save).toHaveBeenCalled();
			const savedRoles = roleRepository.save.mock.calls[0][0] as Role[];
			const updatedRole = savedRoles.find((r) => r.slug === roleDefinition.slug);

			expect(updatedRole?.scopes.length).toBeGreaterThan(0);
			const scopeSlugs = updatedRole?.scopes.map((s) => s.slug) ?? [];
			roleDefinition.scopes.forEach((expectedScope) => {
				expect(scopeSlugs).toContain(expectedScope);
			});
		});

		test('should remove scopes from roles when they should not have them', async () => {
			const roleDefinition = ALL_ROLES.global[0];
			const extraScope = createObsoleteScope('extra:scope:not:in:definition');

			const existingRole = createRole(roleDefinition.slug, {
				displayName: roleDefinition.displayName,
				roleType: 'global',
				scopes: [extraScope],
			});

			const allScopes = createAllScopes();
			allScopes.push(extraScope);

			scopeRepository.find.mockResolvedValue(allScopes);
			roleRepository.find.mockResolvedValue([existingRole]);
			roleRepository.save.mockImplementation(async (entities) => entities as any);

			await authRolesService.init();

			expect(roleRepository.save).toHaveBeenCalled();
			const savedRoles = roleRepository.save.mock.calls[0][0] as Role[];
			const updatedRole = savedRoles.find((r) => r.slug === roleDefinition.slug);

			const scopeSlugs = updatedRole?.scopes.map((s) => s.slug) ?? [];
			expect(scopeSlugs).not.toContain(extraScope.slug);
		});

		test('should handle roles across different role types', async () => {
			const allScopes = createAllScopes();
			setupDefaultMocks(allScopes);
			// syncScopes and syncRoles each call roleRepository.find() once
			roleRepository.find.mockResolvedValue([]);

			await authRolesService.init();

			const roleNamespaces = Object.keys(ALL_ROLES);
			expect(roleRepository.save).toHaveBeenCalledTimes(roleNamespaces.length);

			roleRepository.create.mock.calls.forEach((call) => {
				const roleData = call[0] as Role;
				expect(roleData.roleType).toBeDefined();
				expect(roleNamespaces).toContain(roleData.roleType);
			});
		});

		test('should not update roles when they are already correct', async () => {
			// When personal space publishing/sharing are enabled (null = default = enabled),
			// project:personalOwner needs workflow:publish, workflow:unpublish (in base PERSONAL_PROJECT_OWNER_SCOPES),
			// and workflow:share, credential:share, credential:move
			const correctRoles = Object.entries(ALL_ROLES).flatMap(([namespace, roles]) =>
				roles.map((roleDef) => {
					const scopes = roleDef.scopes.map((scopeSlug) => createMinimalScope(scopeSlug));
					if (roleDef.slug === PROJECT_OWNER_ROLE_SLUG) {
						scopes.push(createMinimalScope('workflow:publish'));
						scopes.push(createMinimalScope('workflow:share'));
						scopes.push(createMinimalScope('credential:share'));
						scopes.push(createMinimalScope('credential:move'));
					}
					return createRole(roleDef.slug, {
						displayName: roleDef.displayName,
						description: roleDef.description ?? null,
						roleType: namespace as Role['roleType'],
						scopes,
					});
				}),
			);

			const allScopes = createAllScopes();
			scopeRepository.find.mockResolvedValue(allScopes);
			// syncScopes calls roleRepository.find({ relations: ['scopes'], ... }); syncRoles calls it with select/where.
			// Return [] for the obsolete-scopes lookup so syncScopes does not save; return correctRoles for syncRoles.
			roleRepository.find.mockImplementation(async (opts?: { relations?: string[] }) =>
				opts?.relations?.includes('scopes') ? [] : correctRoles,
			);
			roleRepository.save.mockImplementation(async (entities) => entities as any);

			await authRolesService.init();

			expect(roleRepository.save).not.toHaveBeenCalled();
		});

		test('should log when updating roles', async () => {
			const allScopes = createAllScopes();
			setupDefaultMocks(allScopes);
			// syncScopes and syncRoles each call roleRepository.find() once
			roleRepository.find.mockResolvedValue([]);

			await authRolesService.init();

			Object.keys(ALL_ROLES).forEach((roleNamespace) => {
				expect(logger.debug).toHaveBeenCalledWith(
					expect.stringContaining(`${roleNamespace} roles`),
				);
			});
		});

		describe('personal space settings', () => {
			beforeEach(() => {
				roleRepository.create.mockClear();
				roleRepository.save.mockClear();
			});

			function mockPersonalSpaceSettings(
				publishing: boolean | null,
				sharing: boolean | null,
			): void {
				const rows: { key: string; value: string; loadOnStartup: boolean }[] = [];
				if (publishing !== null) {
					rows.push({
						key: PERSONAL_SPACE_PUBLISHING_SETTING.key,
						value: publishing ? 'true' : 'false',
						loadOnStartup: true,
					});
				}
				if (sharing !== null) {
					rows.push({
						key: PERSONAL_SPACE_SHARING_SETTING.key,
						value: sharing ? 'true' : 'false',
						loadOnStartup: true,
					});
				}
				settingsRepository.findByKeys.mockResolvedValue(rows);
			}

			describe('personal space publishing', () => {
				test('should add workflow:publish to personalOwner role when setting is null (backward compatibility)', async () => {
					const allScopes = createAllScopes();
					setupDefaultMocks(allScopes);
					// findByKeys default [] in beforeEach => both values undefined => backward compat => grant scopes
					await authRolesService.init();

					const personalOwnerCall = roleRepository.create.mock.calls.find(
						(call) => (call[0] as Role).slug === PROJECT_OWNER_ROLE_SLUG,
					);

					expect(personalOwnerCall).toBeDefined();
					const personalOwnerRole = personalOwnerCall?.[0] as Role;
					const scopeSlugs = personalOwnerRole.scopes.map((s: Scope) => s.slug);
					expect(scopeSlugs).toContain('workflow:publish');
				});

				test('should add workflow:publish to personalOwner role when setting is true', async () => {
					const allScopes = createAllScopes();
					setupDefaultMocks(allScopes);
					mockPersonalSpaceSettings(true, null);

					await authRolesService.init();

					const personalOwnerCall = roleRepository.create.mock.calls.find(
						(call) => (call[0] as Role).slug === PROJECT_OWNER_ROLE_SLUG,
					);

					expect(personalOwnerCall).toBeDefined();
					const personalOwnerRole = personalOwnerCall?.[0] as Role;
					const scopeSlugs = personalOwnerRole.scopes.map((s: Scope) => s.slug);
					expect(scopeSlugs).toContain('workflow:publish');
				});

				test('should NOT add workflow:publish to personalOwner role when setting is false', async () => {
					const allScopes = createAllScopes();
					setupDefaultMocks(allScopes);
					mockPersonalSpaceSettings(false, null);

					await authRolesService.init();

					const personalOwnerCall = roleRepository.create.mock.calls.find(
						(call) => (call[0] as Role).slug === PROJECT_OWNER_ROLE_SLUG,
					);

					expect(personalOwnerCall).toBeDefined();
					const personalOwnerRole = personalOwnerCall?.[0] as Role;
					const scopeSlugs = personalOwnerRole.scopes.map((s: Scope) => s.slug);
					expect(scopeSlugs).not.toContain('workflow:publish');
				});

				test('should update existing personalOwner role to add workflow:publish when setting is true', async () => {
					const allScopes = createAllScopes();
					const personalOwnerRoleDef = ALL_ROLES.project.find(
						(r) => r.slug === PROJECT_OWNER_ROLE_SLUG,
					)!;
					const existingRole = createRole(PROJECT_OWNER_ROLE_SLUG, {
						displayName: personalOwnerRoleDef.displayName,
						description: personalOwnerRoleDef.description ?? null,
						roleType: 'project',
						scopes: [],
					});

					scopeRepository.find.mockResolvedValue(allScopes);
					roleRepository.find.mockResolvedValue([existingRole]);
					roleRepository.save.mockImplementation(async (entities) => entities as any);
					mockPersonalSpaceSettings(true, null);

					await authRolesService.init();

					expect(roleRepository.save).toHaveBeenCalled();
					const projectRoleSaveCall = roleRepository.save.mock.calls.find((call) => {
						const roles = call[0] as Role[];
						return Array.isArray(roles) && roles.some((r) => r?.roleType === 'project');
					});

					expect(projectRoleSaveCall).toBeDefined();
					const savedRoles = projectRoleSaveCall?.[0] as Role[];
					const updatedRole = savedRoles.find((r) => r?.slug === PROJECT_OWNER_ROLE_SLUG);

					expect(updatedRole).toBeDefined();
					const scopeSlugs = updatedRole?.scopes.map((s) => s.slug) ?? [];
					expect(scopeSlugs).toContain('workflow:publish');
				});

				test('should update existing personalOwner role to remove workflow:publish when setting is false', async () => {
					const allScopes = createAllScopes();
					const personalOwnerRoleDef = ALL_ROLES.project.find(
						(r) => r.slug === PROJECT_OWNER_ROLE_SLUG,
					)!;
					const publishScope = allScopes.find((s) => s.slug === 'workflow:publish')!;
					const existingRole = createRole(PROJECT_OWNER_ROLE_SLUG, {
						displayName: personalOwnerRoleDef.displayName,
						description: personalOwnerRoleDef.description ?? null,
						roleType: 'project',
						scopes: [publishScope],
					});

					scopeRepository.find.mockResolvedValue(allScopes);
					roleRepository.find.mockResolvedValue([existingRole]);
					roleRepository.save.mockImplementation(async (entities) => entities as any);
					mockPersonalSpaceSettings(false, null);

					await authRolesService.init();

					expect(roleRepository.save).toHaveBeenCalled();
					const projectRoleSaveCall = roleRepository.save.mock.calls.find((call) => {
						const roles = call[0] as Role[];
						return Array.isArray(roles) && roles.some((r) => r?.roleType === 'project');
					});

					expect(projectRoleSaveCall).toBeDefined();
					const savedRoles = projectRoleSaveCall?.[0] as Role[];
					const updatedRole = savedRoles.find((r) => r?.slug === PROJECT_OWNER_ROLE_SLUG);

					expect(updatedRole).toBeDefined();
					const scopeSlugs = updatedRole?.scopes.map((s) => s.slug) ?? [];
					expect(scopeSlugs).not.toContain('workflow:publish');
				});
			});

			describe('personal space sharing', () => {
				test('should add sharing scopes to personalOwner role when setting is null (backward compatibility)', async () => {
					const allScopes = createAllScopes();
					setupDefaultMocks(allScopes);
					// findByKeys default [] in beforeEach => both values undefined => backward compat => grant scopes
					await authRolesService.init();

					const personalOwnerCall = roleRepository.create.mock.calls.find(
						(call) => (call[0] as Role).slug === PROJECT_OWNER_ROLE_SLUG,
					);
					expect(personalOwnerCall).toBeDefined();
					const scopeSlugs = (personalOwnerCall?.[0] as Role).scopes.map((s: Scope) => s.slug);
					for (const scope of SHARING_SCOPES) {
						expect(scopeSlugs).toContain(scope);
					}
				});

				test('should add sharing scopes to personalOwner role when setting is true', async () => {
					const allScopes = createAllScopes();
					setupDefaultMocks(allScopes);
					mockPersonalSpaceSettings(false, true);

					await authRolesService.init();

					const personalOwnerCall = roleRepository.create.mock.calls.find(
						(call) => (call[0] as Role).slug === PROJECT_OWNER_ROLE_SLUG,
					);
					expect(personalOwnerCall).toBeDefined();
					const scopeSlugs = (personalOwnerCall?.[0] as Role).scopes.map((s: Scope) => s.slug);
					for (const scope of SHARING_SCOPES) {
						expect(scopeSlugs).toContain(scope);
					}
					expect(scopeSlugs).not.toContain('workflow:publish');
				});

				test('should NOT add sharing scopes to personalOwner role when setting is false', async () => {
					const allScopes = createAllScopes();
					setupDefaultMocks(allScopes);
					mockPersonalSpaceSettings(false, false);

					await authRolesService.init();

					const personalOwnerCall = roleRepository.create.mock.calls.find(
						(call) => (call[0] as Role).slug === PROJECT_OWNER_ROLE_SLUG,
					);
					expect(personalOwnerCall).toBeDefined();
					const scopeSlugs = (personalOwnerCall?.[0] as Role).scopes.map((s: Scope) => s.slug);
					for (const scope of SHARING_SCOPES) {
						expect(scopeSlugs).not.toContain(scope);
					}
				});

				test('should update existing personalOwner role to add sharing scopes when setting is true', async () => {
					const allScopes = createAllScopes();
					const personalOwnerRoleDef = ALL_ROLES.project.find(
						(r) => r.slug === PROJECT_OWNER_ROLE_SLUG,
					)!;
					const existingRole = createRole(PROJECT_OWNER_ROLE_SLUG, {
						displayName: personalOwnerRoleDef.displayName,
						description: personalOwnerRoleDef.description ?? null,
						roleType: 'project',
						scopes: [],
					});

					scopeRepository.find.mockResolvedValue(allScopes);
					roleRepository.find.mockResolvedValue([existingRole]);
					roleRepository.save.mockImplementation(async (entities) => entities as any);
					mockPersonalSpaceSettings(false, true);

					await authRolesService.init();

					expect(roleRepository.save).toHaveBeenCalled();
					const projectRoleSaveCall = roleRepository.save.mock.calls.find((call) => {
						const roles = call[0] as Role[];
						return Array.isArray(roles) && roles.some((r) => r?.roleType === 'project');
					});
					const savedRoles = projectRoleSaveCall?.[0] as Role[];
					const updatedRole = savedRoles.find((r) => r?.slug === PROJECT_OWNER_ROLE_SLUG);
					expect(updatedRole).toBeDefined();
					const scopeSlugs = updatedRole?.scopes.map((s) => s.slug) ?? [];
					for (const scope of SHARING_SCOPES) {
						expect(scopeSlugs).toContain(scope);
					}
				});

				test('should update existing personalOwner role to remove sharing scopes when setting is false', async () => {
					const allScopes = createAllScopes();
					const personalOwnerRoleDef = ALL_ROLES.project.find(
						(r) => r.slug === PROJECT_OWNER_ROLE_SLUG,
					)!;
					const sharingScopeEntities = SHARING_SCOPES.map(
						(slug) => allScopes.find((s) => s.slug === slug)!,
					).filter(Boolean);
					const existingRole = createRole(PROJECT_OWNER_ROLE_SLUG, {
						displayName: personalOwnerRoleDef.displayName,
						description: personalOwnerRoleDef.description ?? null,
						roleType: 'project',
						scopes: sharingScopeEntities,
					});

					scopeRepository.find.mockResolvedValue(allScopes);
					roleRepository.find.mockResolvedValue([existingRole]);
					roleRepository.save.mockImplementation(async (entities) => entities as any);
					mockPersonalSpaceSettings(false, false);

					await authRolesService.init();

					expect(roleRepository.save).toHaveBeenCalled();
					const projectRoleSaveCall = roleRepository.save.mock.calls.find((call) => {
						const roles = call[0] as Role[];
						return Array.isArray(roles) && roles.some((r) => r?.roleType === 'project');
					});
					const savedRoles = projectRoleSaveCall?.[0] as Role[];
					const updatedRole = savedRoles.find((r) => r?.slug === PROJECT_OWNER_ROLE_SLUG);
					expect(updatedRole).toBeDefined();
					const scopeSlugs = updatedRole?.scopes.map((s) => s.slug) ?? [];
					for (const scope of SHARING_SCOPES) {
						expect(scopeSlugs).not.toContain(scope);
					}
				});
			});

			describe('personal space publishing and sharing combinations', () => {
				test('publishing disabled, sharing enabled: personalOwner has sharing scopes but NOT workflow:publish', async () => {
					const allScopes = createAllScopes();
					setupDefaultMocks(allScopes);
					mockPersonalSpaceSettings(false, true);

					await authRolesService.init();

					const personalOwnerCall = roleRepository.create.mock.calls.find(
						(call) => (call[0] as Role).slug === PROJECT_OWNER_ROLE_SLUG,
					);
					expect(personalOwnerCall).toBeDefined();
					const scopeSlugs = (personalOwnerCall?.[0] as Role).scopes.map((s: Scope) => s.slug);
					expect(scopeSlugs).not.toContain('workflow:publish');
					for (const scope of SHARING_SCOPES) {
						expect(scopeSlugs).toContain(scope);
					}
				});

				test('publishing enabled, sharing disabled: personalOwner has workflow:publish but NOT sharing scopes', async () => {
					const allScopes = createAllScopes();
					setupDefaultMocks(allScopes);
					mockPersonalSpaceSettings(true, false);

					await authRolesService.init();

					const personalOwnerCall = roleRepository.create.mock.calls.find(
						(call) => (call[0] as Role).slug === PROJECT_OWNER_ROLE_SLUG,
					);
					expect(personalOwnerCall).toBeDefined();
					const scopeSlugs = (personalOwnerCall?.[0] as Role).scopes.map((s: Scope) => s.slug);
					expect(scopeSlugs).toContain('workflow:publish');
					for (const scope of SHARING_SCOPES) {
						expect(scopeSlugs).not.toContain(scope);
					}
				});
			});
		});
	});
});
