import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { RoleRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { staticRolesWithScope } from '@n8n/permissions';
import { mock } from 'jest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';
import { RoleCacheService } from '@/services/role-cache.service';

// Mock static function
jest.mock('@n8n/permissions', () => ({
	...jest.requireActual('@n8n/permissions'),
	staticRolesWithScope: jest.fn(),
}));

describe('RoleCacheService', () => {
	const cacheService = mock<CacheService>();
	const logger = mockInstance(Logger);
	const roleRepository = mockInstance(RoleRepository);
	const staticRolesMock = staticRolesWithScope as jest.MockedFunction<typeof staticRolesWithScope>;

	const roleCacheService = new RoleCacheService(cacheService, logger);

	const mockRoleScopeMap = {
		project: {
			'project:admin': {
				scopes: ['project:read', 'project:update', 'project:delete', 'credential:read'],
			},
			'project:editor': {
				scopes: ['project:read', 'project:update'],
			},
			'project:viewer': {
				scopes: ['project:read'],
			},
		},
		credential: {
			'credential:owner': {
				scopes: ['credential:read', 'credential:update'],
			},
		},
		workflow: {
			'workflow:owner': {
				scopes: ['workflow:read', 'workflow:update', 'credential:read'],
			},
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(Container, 'get').mockReturnValue(roleRepository);
	});

	describe('getRolesWithAllScopes', () => {
		it('should return empty array when no scopes provided', async () => {
			const result = await roleCacheService.getRolesWithAllScopes('project', []);

			expect(result).toEqual([]);
			expect(cacheService.get).not.toHaveBeenCalled();
		});

		it('should return roles matching namespace and all required scopes', async () => {
			cacheService.get.mockResolvedValue(mockRoleScopeMap);

			const result = await roleCacheService.getRolesWithAllScopes('project', [
				'project:read',
				'project:update',
			]);

			expect(result).toContain('project:admin');
			expect(result).toContain('project:editor');
			expect(result).not.toContain('project:viewer'); // Missing 'project:update'
			expect(result).not.toContain('credential:owner'); // Wrong namespace
		});

		it('should exclude roles from different namespaces', async () => {
			cacheService.get.mockResolvedValue(mockRoleScopeMap);

			const result = await roleCacheService.getRolesWithAllScopes('credential', [
				'credential:read',
			]);

			expect(result).toContain('credential:owner');
			expect(result).not.toContain('project:admin');
			expect(result).not.toContain('workflow:owner');
		});

		it('should exclude roles missing any required scope', async () => {
			cacheService.get.mockResolvedValue(mockRoleScopeMap);

			const result = await roleCacheService.getRolesWithAllScopes('project', [
				'project:read',
				'project:update',
				'project:delete',
			]);

			expect(result).toContain('project:admin'); // Has all three scopes
			expect(result).not.toContain('project:editor'); // Missing 'project:delete'
			expect(result).not.toContain('project:viewer'); // Missing 'project:update' and 'project:delete'
		});
	});

	describe('cache behavior', () => {
		it('should use cached data when available', async () => {
			cacheService.get.mockResolvedValue(mockRoleScopeMap);

			const result = await roleCacheService.getRolesWithAllScopes('project', ['project:read']);

			expect(cacheService.get).toHaveBeenCalledWith('roles:scope-map', {
				refreshFn: expect.any(Function),
				fallbackValue: undefined,
			});
			expect(result).toContain('project:admin');
			expect(result).toContain('project:editor');
			expect(result).toContain('project:viewer');
		});

		it('should fallback to static roles when cache returns undefined', async () => {
			cacheService.get.mockResolvedValue(undefined);
			staticRolesMock.mockReturnValue(['static:role']);

			const result = await roleCacheService.getRolesWithAllScopes('project', ['project:read']);

			expect(staticRolesMock).toHaveBeenCalledWith('project', ['project:read']);
			expect(result).toEqual(['static:role']);
			expect(logger.error).toHaveBeenCalledWith(
				'Role scope map is undefined, falling back to static roles',
			);
		});
	});

	describe('buildRoleScopeMap', () => {
		it('should refresh cache with new data from database', async () => {
			const mockRoles = [
				{
					slug: 'project:admin',
					displayName: 'Project Admin',
					description: 'Admin role for projects',
					systemRole: true,
					roleType: 'project' as const,
					projectRelations: [],
					createdAt: new Date(),
					updatedAt: new Date(),
					setUpdateDate: () => {},
					scopes: [
						{
							slug: 'project:read' as const,
							displayName: 'Read Projects',
							description: 'Can read project data',
						},
						{
							slug: 'project:update' as const,
							displayName: 'Update Projects',
							description: 'Can update project data',
						},
					],
				},
				{
					slug: 'credential:owner',
					displayName: 'Credential Owner',
					description: 'Owner of credentials',
					systemRole: true,
					createdAt: new Date(),
					setUpdateDate: () => {},
					updatedAt: new Date(),
					roleType: 'credential' as const,
					projectRelations: [],
					scopes: [
						{
							slug: 'credential:read' as const,
							displayName: 'Read Credentials',
							description: 'Can read credential data',
						},
						{
							slug: 'credential:update' as const,
							displayName: 'Update Credentials',
							description: 'Can update credential data',
						},
					],
				},
			];
			roleRepository.findAll.mockResolvedValue(mockRoles);

			await roleCacheService.refreshCache();

			expect(Container.get).toHaveBeenCalledWith(RoleRepository);
			expect(roleRepository.findAll).toHaveBeenCalledTimes(1);
			expect(cacheService.set).toHaveBeenCalledWith(
				'roles:scope-map',
				{
					project: {
						'project:admin': {
							scopes: ['project:read', 'project:update'],
						},
					},
					credential: {
						'credential:owner': {
							scopes: ['credential:read', 'credential:update'],
						},
					},
				},
				300000, // 5 minutes TTL
			);
		});

		it('should handle database errors and rethrow with logging', async () => {
			const dbError = new Error('Database connection failed');
			roleRepository.findAll.mockRejectedValue(dbError);

			await expect(roleCacheService.refreshCache()).rejects.toThrow(dbError);

			expect(logger.error).toHaveBeenCalledWith('Failed to build role scope from database', {
				error: dbError,
			});
		});
	});

	describe('cache management', () => {
		it('should invalidate cache correctly', async () => {
			await roleCacheService.invalidateCache();

			expect(cacheService.delete).toHaveBeenCalledWith('roles:scope-map');
		});

		it('should refresh cache with new data from database', async () => {
			const mockRoles = [
				{
					slug: 'workflow:custom',
					displayName: 'Custom Workflow Role',
					description: 'Custom workflow access',
					systemRole: false,
					roleType: 'workflow' as const,
					projectRelations: [],
					createdAt: new Date(),
					updatedAt: new Date(),
					setUpdateDate: () => {},
					scopes: [
						{
							slug: 'workflow:read' as const,
							displayName: 'Read Workflows',
							description: 'Can read workflow data',
						},
					],
				},
			];
			roleRepository.findAll.mockResolvedValue(mockRoles);

			await roleCacheService.refreshCache();

			expect(roleRepository.findAll).toHaveBeenCalledTimes(1);
			expect(cacheService.set).toHaveBeenCalledWith(
				'roles:scope-map',
				{
					workflow: {
						'workflow:custom': {
							scopes: ['workflow:read'],
						},
					},
				},
				300000, // 5 minutes TTL
			);
		});
	});

	describe('error scenarios', () => {
		it('should fail if cache service fails to provide data', async () => {
			const cacheError = new Error('Cache service unavailable');
			cacheService.get.mockRejectedValue(cacheError);
			staticRolesMock.mockReturnValue(['fallback:role']);

			// This should not throw, but rather handle the error gracefully
			await expect(
				roleCacheService.getRolesWithAllScopes('project', ['project:read']),
			).rejects.toThrow(cacheError);
		});

		it('should log errors and rethrow when database fails during refresh', async () => {
			const dbError = new Error('Database query timeout');
			roleRepository.findAll.mockRejectedValue(dbError);

			// Trigger database call through cache refresh
			cacheService.get.mockImplementation(async (key, options) => {
				if (options?.refreshFn) {
					await options.refreshFn(key);
				}
				return undefined;
			});

			await expect(
				roleCacheService.getRolesWithAllScopes('project', ['project:read']),
			).rejects.toThrow(dbError);

			expect(logger.error).toHaveBeenCalledWith('Failed to build role scope from database', {
				error: dbError,
			});
		});
	});
});
