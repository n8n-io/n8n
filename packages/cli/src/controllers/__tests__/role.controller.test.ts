import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { RoleService } from '@/services/role.service';

import { RoleController } from '../role.controller';

describe('RoleController', () => {
	const roleService = mockInstance(RoleService);
	const controller = Container.get(RoleController);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getAllRoles', () => {
		it('should return all available roles', async () => {
			// Arrange
			const expectedRoles = [
				{ id: 'global:owner', name: 'Owner', description: 'Global owner role' },
				{ id: 'global:admin', name: 'Admin', description: 'Global admin role' },
				{ id: 'global:member', name: 'Member', description: 'Global member role' },
				{ id: 'project:admin', name: 'Project Admin', description: 'Project admin role' },
				{ id: 'project:editor', name: 'Project Editor', description: 'Project editor role' },
				{ id: 'project:viewer', name: 'Project Viewer', description: 'Project viewer role' },
			];

			roleService.getAllRoles.mockReturnValue(expectedRoles);

			// Act
			const result = controller.getAllRoles();

			// Assert
			expect(roleService.getAllRoles).toHaveBeenCalledTimes(1);
			expect(result).toEqual(expectedRoles);
		});

		it('should return empty array when no roles are configured', () => {
			// Arrange
			roleService.getAllRoles.mockReturnValue([]);

			// Act
			const result = controller.getAllRoles();

			// Assert
			expect(roleService.getAllRoles).toHaveBeenCalledTimes(1);
			expect(result).toEqual([]);
		});

		it('should handle role service returning role hierarchy', () => {
			// Arrange
			const rolesWithHierarchy = [
				{
					id: 'global:owner',
					name: 'Owner',
					description: 'Global owner role',
					scopes: ['*'],
					level: 0,
				},
				{
					id: 'global:admin',
					name: 'Admin',
					description: 'Global admin role',
					scopes: ['user:*', 'workflow:*', 'credential:*'],
					level: 1,
				},
				{
					id: 'global:member',
					name: 'Member',
					description: 'Global member role',
					scopes: ['workflow:read', 'credential:read'],
					level: 2,
				},
			];

			roleService.getAllRoles.mockReturnValue(rolesWithHierarchy);

			// Act
			const result = controller.getAllRoles();

			// Assert
			expect(result).toEqual(rolesWithHierarchy);
			expect(result).toHaveLength(3);
			expect(result[0].level).toBe(0);
			expect(result[1].level).toBe(1);
			expect(result[2].level).toBe(2);
		});

		it('should handle role service with enterprise roles', () => {
			// Arrange
			const enterpriseRoles = [
				{ id: 'global:owner', name: 'Owner', description: 'Global owner role' },
				{ id: 'global:admin', name: 'Admin', description: 'Global admin role' },
				{ id: 'global:member', name: 'Member', description: 'Global member role' },
				{ id: 'project:admin', name: 'Project Admin', description: 'Project admin role' },
				{ id: 'project:editor', name: 'Project Editor', description: 'Project editor role' },
				{ id: 'project:viewer', name: 'Project Viewer', description: 'Project viewer role' },
				{
					id: 'project:personalOwner',
					name: 'Personal Owner',
					description: 'Personal project owner',
				},
			];

			roleService.getAllRoles.mockReturnValue(enterpriseRoles);

			// Act
			const result = controller.getAllRoles();

			// Assert
			expect(result).toEqual(enterpriseRoles);
			expect(result).toHaveLength(7);
			expect(result.find((r) => r.id === 'project:personalOwner')).toBeDefined();
		});

		it('should handle role service errors gracefully', () => {
			// Arrange
			const serviceError = new Error('Role service unavailable');
			roleService.getAllRoles.mockImplementation(() => {
				throw serviceError;
			});

			// Act & Assert
			expect(() => controller.getAllRoles()).toThrow('Role service unavailable');
			expect(roleService.getAllRoles).toHaveBeenCalledTimes(1);
		});

		it('should handle role service returning null or undefined', () => {
			// Arrange
			roleService.getAllRoles.mockReturnValue(null as any);

			// Act
			const result = controller.getAllRoles();

			// Assert
			expect(result).toBeNull();
		});

		it('should maintain consistent role format structure', () => {
			// Arrange
			const standardRoles = [
				{
					id: 'global:owner',
					name: 'Owner',
					description: 'Global owner with full access',
					permissions: {
						canManageUsers: true,
						canManageProjects: true,
						canManageSettings: true,
					},
					createdAt: '2023-01-01T00:00:00Z',
					updatedAt: '2023-01-01T00:00:00Z',
				},
				{
					id: 'global:member',
					name: 'Member',
					description: 'Basic member access',
					permissions: {
						canManageUsers: false,
						canManageProjects: false,
						canManageSettings: false,
					},
					createdAt: '2023-01-01T00:00:00Z',
					updatedAt: '2023-01-01T00:00:00Z',
				},
			];

			roleService.getAllRoles.mockReturnValue(standardRoles);

			// Act
			const result = controller.getAllRoles();

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toHaveProperty('id');
			expect(result[0]).toHaveProperty('name');
			expect(result[0]).toHaveProperty('description');
			expect(result[0]).toHaveProperty('permissions');
			expect(result[0].permissions).toHaveProperty('canManageUsers');
		});

		it('should handle concurrent role requests consistently', () => {
			// Arrange
			const roles = [
				{ id: 'global:owner', name: 'Owner' },
				{ id: 'global:member', name: 'Member' },
			];

			let callCount = 0;
			roleService.getAllRoles.mockImplementation(() => {
				callCount++;
				return [...roles]; // Return copy to ensure immutability
			});

			// Act
			const result1 = controller.getAllRoles();
			const result2 = controller.getAllRoles();
			const result3 = controller.getAllRoles();

			// Assert
			expect(callCount).toBe(3);
			expect(result1).toEqual(roles);
			expect(result2).toEqual(roles);
			expect(result3).toEqual(roles);
			expect(result1).not.toBe(result2); // Different instances
		});

		it('should handle role service performance under load', () => {
			// Arrange
			const largeRoleSet = Array.from({ length: 100 }, (_, i) => ({
				id: `role:${i}`,
				name: `Role ${i}`,
				description: `Description for role ${i}`,
			}));

			roleService.getAllRoles.mockReturnValue(largeRoleSet);

			// Act
			const startTime = performance.now();
			const result = controller.getAllRoles();
			const endTime = performance.now();

			// Assert
			expect(result).toHaveLength(100);
			expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
			expect(roleService.getAllRoles).toHaveBeenCalledTimes(1);
		});
	});

	describe('integration scenarios', () => {
		it('should handle role service returning different data types', () => {
			// Test various return types the service might provide
			const testCases = [
				{ input: [], expected: [] },
				{ input: null, expected: null },
				{ input: undefined, expected: undefined },
				{
					input: [{ id: 'test', name: 'Test', customField: 'value' }],
					expected: [{ id: 'test', name: 'Test', customField: 'value' }],
				},
			];

			testCases.forEach(({ input, expected }, index) => {
				// Arrange
				roleService.getAllRoles.mockReturnValue(input as any);

				// Act
				const result = controller.getAllRoles();

				// Assert
				expect(result).toEqual(expected);
			});
		});

		it('should maintain method signature compatibility', () => {
			// Arrange
			const roles = [{ id: 'test', name: 'Test' }];
			roleService.getAllRoles.mockReturnValue(roles);

			// Act - verify method can be called without parameters
			const result = controller.getAllRoles();

			// Assert
			expect(typeof controller.getAllRoles).toBe('function');
			expect(controller.getAllRoles.length).toBe(0); // No parameters expected
			expect(result).toEqual(roles);
		});
	});
});
