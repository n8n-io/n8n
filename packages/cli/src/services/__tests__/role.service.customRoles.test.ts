import type { CreateRoleDto, UpdateRoleDto } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { Role, Scope as DBScope } from '@n8n/db';
import { RoleRepository, ScopeRepository } from '@n8n/db';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { RoleCacheService } from '@/services/role-cache.service';
import { RoleDeletionCheckProxy } from '@/services/role-deletion-check-proxy.service';
import { RoleService } from '@/services/role.service';

describe('RoleService custom role scope whitelist', () => {
	const licenseState = mock<LicenseState>();
	const roleRepository = mockInstance(RoleRepository);
	const scopeRepository = mockInstance(ScopeRepository);
	const roleCacheService = mockInstance(RoleCacheService);
	const logger = mockInstance(Logger);
	const roleDeletionCheckProxy = mockInstance(RoleDeletionCheckProxy);
	const eventService = mockInstance(EventService);
	const globalConfig = mock<GlobalConfig>({ canvasOnly: false });

	const roleService = new RoleService(
		licenseState,
		roleRepository,
		scopeRepository,
		roleCacheService,
		logger,
		roleDeletionCheckProxy,
		eventService,
		globalConfig,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		// Resolve every requested scope as a valid DB scope so that, absent the
		// whitelist check, the create/update path succeeds - isolating the test to
		// the roleType restriction.
		scopeRepository.findByList.mockImplementation(
			async (slugs: string[]) => slugs.map((slug) => ({ slug })) as unknown as DBScope[],
		);
		roleRepository.save.mockResolvedValue({
			slug: 'project:custom-abc123',
			scopes: [],
		} as unknown as Role);
		roleRepository.updateRole.mockResolvedValue({
			slug: 'project:custom-abc123',
			scopes: [],
		} as unknown as Role);
	});

	describe('createCustomRole', () => {
		it('rejects a project role carrying a global-only scope', async () => {
			const dto = {
				displayName: 'Bad Project Role',
				roleType: 'project',
				scopes: ['user:create'],
			} as CreateRoleDto;

			await expect(roleService.createCustomRole(dto)).rejects.toThrow(BadRequestError);
			expect(roleRepository.save).not.toHaveBeenCalled();
		});

		it('rejects a global role carrying a project-only scope', async () => {
			const dto = {
				displayName: 'Bad Global Role',
				roleType: 'global',
				scopes: ['workflow:create'],
			} as CreateRoleDto;

			await expect(roleService.createCustomRole(dto)).rejects.toThrow(BadRequestError);
			expect(roleRepository.save).not.toHaveBeenCalled();
		});

		it('accepts a project role limited to project-scoped scopes', async () => {
			const dto = {
				displayName: 'Good Project Role',
				roleType: 'project',
				scopes: ['workflow:create', 'project:read'],
			} as CreateRoleDto;

			await expect(roleService.createCustomRole(dto)).resolves.toBeDefined();
			expect(roleRepository.save).toHaveBeenCalled();
		});

		it('accepts a global role limited to global-scoped scopes', async () => {
			const dto = {
				displayName: 'Good Global Role',
				roleType: 'global',
				scopes: ['user:create'],
			} as CreateRoleDto;

			await expect(roleService.createCustomRole(dto)).resolves.toBeDefined();
			expect(roleRepository.save).toHaveBeenCalled();
		});
	});

	describe('updateCustomRole', () => {
		it('rejects updating a project role with a global-only scope', async () => {
			const dto = { scopes: ['user:create'] } as UpdateRoleDto;

			await expect(
				roleService.updateCustomRole({
					slug: 'project:custom-abc123',
					newRole: dto,
					userId: 'user-id',
				}),
			).rejects.toThrow(BadRequestError);
			expect(roleRepository.updateRole).not.toHaveBeenCalled();
		});

		it('accepts updating a project role with project-scoped scopes and emits custom-role-updated', async () => {
			const dto = { scopes: ['workflow:create'] } as UpdateRoleDto;

			await expect(
				roleService.updateCustomRole({
					slug: 'project:custom-abc123',
					newRole: dto,
					userId: 'user-id',
				}),
			).resolves.toBeDefined();
			expect(roleRepository.updateRole).toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith('custom-role-updated', {
				userId: 'user-id',
				roleSlug: 'project:custom-abc123',
				scopes: [],
			});
		});
	});

	describe('updateRole', () => {
		it('sends a custom role to the custom role path', async () => {
			roleRepository.findBySlug.mockResolvedValue({
				slug: 'project:custom-abc123',
				systemRole: false,
				scopes: [],
			} as unknown as Role);

			await roleService.updateRole({
				slug: 'project:custom-abc123',
				newRole: { scopes: ['workflow:create'] } as UpdateRoleDto,
				userId: 'user-id',
			});

			expect(roleRepository.updateRole).toHaveBeenCalled();
			expect(roleRepository.updateSystemRoleScopes).not.toHaveBeenCalled();
		});

		it('rejects an unknown role slug', async () => {
			roleRepository.findBySlug.mockResolvedValue(null);

			await expect(
				roleService.updateRole({
					slug: 'project:does-not-exist',
					newRole: { scopes: [] } as UpdateRoleDto,
					userId: 'user-id',
				}),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('updateRole on the personal space role', () => {
		const defaultScopes = [
			'workflow:create',
			'workflow:update',
			'credential:create',
			'credential:read',
		];
		const withoutCredentialCreate = defaultScopes.filter((s) => s !== 'credential:create');

		// The stored scopes of the role, so a test can start from a removed scope.
		let storedScopes: string[];

		const body = (scopes: string[]) =>
			({
				displayName: 'Personal owner',
				description: 'Owner of a personal project',
				scopes,
			}) as UpdateRoleDto;

		const update = async (newRole: UpdateRoleDto) =>
			await roleService.updateRole({
				slug: PROJECT_OWNER_ROLE_SLUG,
				newRole,
				userId: 'user-id',
			});

		/** The scopes handed to the repository for saving. */
		const updatedScopes = () => {
			const [, scopes] = roleRepository.updateSystemRoleScopes.mock.calls[0];
			return scopes.map((s) => s.slug);
		};

		beforeEach(() => {
			globalConfig.canvasOnly = true;
			storedScopes = [...defaultScopes];

			roleRepository.findBySlug.mockImplementation(
				async (slug: string) =>
					({
						slug,
						displayName: 'Personal owner',
						description: 'Owner of a personal project',
						systemRole: true,
						roleType: 'project',
						scopes: storedScopes.map((s) => ({ slug: s })),
					}) as unknown as Role,
			);
			roleRepository.updateSystemRoleScopes.mockImplementation(
				async (slug: string, scopes: DBScope[]) => ({ slug, scopes }) as unknown as Role,
			);
		});

		afterEach(() => {
			globalConfig.canvasOnly = false;
		});

		it('removes credential:create and emits personal-space-role-updated', async () => {
			const result = await update(body(withoutCredentialCreate));

			expect(updatedScopes()).toEqual(withoutCredentialCreate);
			expect(result.scopes).toEqual(withoutCredentialCreate);
			expect(roleRepository.updateRole).not.toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith('personal-space-role-updated', {
				userId: 'user-id',
				scopes: withoutCredentialCreate,
				removedScopes: ['credential:create'],
			});
			expect(eventService.emit).not.toHaveBeenCalledWith('custom-role-updated', expect.anything());
		});

		it('adds credential:create back', async () => {
			storedScopes = [...withoutCredentialCreate];

			await update(body(defaultScopes));

			expect(updatedScopes()).toContain('credential:create');
			expect(eventService.emit).toHaveBeenCalledWith('personal-space-role-updated', {
				userId: 'user-id',
				scopes: defaultScopes,
				removedScopes: [],
			});
		});

		it('rejects a scope that is not a default scope of the role', async () => {
			await expect(update(body([...defaultScopes, 'project:delete']))).rejects.toThrow(
				BadRequestError,
			);
			expect(roleRepository.updateSystemRoleScopes).not.toHaveBeenCalled();
		});

		it('rejects removing any other default scope', async () => {
			await expect(
				update(body(defaultScopes.filter((s) => s !== 'workflow:create'))),
			).rejects.toThrow(BadRequestError);
			expect(roleRepository.updateSystemRoleScopes).not.toHaveBeenCalled();
		});

		it('rejects a changed display name', async () => {
			await expect(
				update({ ...body(defaultScopes), displayName: 'Renamed' } as UpdateRoleDto),
			).rejects.toThrow(BadRequestError);
			expect(roleRepository.updateSystemRoleScopes).not.toHaveBeenCalled();
		});

		it('rejects a changed description', async () => {
			await expect(
				update({ ...body(defaultScopes), description: 'Something else' } as UpdateRoleDto),
			).rejects.toThrow(BadRequestError);
			expect(roleRepository.updateSystemRoleScopes).not.toHaveBeenCalled();
		});

		it('rejects the update when canvas-only mode is off', async () => {
			globalConfig.canvasOnly = false;

			await expect(update(body(withoutCredentialCreate))).rejects.toThrow(
				'Cannot update system roles',
			);
			expect(roleRepository.updateSystemRoleScopes).not.toHaveBeenCalled();
			expect(roleRepository.updateRole).not.toHaveBeenCalled();
		});

		it('rejects the update of another system role', async () => {
			await expect(
				roleService.updateRole({
					slug: 'project:admin',
					newRole: body(['workflow:create']),
					userId: 'user-id',
				}),
			).rejects.toThrow('Cannot update system roles');
			expect(roleRepository.updateSystemRoleScopes).not.toHaveBeenCalled();
			expect(roleRepository.updateRole).not.toHaveBeenCalled();
		});
	});
});
