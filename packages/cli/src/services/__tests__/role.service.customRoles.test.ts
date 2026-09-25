import type { CreateRoleDto, UpdateRoleDto } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Role, Scope as DBScope } from '@n8n/db';
import { RoleRepository, ScopeRepository } from '@n8n/db';
import { MANDATORY_INSTANCE_SCOPES } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
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

	const roleService = new RoleService(
		licenseState,
		roleRepository,
		scopeRepository,
		roleCacheService,
		logger,
		roleDeletionCheckProxy,
		eventService,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		// Resolve every requested scope as a valid DB scope so that, absent the
		// whitelist check, the create/update path succeeds - isolating the test to
		// the roleType restriction. Deduped like the real repository, which returns
		// distinct rows.
		scopeRepository.findByList.mockImplementation(
			async (slugs: string[]) =>
				[...new Set(slugs)].map((slug) => ({ slug })) as unknown as DBScope[],
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

	/** Scope slugs the service handed to `roleRepository.save`. */
	const savedScopeSlugs = () =>
		(roleRepository.save.mock.calls[0][0] as Role).scopes.map((scope) => scope.slug);

	/** Scope slugs the service handed to `roleRepository.updateRole`. */
	const updatedScopeSlugs = () =>
		(roleRepository.updateRole.mock.calls[0][1].scopes as DBScope[]).map((scope) => scope.slug);

	describe('mandatory instance scopes', () => {
		it('adds them to a global role created with an empty scope list', async () => {
			const dto = {
				displayName: 'Bare Global Role',
				roleType: 'global',
				scopes: [],
			} as unknown as CreateRoleDto;

			await expect(roleService.createCustomRole(dto)).resolves.toBeDefined();
			expect(savedScopeSlugs()).toEqual([...MANDATORY_INSTANCE_SCOPES]);
		});

		it('adds them to a global role created without them', async () => {
			const dto = {
				displayName: 'Auditor',
				roleType: 'global',
				scopes: ['insights:read'],
			} as CreateRoleDto;

			await expect(roleService.createCustomRole(dto)).resolves.toBeDefined();
			expect(savedScopeSlugs()).toEqual(['insights:read', ...MANDATORY_INSTANCE_SCOPES]);
		});

		it('restores them when a global role update strips them', async () => {
			const dto = { scopes: ['insights:read'] } as UpdateRoleDto;

			await expect(
				roleService.updateCustomRole({
					slug: 'global:custom-abc123',
					newRole: dto,
					userId: 'user-id',
				}),
			).resolves.toBeDefined();
			expect(updatedScopeSlugs()).toEqual(['insights:read', ...MANDATORY_INSTANCE_SCOPES]);
		});

		it('does not duplicate them when the caller already sent them', async () => {
			const dto = {
				displayName: 'Explicit Global Role',
				roleType: 'global',
				scopes: ['user:list', 'tag:read'],
			} as CreateRoleDto;

			await expect(roleService.createCustomRole(dto)).resolves.toBeDefined();
			expect(savedScopeSlugs()).toEqual([...MANDATORY_INSTANCE_SCOPES]);
		});

		it('leaves a created project role untouched', async () => {
			const dto = {
				displayName: 'Project Role',
				roleType: 'project',
				scopes: ['workflow:create'],
			} as CreateRoleDto;

			await expect(roleService.createCustomRole(dto)).resolves.toBeDefined();
			// `user:list` is not on the project whitelist, so adding it would make
			// every project-role write fail.
			expect(savedScopeSlugs()).toEqual(['workflow:create']);
		});

		it('leaves an updated project role untouched', async () => {
			const dto = { scopes: ['workflow:create'] } as UpdateRoleDto;

			await expect(
				roleService.updateCustomRole({
					slug: 'project:custom-abc123',
					newRole: dto,
					userId: 'user-id',
				}),
			).resolves.toBeDefined();
			expect(updatedScopeSlugs()).toEqual(['workflow:create']);
		});

		it('leaves a project role created with an empty scope list empty', async () => {
			const dto = {
				displayName: 'Empty Project Role',
				roleType: 'project',
				scopes: [],
			} as unknown as CreateRoleDto;

			await expect(roleService.createCustomRole(dto)).resolves.toBeDefined();
			expect(savedScopeSlugs()).toEqual([]);
		});

		it('does not report a repeated input slug as invalid', async () => {
			const dto = {
				displayName: 'Duplicated Scopes Role',
				roleType: 'project',
				scopes: ['workflow:create', 'workflow:create'],
			} as CreateRoleDto;

			await expect(roleService.createCustomRole(dto)).resolves.toBeDefined();
			expect(savedScopeSlugs()).toEqual(['workflow:create']);
		});

		it('still rejects an unknown scope', async () => {
			const dto = {
				displayName: 'Unknown Scope Role',
				roleType: 'global',
				scopes: ['not:a-scope'],
			} as CreateRoleDto;
			// Resolve only the mandatory scopes, so the requested one comes back invalid.
			scopeRepository.findByList.mockResolvedValueOnce(
				MANDATORY_INSTANCE_SCOPES.map((slug) => ({ slug })) as unknown as DBScope[],
			);

			await expect(roleService.createCustomRole(dto)).rejects.toThrow(
				'The following scopes are invalid: not:a-scope',
			);
			expect(roleRepository.save).not.toHaveBeenCalled();
		});
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
});
