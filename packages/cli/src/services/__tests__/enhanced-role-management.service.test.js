'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const enhanced_role_management_service_1 = require('../enhanced-role-management.service');
describe('EnhancedRoleManagementService', () => {
	let enhancedRoleService;
	let userRepository;
	let projectRepository;
	let workflowRepository;
	let cacheService;
	let eventService;
	let roleService;
	beforeEach(() => {
		userRepository = (0, jest_mock_extended_1.mock)();
		projectRepository = (0, jest_mock_extended_1.mock)();
		workflowRepository = (0, jest_mock_extended_1.mock)();
		cacheService = {
			get: jest.fn(),
			set: jest.fn(),
		};
		eventService = (0, jest_mock_extended_1.mock)();
		roleService = (0, jest_mock_extended_1.mock)();
		enhancedRoleService = new enhanced_role_management_service_1.EnhancedRoleManagementService(
			(0, jest_mock_extended_1.mock)(),
			userRepository,
			cacheService,
			eventService,
		);
	});
	afterEach(() => {
		jest.clearAllMocks();
	});
	describe('getPermissionDefinitions', () => {
		it('should return all permission definitions when no category specified', async () => {
			cacheService.get.mockResolvedValue(null);
			cacheService.set.mockResolvedValue(undefined);
			const result = await enhancedRoleService.getPermissionDefinitions();
			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBeGreaterThan(0);
			expect(result[0]).toHaveProperty('id');
			expect(result[0]).toHaveProperty('resource');
			expect(result[0]).toHaveProperty('action');
			expect(result[0]).toHaveProperty('category');
			expect(cacheService.set).toHaveBeenCalled();
		});
		it('should filter permissions by category', async () => {
			cacheService.get.mockResolvedValue(null);
			cacheService.set.mockResolvedValue(undefined);
			const result = await enhancedRoleService.getPermissionDefinitions('workflow');
			expect(result).toBeInstanceOf(Array);
			expect(result.every((p) => p.category === 'workflow')).toBe(true);
		});
		it('should return cached results when available', async () => {
			const cachedResults = [
				{
					id: 'test:permission',
					resource: 'test',
					action: 'read',
					description: 'Test permission',
					category: 'core',
					isDefault: true,
					dependencies: [],
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			];
			cacheService.get.mockResolvedValue(cachedResults);
			const result = await enhancedRoleService.getPermissionDefinitions();
			expect(result).toEqual(cachedResults);
			expect(cacheService.set).not.toHaveBeenCalled();
		});
	});
	describe('validatePermissions', () => {
		it('should validate existing permissions as valid', async () => {
			const permissionIds = ['workflow:create', 'workflow:read'];
			const result = await enhancedRoleService.validatePermissions(permissionIds);
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				permissionId: 'workflow:create',
				isValid: true,
				conflicts: [],
				dependencies: [],
				licenseCompatibility: {
					isCompatible: true,
					requiredLicense: undefined,
					currentLicense: 'community',
				},
			});
		});
		it('should mark non-existent permissions as invalid', async () => {
			const permissionIds = ['invalid:permission'];
			const result = await enhancedRoleService.validatePermissions(permissionIds);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				permissionId: 'invalid:permission',
				isValid: false,
				conflicts: [],
				dependencies: [],
				licenseCompatibility: {
					isCompatible: false,
					requiredLicense: undefined,
					currentLicense: 'community',
				},
			});
		});
	});
	describe('createCustomRole', () => {
		const mockAdminUser = (0, jest_mock_extended_1.mock)({
			id: 'admin-123',
			role: 'global:admin',
		});
		const validRoleData = {
			name: 'Test Custom Role',
			description: 'A test custom role',
			permissions: ['workflow:create', 'workflow:read'],
			scope: 'project',
		};
		it('should create a custom role successfully', async () => {
			const result = await enhancedRoleService.createCustomRole(mockAdminUser, validRoleData);
			expect(result).toEqual({
				id: expect.stringMatching(/^custom_/),
				name: validRoleData.name,
				description: validRoleData.description,
				permissions: validRoleData.permissions,
				scope: validRoleData.scope,
				isActive: true,
				createdBy: mockAdminUser.id,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(eventService.emit).toHaveBeenCalledWith('custom-role-created', {
				roleId: expect.stringMatching(/^custom_/),
				roleName: validRoleData.name,
				createdBy: mockAdminUser.id,
				scope: validRoleData.scope,
				permissionCount: validRoleData.permissions.length,
			});
		});
		it('should throw error for invalid permissions', async () => {
			const invalidRoleData = {
				name: 'Invalid Role',
				permissions: ['invalid:permission'],
				scope: 'project',
			};
			await expect(
				enhancedRoleService.createCustomRole(mockAdminUser, invalidRoleData),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
		it('should throw error for duplicate role name in same scope', async () => {
			await enhancedRoleService.createCustomRole(mockAdminUser, validRoleData);
			await expect(
				enhancedRoleService.createCustomRole(mockAdminUser, validRoleData),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
	});
	describe('updateCustomRole', () => {
		const mockAdminUser = (0, jest_mock_extended_1.mock)({
			id: 'admin-123',
			role: 'global:admin',
		});
		const mockMemberUser = (0, jest_mock_extended_1.mock)({
			id: 'member-123',
			role: 'global:member',
		});
		it('should update custom role successfully', async () => {
			const createdRole = await enhancedRoleService.createCustomRole(mockAdminUser, {
				name: 'Original Role',
				permissions: ['workflow:read'],
				scope: 'project',
			});
			const updateData = {
				name: 'Updated Role',
				permissions: ['workflow:read', 'workflow:create'],
			};
			const result = await enhancedRoleService.updateCustomRole(
				mockAdminUser,
				createdRole.id,
				updateData,
			);
			expect(result.name).toBe(updateData.name);
			expect(result.permissions).toEqual(updateData.permissions);
			expect(eventService.emit).toHaveBeenCalledWith('custom-role-updated', {
				roleId: createdRole.id,
				roleName: updateData.name,
				updatedBy: mockAdminUser.id,
				changes: Object.keys(updateData),
			});
		});
		it('should throw error for non-existent role', async () => {
			await expect(
				enhancedRoleService.updateCustomRole(mockAdminUser, 'non-existent', {
					name: 'Updated Role',
				}),
			).rejects.toThrow(not_found_error_1.NotFoundError);
		});
		it('should throw error for insufficient permissions', async () => {
			const createdRole = await enhancedRoleService.createCustomRole(mockAdminUser, {
				name: 'Admin Role',
				permissions: ['workflow:read'],
				scope: 'project',
			});
			await expect(
				enhancedRoleService.updateCustomRole(mockMemberUser, createdRole.id, {
					name: 'Hacked Role',
				}),
			).rejects.toThrow(forbidden_error_1.ForbiddenError);
		});
	});
	describe('deleteCustomRole', () => {
		const mockAdminUser = (0, jest_mock_extended_1.mock)({
			id: 'admin-123',
			role: 'global:admin',
		});
		it('should delete custom role successfully', async () => {
			const createdRole = await enhancedRoleService.createCustomRole(mockAdminUser, {
				name: 'Role to Delete',
				permissions: ['workflow:read'],
				scope: 'project',
			});
			await enhancedRoleService.deleteCustomRole(mockAdminUser, createdRole.id);
			expect(eventService.emit).toHaveBeenCalledWith('custom-role-deleted', {
				roleId: createdRole.id,
				roleName: createdRole.name,
				deletedBy: mockAdminUser.id,
			});
			await expect(
				enhancedRoleService.updateCustomRole(mockAdminUser, createdRole.id, {
					name: 'Should fail',
				}),
			).rejects.toThrow(not_found_error_1.NotFoundError);
		});
		it('should throw error for non-existent role', async () => {
			await expect(
				enhancedRoleService.deleteCustomRole(mockAdminUser, 'non-existent'),
			).rejects.toThrow(not_found_error_1.NotFoundError);
		});
	});
	describe('getEnhancedRoles', () => {
		const mockQuery = {
			scope: 'project',
			type: 'custom',
			isActive: true,
			limit: 10,
			offset: 0,
		};
		it('should return enhanced roles with pagination', async () => {
			cacheService.get.mockResolvedValue(null);
			cacheService.set.mockResolvedValue(undefined);
			const result = await enhancedRoleService.getEnhancedRoles(mockQuery);
			expect(result).toHaveProperty('roles');
			expect(result).toHaveProperty('total');
			expect(result.roles).toBeInstanceOf(Array);
			expect(typeof result.total).toBe('number');
		});
		it('should return cached results when available', async () => {
			const cachedResult = { roles: [], total: 0 };
			cacheService.get.mockResolvedValue(cachedResult);
			const result = await enhancedRoleService.getEnhancedRoles(mockQuery);
			expect(result).toEqual(cachedResult);
			expect(cacheService.set).not.toHaveBeenCalled();
		});
	});
	describe('assignRole', () => {
		const mockAdminUser = (0, jest_mock_extended_1.mock)({
			id: 'admin-123',
			role: 'global:admin',
		});
		const mockTargetUser = (0, jest_mock_extended_1.mock)({
			id: 'target-123',
			role: 'global:member',
		});
		const mockAssignment = {
			userId: 'target-123',
			roleId: 'test-role',
			scope: 'project',
			scopeId: 'project-123',
			assignedBy: 'admin-123',
		};
		beforeEach(() => {
			userRepository.findOneBy.mockResolvedValue(mockTargetUser);
		});
		it('should assign role successfully', async () => {
			const createdRole = await enhancedRoleService.createCustomRole(mockAdminUser, {
				name: 'Assignable Role',
				permissions: ['workflow:read'],
				scope: 'project',
			});
			mockAssignment.roleId = createdRole.id;
			const result = await enhancedRoleService.assignRole(mockAdminUser, mockAssignment);
			expect(result).toEqual({
				id: expect.any(String),
				userId: mockAssignment.userId,
				roleId: createdRole.id,
				roleName: 'Assignable Role',
				scope: mockAssignment.scope,
				scopeId: mockAssignment.scopeId,
				scopeName: undefined,
				assignedBy: mockAssignment.assignedBy,
				assignedAt: expect.any(String),
				expiresAt: undefined,
				isActive: true,
			});
			expect(eventService.emit).toHaveBeenCalledWith('role-assigned', {
				assignmentId: expect.any(String),
				userId: mockAssignment.userId,
				roleId: createdRole.id,
				assignedBy: mockAssignment.assignedBy,
				scope: mockAssignment.scope,
				scopeId: mockAssignment.scopeId,
			});
		});
		it('should throw error for non-existent user', async () => {
			userRepository.findOneBy.mockResolvedValue(null);
			await expect(enhancedRoleService.assignRole(mockAdminUser, mockAssignment)).rejects.toThrow(
				not_found_error_1.NotFoundError,
			);
		});
		it('should throw error for non-existent role', async () => {
			mockAssignment.roleId = 'non-existent-role';
			await expect(enhancedRoleService.assignRole(mockAdminUser, mockAssignment)).rejects.toThrow(
				not_found_error_1.NotFoundError,
			);
		});
	});
	describe('checkPermission', () => {
		const mockPermissionRequest = {
			userId: 'user-123',
			resource: 'workflow',
			action: 'read',
		};
		it('should check permission successfully', async () => {
			cacheService.get.mockResolvedValue(null);
			cacheService.set.mockResolvedValue(undefined);
			const result = await enhancedRoleService.checkPermission(mockPermissionRequest);
			expect(result).toEqual({
				userId: mockPermissionRequest.userId,
				resource: mockPermissionRequest.resource,
				action: mockPermissionRequest.action,
				granted: expect.any(Boolean),
				source: expect.any(String),
				context: mockPermissionRequest.context,
			});
		});
		it('should return cached permission check result', async () => {
			const cachedResult = {
				userId: mockPermissionRequest.userId,
				resource: mockPermissionRequest.resource,
				action: mockPermissionRequest.action,
				granted: true,
				source: 'direct',
				context: undefined,
			};
			cacheService.get.mockResolvedValue(cachedResult);
			const result = await enhancedRoleService.checkPermission(mockPermissionRequest);
			expect(result).toEqual(cachedResult);
			expect(cacheService.set).not.toHaveBeenCalled();
		});
	});
	describe('getRoleUsageAnalytics', () => {
		it('should return role usage analytics', async () => {
			const mockAdminUser = (0, jest_mock_extended_1.mock)({
				id: 'admin-123',
				role: 'global:admin',
			});
			const createdRole = await enhancedRoleService.createCustomRole(mockAdminUser, {
				name: 'Analytics Role',
				permissions: ['workflow:read'],
				scope: 'project',
			});
			userRepository.findByIds.mockResolvedValue([]);
			cacheService.get.mockResolvedValue(null);
			cacheService.set.mockResolvedValue(undefined);
			const result = await enhancedRoleService.getRoleUsageAnalytics(createdRole.id);
			expect(result).toEqual({
				roleId: createdRole.id,
				roleName: 'Analytics Role',
				assignmentCount: 0,
				activeAssignments: 0,
				permissionUsage: [],
				topUsers: [],
				trends: {
					assignmentGrowth: 0,
					permissionChanges: 0,
					complianceIssues: 0,
				},
			});
		});
		it('should throw error for non-existent role', async () => {
			await expect(enhancedRoleService.getRoleUsageAnalytics('non-existent-role')).rejects.toThrow(
				not_found_error_1.NotFoundError,
			);
		});
	});
	describe('bulkAssignRoles', () => {
		const mockAdminUser = (0, jest_mock_extended_1.mock)({
			id: 'admin-123',
			role: 'global:admin',
		});
		const mockBulkRequest = {
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
		beforeEach(() => {
			userRepository.findOneBy.mockResolvedValue(
				(0, jest_mock_extended_1.mock)({ id: 'user-1', role: 'global:member' }),
			);
		});
		it('should handle bulk role assignments with mixed results', async () => {
			const role1 = await enhancedRoleService.createCustomRole(mockAdminUser, {
				name: 'Bulk Role 1',
				permissions: ['workflow:read'],
				scope: 'project',
			});
			const role2 = await enhancedRoleService.createCustomRole(mockAdminUser, {
				name: 'Bulk Role 2',
				permissions: ['workflow:create'],
				scope: 'global',
			});
			mockBulkRequest.assignments[0].roleId = role1.id;
			mockBulkRequest.assignments[1].roleId = role2.id;
			const result = await enhancedRoleService.bulkAssignRoles(mockAdminUser, mockBulkRequest);
			expect(result).toEqual({
				success: expect.any(Array),
				errors: expect.any(Array),
				totalProcessed: 2,
				successCount: expect.any(Number),
				errorCount: expect.any(Number),
			});
			expect(result.totalProcessed).toBe(2);
			expect(result.successCount + result.errorCount).toBe(2);
		});
	});
});
//# sourceMappingURL=enhanced-role-management.service.test.js.map
