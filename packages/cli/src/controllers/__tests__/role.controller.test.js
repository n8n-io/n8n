'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const role_service_1 = require('@/services/role.service');
const role_controller_1 = require('../role.controller');
describe('RoleController', () => {
	const roleService = (0, backend_test_utils_1.mockInstance)(role_service_1.RoleService);
	const controller = di_1.Container.get(role_controller_1.RoleController);
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('getAllRoles', () => {
		it('should return all available roles', async () => {
			const expectedRoles = [
				{ id: 'global:owner', name: 'Owner', description: 'Global owner role' },
				{ id: 'global:admin', name: 'Admin', description: 'Global admin role' },
				{ id: 'global:member', name: 'Member', description: 'Global member role' },
				{ id: 'project:admin', name: 'Project Admin', description: 'Project admin role' },
				{ id: 'project:editor', name: 'Project Editor', description: 'Project editor role' },
				{ id: 'project:viewer', name: 'Project Viewer', description: 'Project viewer role' },
			];
			roleService.getAllRoles.mockReturnValue(expectedRoles);
			const result = controller.getAllRoles();
			expect(roleService.getAllRoles).toHaveBeenCalledTimes(1);
			expect(result).toEqual(expectedRoles);
		});
		it('should return empty array when no roles are configured', () => {
			roleService.getAllRoles.mockReturnValue([]);
			const result = controller.getAllRoles();
			expect(roleService.getAllRoles).toHaveBeenCalledTimes(1);
			expect(result).toEqual([]);
		});
		it('should handle role service returning role hierarchy', () => {
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
			const result = controller.getAllRoles();
			expect(result).toEqual(rolesWithHierarchy);
			expect(result).toHaveLength(3);
			expect(result[0].level).toBe(0);
			expect(result[1].level).toBe(1);
			expect(result[2].level).toBe(2);
		});
		it('should handle role service with enterprise roles', () => {
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
			const result = controller.getAllRoles();
			expect(result).toEqual(enterpriseRoles);
			expect(result).toHaveLength(7);
			expect(result.find((r) => r.id === 'project:personalOwner')).toBeDefined();
		});
		it('should handle role service errors gracefully', () => {
			const serviceError = new Error('Role service unavailable');
			roleService.getAllRoles.mockImplementation(() => {
				throw serviceError;
			});
			expect(() => controller.getAllRoles()).toThrow('Role service unavailable');
			expect(roleService.getAllRoles).toHaveBeenCalledTimes(1);
		});
		it('should handle role service returning null or undefined', () => {
			roleService.getAllRoles.mockReturnValue(null);
			const result = controller.getAllRoles();
			expect(result).toBeNull();
		});
		it('should maintain consistent role format structure', () => {
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
			const result = controller.getAllRoles();
			expect(result).toHaveLength(2);
			expect(result[0]).toHaveProperty('id');
			expect(result[0]).toHaveProperty('name');
			expect(result[0]).toHaveProperty('description');
			expect(result[0]).toHaveProperty('permissions');
			expect(result[0].permissions).toHaveProperty('canManageUsers');
		});
		it('should handle concurrent role requests consistently', () => {
			const roles = [
				{ id: 'global:owner', name: 'Owner' },
				{ id: 'global:member', name: 'Member' },
			];
			let callCount = 0;
			roleService.getAllRoles.mockImplementation(() => {
				callCount++;
				return [...roles];
			});
			const result1 = controller.getAllRoles();
			const result2 = controller.getAllRoles();
			const result3 = controller.getAllRoles();
			expect(callCount).toBe(3);
			expect(result1).toEqual(roles);
			expect(result2).toEqual(roles);
			expect(result3).toEqual(roles);
			expect(result1).not.toBe(result2);
		});
		it('should handle role service performance under load', () => {
			const largeRoleSet = Array.from({ length: 100 }, (_, i) => ({
				id: `role:${i}`,
				name: `Role ${i}`,
				description: `Description for role ${i}`,
			}));
			roleService.getAllRoles.mockReturnValue(largeRoleSet);
			const startTime = performance.now();
			const result = controller.getAllRoles();
			const endTime = performance.now();
			expect(result).toHaveLength(100);
			expect(endTime - startTime).toBeLessThan(100);
			expect(roleService.getAllRoles).toHaveBeenCalledTimes(1);
		});
	});
	describe('integration scenarios', () => {
		it('should handle role service returning different data types', () => {
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
				roleService.getAllRoles.mockReturnValue(input);
				const result = controller.getAllRoles();
				expect(result).toEqual(expected);
			});
		});
		it('should maintain method signature compatibility', () => {
			const roles = [{ id: 'test', name: 'Test' }];
			roleService.getAllRoles.mockReturnValue(roles);
			const result = controller.getAllRoles();
			expect(typeof controller.getAllRoles).toBe('function');
			expect(controller.getAllRoles.length).toBe(0);
			expect(result).toEqual(roles);
		});
	});
});
//# sourceMappingURL=role.controller.test.js.map
