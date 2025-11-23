import type { LicenseState } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { RoleRepository, ScopeRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { RoleCacheService } from '@/services/role-cache.service';
import { RoleService } from '@/services/role.service';

describe('RoleService.rolesWithScope', () => {
	const licenseState = mock<LicenseState>();
	const roleRepository = mockInstance(RoleRepository);
	const scopeRepository = mockInstance(ScopeRepository);
	const roleCacheService = mockInstance(RoleCacheService);

	const roleService = new RoleService(
		licenseState,
		roleRepository,
		scopeRepository,
		roleCacheService,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('core functionality', () => {
		it('should convert single scope to array and call cache service', async () => {
			const mockRoles = ['project:admin', 'project:editor'];
			roleCacheService.getRolesWithAllScopes.mockResolvedValue(mockRoles);

			const result = await roleService.rolesWithScope('project', 'project:read');

			expect(roleCacheService.getRolesWithAllScopes).toHaveBeenCalledWith('project', [
				'project:read',
			]);
			expect(result).toEqual(mockRoles);
		});

		it('should pass array scopes through correctly', async () => {
			const mockRoles = ['project:admin'];
			const inputScopes = ['project:read' as const, 'project:update' as const];
			roleCacheService.getRolesWithAllScopes.mockResolvedValue(mockRoles);

			const result = await roleService.rolesWithScope('project', inputScopes);

			expect(roleCacheService.getRolesWithAllScopes).toHaveBeenCalledWith('project', inputScopes);
			expect(result).toEqual(mockRoles);
		});

		it('should handle empty array input', async () => {
			const mockRoles: string[] = [];
			roleCacheService.getRolesWithAllScopes.mockResolvedValue(mockRoles);

			const result = await roleService.rolesWithScope('project', []);

			expect(roleCacheService.getRolesWithAllScopes).toHaveBeenCalledWith('project', []);
			expect(result).toEqual([]);
		});
	});

	describe('cache service integration', () => {
		it('should work with different namespaces', async () => {
			const credentialRoles = ['credential:owner'];
			const workflowRoles = ['workflow:owner'];

			roleCacheService.getRolesWithAllScopes.mockImplementation(async (namespace) => {
				if (namespace === 'credential') return credentialRoles;
				if (namespace === 'workflow') return workflowRoles;
				return [];
			});

			const credentialResult = await roleService.rolesWithScope('credential', ['credential:read']);
			const workflowResult = await roleService.rolesWithScope('workflow', ['workflow:read']);

			expect(credentialResult).toEqual(credentialRoles);
			expect(workflowResult).toEqual(workflowRoles);
			expect(roleCacheService.getRolesWithAllScopes).toHaveBeenCalledTimes(2);
		});

		it('should propagate cache service errors', async () => {
			const cacheError = new Error('Cache service failed');
			roleCacheService.getRolesWithAllScopes.mockRejectedValue(cacheError);

			await expect(roleService.rolesWithScope('project', ['project:read'])).rejects.toThrow(
				cacheError,
			);
		});

		it('should handle successful cache responses', async () => {
			const mockRoles = ['project:admin', 'project:editor', 'project:viewer'];
			roleCacheService.getRolesWithAllScopes.mockResolvedValue(mockRoles);

			const result = await roleService.rolesWithScope('project', [
				'project:read',
				'project:update',
			]);

			expect(roleCacheService.getRolesWithAllScopes).toHaveBeenCalledWith('project', [
				'project:read',
				'project:update',
			]);
			expect(result).toEqual(mockRoles);
		});
	});

	describe('input validation', () => {
		it('should handle various valid scope formats', async () => {
			const mockRoles = ['credential:owner'];
			roleCacheService.getRolesWithAllScopes.mockResolvedValue(mockRoles);

			// Test different scope formats
			await roleService.rolesWithScope('credential', 'credential:read');
			await roleService.rolesWithScope('workflow', 'workflow:execute');
			await roleService.rolesWithScope('project', 'project:delete');

			expect(roleCacheService.getRolesWithAllScopes).toHaveBeenCalledTimes(3);
			expect(roleCacheService.getRolesWithAllScopes).toHaveBeenNthCalledWith(1, 'credential', [
				'credential:read',
			]);
			expect(roleCacheService.getRolesWithAllScopes).toHaveBeenNthCalledWith(2, 'workflow', [
				'workflow:execute',
			]);
			expect(roleCacheService.getRolesWithAllScopes).toHaveBeenNthCalledWith(3, 'project', [
				'project:delete',
			]);
		});

		it('should handle mixed scope arrays', async () => {
			const mockRoles = ['project:admin'];
			const mixedScopes = [
				'project:read' as const,
				'project:update' as const,
				'project:delete' as const,
			];
			roleCacheService.getRolesWithAllScopes.mockResolvedValue(mockRoles);

			const result = await roleService.rolesWithScope('project', mixedScopes);

			expect(roleCacheService.getRolesWithAllScopes).toHaveBeenCalledWith('project', mixedScopes);
			expect(result).toEqual(mockRoles);
		});
	});

	describe('edge cases', () => {
		it('should handle empty results from cache service', async () => {
			roleCacheService.getRolesWithAllScopes.mockResolvedValue([]);

			const result = await roleService.rolesWithScope('global', ['*' as const]);

			expect(result).toEqual([]);
		});

		it('should handle single role result', async () => {
			const mockRoles = ['project:viewer'];
			roleCacheService.getRolesWithAllScopes.mockResolvedValue(mockRoles);

			const result = await roleService.rolesWithScope('project', 'project:read');

			expect(result).toEqual(mockRoles);
		});
	});
});
