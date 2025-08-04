'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const event_service_1 = require('@/events/event.service');
const enhanced_roles_controller_1 = require('../enhanced-roles.controller');
describe('EnhancedRolesController', () => {
	const enhancedRoleService = (0, jest_mock_extended_1.mock)();
	const eventService = (0, backend_test_utils_1.mockInstance)(event_service_1.EventService);
	const controller = new enhanced_roles_controller_1.EnhancedRolesController(
		(0, jest_mock_extended_1.mock)(),
		enhancedRoleService,
	);
	beforeEach(() => {
		jest.restoreAllMocks();
	});
	describe('getPermissionDefinitions', () => {
		it('should return permission definitions', async () => {
			const mockPermissions = [
				{
					id: 'workflow:create',
					resource: 'workflow',
					action: 'create',
					description: 'Create workflows',
					category: 'workflow',
					isDefault: true,
					dependencies: [],
				},
			];
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			enhancedRoleService.getPermissionDefinitions.mockResolvedValue(mockPermissions);
			const result = await controller.getPermissionDefinitions(
				request,
				(0, jest_mock_extended_1.mock)(),
			);
			expect(enhancedRoleService.getPermissionDefinitions).toHaveBeenCalledWith(undefined);
			expect(result).toEqual(mockPermissions);
		});
		it('should filter by category when provided', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			enhancedRoleService.getPermissionDefinitions.mockResolvedValue([]);
			await controller.getPermissionDefinitions(
				request,
				(0, jest_mock_extended_1.mock)(),
				'workflow',
			);
			expect(enhancedRoleService.getPermissionDefinitions).toHaveBeenCalledWith('workflow');
		});
	});
	describe('validatePermissions', () => {
		it('should validate permissions successfully', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const body = { permissionIds: ['workflow:create', 'workflow:read'] };
			const mockValidation = [
				{
					permissionId: 'workflow:create',
					isValid: true,
					conflicts: [],
					dependencies: [],
					licenseCompatibility: {
						isCompatible: true,
						requiredLicense: undefined,
						currentLicense: 'community',
					},
				},
			];
			enhancedRoleService.validatePermissions.mockResolvedValue(mockValidation);
			const result = await controller.validatePermissions(
				request,
				(0, jest_mock_extended_1.mock)(),
				body,
			);
			expect(enhancedRoleService.validatePermissions).toHaveBeenCalledWith(body.permissionIds);
			expect(result).toEqual(mockValidation);
		});
		it('should throw error for empty permission IDs', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const body = { permissionIds: [] };
			await expect(
				controller.validatePermissions(request, (0, jest_mock_extended_1.mock)(), body),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
	});
	describe('getEnhancedRoles', () => {
		it('should return enhanced roles with pagination', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const query = {
				scope: 'project',
				limit: 10,
				offset: 0,
			};
			const mockResponse = {
				roles: [],
				total: 0,
			};
			enhancedRoleService.getEnhancedRoles.mockResolvedValue(mockResponse);
			const result = await controller.getEnhancedRoles(
				request,
				(0, jest_mock_extended_1.mock)(),
				query,
			);
			expect(enhancedRoleService.getEnhancedRoles).toHaveBeenCalledWith(query);
			expect(result).toEqual(mockResponse);
		});
	});
	describe('createCustomRole', () => {
		it('should create custom role successfully for admin', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const roleData = {
				name: 'Test Custom Role',
				description: 'A test role',
				permissions: ['workflow:create', 'workflow:read'],
				scope: 'project',
			};
			const mockCreatedRole = {
				id: 'custom-role-123',
				name: roleData.name,
				description: roleData.description,
				permissions: roleData.permissions,
				scope: roleData.scope,
				isActive: true,
				createdBy: request.user.id,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
			enhancedRoleService.createCustomRole.mockResolvedValue(mockCreatedRole);
			const result = await controller.createCustomRole(
				request,
				(0, jest_mock_extended_1.mock)(),
				roleData,
			);
			expect(enhancedRoleService.createCustomRole).toHaveBeenCalledWith(request.user, roleData);
			expect(result).toEqual(mockCreatedRole);
			expect(eventService.emit).toHaveBeenCalledWith('custom-role-management', {
				userId: request.user.id,
				action: 'create',
				roleId: mockCreatedRole.id,
				roleName: mockCreatedRole.name,
				publicApi: false,
			});
		});
		it('should deny access for non-admin users', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'member-123', role: 'global:member' },
			});
			const roleData = {
				name: 'Test Role',
				permissions: ['workflow:read'],
				scope: 'project',
			};
			await expect(
				controller.createCustomRole(request, (0, jest_mock_extended_1.mock)(), roleData),
			).rejects.toThrow(forbidden_error_1.ForbiddenError);
		});
	});
	describe('updateCustomRole', () => {
		it('should update custom role successfully', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const roleId = 'custom-role-123';
			const updateData = {
				name: 'Updated Role Name',
				permissions: ['workflow:create', 'workflow:read', 'workflow:update'],
			};
			const mockUpdatedRole = {
				id: roleId,
				name: updateData.name,
				permissions: updateData.permissions,
				scope: 'project',
				isActive: true,
				createdBy: request.user.id,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
			enhancedRoleService.updateCustomRole.mockResolvedValue(mockUpdatedRole);
			const result = await controller.updateCustomRole(
				request,
				(0, jest_mock_extended_1.mock)(),
				roleId,
				updateData,
			);
			expect(enhancedRoleService.updateCustomRole).toHaveBeenCalledWith(
				request.user,
				roleId,
				updateData,
			);
			expect(result).toEqual(mockUpdatedRole);
			expect(eventService.emit).toHaveBeenCalledWith('custom-role-management', {
				userId: request.user.id,
				action: 'update',
				roleId,
				roleName: mockUpdatedRole.name,
				changes: Object.keys(updateData),
				publicApi: false,
			});
		});
	});
	describe('deleteCustomRole', () => {
		it('should delete custom role successfully', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const roleId = 'custom-role-123';
			enhancedRoleService.deleteCustomRole.mockResolvedValue(undefined);
			const result = await controller.deleteCustomRole(
				request,
				(0, jest_mock_extended_1.mock)(),
				roleId,
			);
			expect(enhancedRoleService.deleteCustomRole).toHaveBeenCalledWith(request.user, roleId);
			expect(result).toEqual({ success: true });
			expect(eventService.emit).toHaveBeenCalledWith('custom-role-management', {
				userId: request.user.id,
				action: 'delete',
				roleId,
				publicApi: false,
			});
		});
	});
	describe('assignRole', () => {
		it('should assign role successfully', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const assignment = {
				userId: 'target-user-123',
				roleId: 'custom-role-123',
				scope: 'project',
				scopeId: 'project-123',
				assignedBy: 'admin-123',
			};
			const mockRoleAssignment = {
				id: 'assignment-123',
				userId: assignment.userId,
				roleId: assignment.roleId,
				roleName: 'Test Role',
				scope: assignment.scope,
				scopeId: assignment.scopeId,
				scopeName: 'Test Project',
				assignedBy: request.user.id,
				assignedAt: new Date().toISOString(),
				expiresAt: undefined,
				isActive: true,
			};
			enhancedRoleService.assignRole.mockResolvedValue(mockRoleAssignment);
			const result = await controller.assignRole(
				request,
				(0, jest_mock_extended_1.mock)(),
				assignment,
			);
			expect(enhancedRoleService.assignRole).toHaveBeenCalledWith(request.user, {
				...assignment,
				assignedBy: request.user.id,
			});
			expect(result).toEqual(mockRoleAssignment);
			expect(eventService.emit).toHaveBeenCalledWith('enhanced-role-assigned', {
				assignerId: request.user.id,
				userId: assignment.userId,
				roleId: assignment.roleId,
				scope: assignment.scope,
				scopeId: assignment.scopeId,
				expiresAt: assignment.expiresAt,
				publicApi: false,
			});
		});
	});
	describe('bulkAssignRoles', () => {
		it('should handle bulk role assignments', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const bulkRequest = {
				assignments: [
					{
						userId: 'user-1',
						roleId: 'role-1',
						scope: 'project',
						scopeId: 'project-1',
					},
					{
						userId: 'user-2',
						roleId: 'role-2',
						scope: 'global',
					},
				],
			};
			const mockResponse = {
				success: [
					{
						userId: 'user-1',
						roleId: 'role-1',
						message: 'Role assigned successfully',
					},
				],
				errors: [
					{
						userId: 'user-2',
						roleId: 'role-2',
						error: 'User not found',
					},
				],
				totalProcessed: 2,
				successCount: 1,
				errorCount: 1,
			};
			enhancedRoleService.bulkAssignRoles.mockResolvedValue(mockResponse);
			const result = await controller.bulkAssignRoles(
				request,
				(0, jest_mock_extended_1.mock)(),
				bulkRequest,
			);
			expect(enhancedRoleService.bulkAssignRoles).toHaveBeenCalledWith(request.user, bulkRequest);
			expect(result).toEqual(mockResponse);
			expect(eventService.emit).toHaveBeenCalledWith('enhanced-roles-bulk-assigned', {
				assignerId: request.user.id,
				totalAssignments: bulkRequest.assignments.length,
				successCount: mockResponse.successCount,
				errorCount: mockResponse.errorCount,
				publicApi: false,
			});
		});
	});
	describe('checkPermission', () => {
		it('should check permission for own user', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'user-123', role: 'global:member' },
			});
			const permissionRequest = {
				userId: 'user-123',
				resource: 'workflow',
				action: 'read',
			};
			const mockResponse = {
				userId: permissionRequest.userId,
				resource: permissionRequest.resource,
				action: permissionRequest.action,
				granted: true,
				source: 'direct',
			};
			enhancedRoleService.checkPermission.mockResolvedValue(mockResponse);
			const result = await controller.checkPermission(
				request,
				(0, jest_mock_extended_1.mock)(),
				permissionRequest,
			);
			expect(enhancedRoleService.checkPermission).toHaveBeenCalledWith(permissionRequest);
			expect(result).toEqual(mockResponse);
		});
		it('should allow admin to check other user permissions', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const permissionRequest = {
				userId: 'other-user-123',
				resource: 'workflow',
				action: 'read',
			};
			const mockResponse = {
				userId: permissionRequest.userId,
				resource: permissionRequest.resource,
				action: permissionRequest.action,
				granted: false,
				source: 'denied',
			};
			enhancedRoleService.checkPermission.mockResolvedValue(mockResponse);
			const result = await controller.checkPermission(
				request,
				(0, jest_mock_extended_1.mock)(),
				permissionRequest,
			);
			expect(result).toEqual(mockResponse);
		});
		it('should deny access for non-admin to check other user permissions', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'member-123', role: 'global:member' },
			});
			const permissionRequest = {
				userId: 'other-user-123',
				resource: 'workflow',
				action: 'read',
			};
			await expect(
				controller.checkPermission(request, (0, jest_mock_extended_1.mock)(), permissionRequest),
			).rejects.toThrow(forbidden_error_1.ForbiddenError);
		});
	});
	describe('checkPermissionsBatch', () => {
		it('should check multiple permissions', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const body = {
				requests: [
					{
						userId: 'user-123',
						resource: 'workflow',
						action: 'read',
					},
					{
						userId: 'user-123',
						resource: 'workflow',
						action: 'create',
					},
				],
			};
			const mockResponses = [
				{
					userId: 'user-123',
					resource: 'workflow',
					action: 'read',
					granted: true,
					source: 'direct',
				},
				{
					userId: 'user-123',
					resource: 'workflow',
					action: 'create',
					granted: false,
					source: 'denied',
				},
			];
			enhancedRoleService.checkPermission
				.mockResolvedValueOnce(mockResponses[0])
				.mockResolvedValueOnce(mockResponses[1]);
			const result = await controller.checkPermissionsBatch(
				request,
				(0, jest_mock_extended_1.mock)(),
				body,
			);
			expect(result).toEqual(mockResponses);
			expect(enhancedRoleService.checkPermission).toHaveBeenCalledTimes(2);
		});
		it('should throw error for too many requests', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const body = {
				requests: Array(101).fill({
					userId: 'user-123',
					resource: 'workflow',
					action: 'read',
				}),
			};
			await expect(
				controller.checkPermissionsBatch(request, (0, jest_mock_extended_1.mock)(), body),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
		it('should throw error for empty requests', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const body = { requests: [] };
			await expect(
				controller.checkPermissionsBatch(request, (0, jest_mock_extended_1.mock)(), body),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
	});
	describe('getRoleUsageAnalytics', () => {
		it('should return role analytics for admin', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const roleId = 'custom-role-123';
			const mockAnalytics = {
				roleId,
				roleName: 'Test Role',
				assignmentCount: 5,
				activeAssignments: 3,
				permissionUsage: [],
				topUsers: [],
				trends: {
					assignmentGrowth: 2,
					permissionChanges: 1,
					complianceIssues: 0,
				},
			};
			enhancedRoleService.getRoleUsageAnalytics.mockResolvedValue(mockAnalytics);
			const result = await controller.getRoleUsageAnalytics(
				request,
				(0, jest_mock_extended_1.mock)(),
				roleId,
			);
			expect(enhancedRoleService.getRoleUsageAnalytics).toHaveBeenCalledWith(roleId);
			expect(result).toEqual(mockAnalytics);
		});
		it('should deny access for non-admin users', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'member-123', role: 'global:member' },
			});
			const roleId = 'custom-role-123';
			await expect(
				controller.getRoleUsageAnalytics(request, (0, jest_mock_extended_1.mock)(), roleId),
			).rejects.toThrow(forbidden_error_1.ForbiddenError);
		});
	});
	describe('getRoleSystemOverview', () => {
		it('should return system overview for admin', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const result = await controller.getRoleSystemOverview(
				request,
				(0, jest_mock_extended_1.mock)(),
			);
			expect(result).toEqual({
				totalRoles: 0,
				customRoles: 0,
				activeAssignments: 0,
				recentActivity: [],
			});
		});
		it('should deny access for non-admin users', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'member-123', role: 'global:member' },
			});
			await expect(
				controller.getRoleSystemOverview(request, (0, jest_mock_extended_1.mock)()),
			).rejects.toThrow(forbidden_error_1.ForbiddenError);
		});
	});
	describe('getUserRoles', () => {
		it('should return user roles for own user', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'user-123', role: 'global:member' },
			});
			const userId = 'user-123';
			const result = await controller.getUserRoles(
				request,
				(0, jest_mock_extended_1.mock)(),
				userId,
			);
			expect(result).toEqual({
				userId,
				roles: [],
				effectivePermissions: [],
			});
		});
		it('should allow admin to view other user roles', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'admin-123', role: 'global:admin' },
			});
			const userId = 'other-user-123';
			const result = await controller.getUserRoles(
				request,
				(0, jest_mock_extended_1.mock)(),
				userId,
			);
			expect(result).toEqual({
				userId,
				roles: [],
				effectivePermissions: [],
			});
		});
		it('should deny access for non-admin to view other user roles', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'member-123', role: 'global:member' },
			});
			const userId = 'other-user-123';
			await expect(
				controller.getUserRoles(request, (0, jest_mock_extended_1.mock)(), userId),
			).rejects.toThrow(forbidden_error_1.ForbiddenError);
		});
	});
	describe('getRoleTemplates', () => {
		it('should return all role templates', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'user-123', role: 'global:member' },
			});
			const result = await controller.getRoleTemplates(request, (0, jest_mock_extended_1.mock)());
			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBeGreaterThan(0);
			expect(result[0]).toHaveProperty('id');
			expect(result[0]).toHaveProperty('name');
			expect(result[0]).toHaveProperty('description');
			expect(result[0]).toHaveProperty('category');
			expect(result[0]).toHaveProperty('permissions');
		});
		it('should filter templates by category', async () => {
			const request = (0, jest_mock_extended_1.mock)({
				user: { id: 'user-123', role: 'global:member' },
			});
			const result = await controller.getRoleTemplates(
				request,
				(0, jest_mock_extended_1.mock)(),
				'development',
			);
			expect(result).toBeInstanceOf(Array);
			if (result.length > 0) {
				expect(result.every((template) => template.category === 'development')).toBe(true);
			}
		});
	});
});
//# sourceMappingURL=enhanced-roles.controller.test.js.map
