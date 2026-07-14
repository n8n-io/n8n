import type { CreateRoleDto, UpdateRoleDto } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Role, Scope as DBScope } from '@n8n/db';
import { RoleRepository, ScopeRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
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

	const roleService = new RoleService(
		licenseState,
		roleRepository,
		scopeRepository,
		roleCacheService,
		logger,
		roleDeletionCheckProxy,
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

			await expect(roleService.updateCustomRole('project:custom-abc123', dto)).rejects.toThrow(
				BadRequestError,
			);
			expect(roleRepository.updateRole).not.toHaveBeenCalled();
		});

		it('accepts updating a project role with project-scoped scopes', async () => {
			const dto = { scopes: ['workflow:create'] } as UpdateRoleDto;

			await expect(
				roleService.updateCustomRole('project:custom-abc123', dto),
			).resolves.toBeDefined();
			expect(roleRepository.updateRole).toHaveBeenCalled();
		});
	});
});
