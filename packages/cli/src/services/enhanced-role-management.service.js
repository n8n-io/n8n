'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.EnhancedRoleManagementService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const event_service_1 = require('@/events/event.service');
const cache_service_1 = require('@/services/cache/cache.service');
let EnhancedRoleManagementService = class EnhancedRoleManagementService {
	constructor(logger, userRepository, cacheService, eventService) {
		this.logger = logger;
		this.userRepository = userRepository;
		this.cacheService = cacheService;
		this.eventService = eventService;
		this.CACHE_TTL = 300;
		this.PERMISSION_CACHE_TTL = 3600;
		this.customRoles = new Map();
		this.roleAssignments = new Map();
		this.permissions = new Map();
		this.initializeDefaultPermissions();
	}
	async getPermissionDefinitions(category) {
		const cacheKey = `permissions:definitions:${category || 'all'}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) return cached;
		let permissions = Array.from(this.permissions.values());
		if (category) {
			permissions = permissions.filter((p) => p.category === category);
		}
		const result = permissions.map((p) => ({
			...p,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}));
		await this.cacheService.set(cacheKey, result, this.PERMISSION_CACHE_TTL);
		return result;
	}
	async validatePermissions(permissionIds) {
		const results = [];
		for (const permissionId of permissionIds) {
			const permission = this.permissions.get(permissionId);
			if (!permission) {
				results.push({
					permissionId,
					isValid: false,
					conflicts: [],
					dependencies: [],
					licenseCompatibility: {
						isCompatible: false,
						requiredLicense: undefined,
						currentLicense: 'community',
					},
				});
				continue;
			}
			const dependencies = permission.dependencies.map((depId) => {
				const depPermission = this.permissions.get(depId);
				return {
					permissionId: depId,
					satisfied: !!depPermission,
					reason: depPermission ? undefined : 'Dependency not found',
				};
			});
			const licenseCompatible =
				!permission.requiresLicense || this.checkLicenseCompatibility(permission.requiresLicense);
			results.push({
				permissionId,
				isValid: true,
				conflicts: [],
				dependencies,
				licenseCompatibility: {
					isCompatible: licenseCompatible,
					requiredLicense: permission.requiresLicense,
					currentLicense: 'community',
				},
			});
		}
		return results;
	}
	async createCustomRole(creatorUser, data) {
		const roleId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const validationResults = await this.validatePermissions(data.permissions);
		const invalidPermissions = validationResults.filter((v) => !v.isValid);
		if (invalidPermissions.length > 0) {
			throw new bad_request_error_1.BadRequestError(
				`Invalid permissions: ${invalidPermissions.map((p) => p.permissionId).join(', ')}`,
			);
		}
		const existingRole = Array.from(this.customRoles.values()).find(
			(r) => r.name.toLowerCase() === data.name.toLowerCase() && r.scope === data.scope,
		);
		if (existingRole) {
			throw new bad_request_error_1.BadRequestError(
				`Role with name "${data.name}" already exists in ${data.scope} scope`,
			);
		}
		const customRole = {
			id: roleId,
			name: data.name,
			description: data.description,
			baseRole: data.baseRole,
			permissions: [...data.permissions],
			scope: data.scope,
			isActive: true,
			createdBy: creatorUser.id,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		this.customRoles.set(roleId, customRole);
		this.eventService.emit('workflow-created', {
			user: creatorUser,
			workflow: {
				id: roleId,
				name: data.name,
				active: false,
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				versionId: '',
				nodes: [],
				connections: {},
			},
			publicApi: false,
			projectId: '',
			projectType: 'Personal',
		});
		await this.invalidateRoleCache();
		return {
			...customRole,
			baseRole: customRole.baseRole,
			createdAt: customRole.createdAt.toISOString(),
			updatedAt: customRole.updatedAt.toISOString(),
		};
	}
	async updateCustomRole(updaterUser, roleId, data) {
		const role = this.customRoles.get(roleId);
		if (!role) {
			throw new not_found_error_1.NotFoundError('Custom role not found');
		}
		if (
			role.createdBy !== updaterUser.id &&
			!['global:owner', 'global:admin'].includes(updaterUser.role)
		) {
			throw new forbidden_error_1.ForbiddenError(
				'Only role creator or administrators can update custom roles',
			);
		}
		if (data.permissions) {
			const validationResults = await this.validatePermissions(data.permissions);
			const invalidPermissions = validationResults.filter((v) => !v.isValid);
			if (invalidPermissions.length > 0) {
				throw new bad_request_error_1.BadRequestError(
					`Invalid permissions: ${invalidPermissions.map((p) => p.permissionId).join(', ')}`,
				);
			}
		}
		const updatedRole = {
			...role,
			name: data.name ?? role.name,
			description: data.description ?? role.description,
			permissions: data.permissions ?? role.permissions,
			isActive: data.isActive ?? role.isActive,
			updatedAt: new Date(),
		};
		this.customRoles.set(roleId, updatedRole);
		this.eventService.emit('user-updated', {
			user: updaterUser,
			fieldsChanged: Object.keys(data),
		});
		await this.invalidateRoleCache();
		return {
			...updatedRole,
			baseRole: updatedRole.baseRole,
			createdAt: updatedRole.createdAt.toISOString(),
			updatedAt: updatedRole.updatedAt.toISOString(),
		};
	}
	async deleteCustomRole(deleterUser, roleId) {
		const role = this.customRoles.get(roleId);
		if (!role) {
			throw new not_found_error_1.NotFoundError('Custom role not found');
		}
		if (
			role.createdBy !== deleterUser.id &&
			!['global:owner', 'global:admin'].includes(deleterUser.role)
		) {
			throw new forbidden_error_1.ForbiddenError(
				'Only role creator or administrators can delete custom roles',
			);
		}
		const activeAssignments = Array.from(this.roleAssignments.values()).filter(
			(a) => a.roleId === roleId && a.isActive,
		);
		if (activeAssignments.length > 0) {
			throw new bad_request_error_1.BadRequestError(
				`Cannot delete role "${role.name}" as it is assigned to ${activeAssignments.length} user(s)`,
			);
		}
		this.customRoles.delete(roleId);
		this.eventService.emit('workflow-deleted', {
			user: deleterUser,
			workflowId: roleId,
			publicApi: false,
		});
		await this.invalidateRoleCache();
	}
	async getEnhancedRoles(query) {
		const cacheKey = `enhanced-roles:${JSON.stringify(query)}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) return cached;
		const systemRoles = await this.getSystemRoles();
		let customRoles = Array.from(this.customRoles.values());
		if (query.scope) {
			customRoles = customRoles.filter((r) => r.scope === query.scope);
		}
		if (query.type === 'custom') {
		} else if (query.type === 'system') {
			customRoles = [];
		}
		if (query.isActive !== undefined) {
			customRoles = customRoles.filter((r) => r.isActive === query.isActive);
		}
		if (query.search) {
			const searchLower = query.search.toLowerCase();
			customRoles = customRoles.filter(
				(r) =>
					r.name.toLowerCase().includes(searchLower) ||
					r.description?.toLowerCase().includes(searchLower),
			);
		}
		const enhancedCustomRoles = customRoles.map((role) => ({
			id: role.id,
			name: role.name,
			displayName: role.name,
			description: role.description,
			type: 'custom',
			scope: role.scope,
			permissions: role.permissions.map((permId) => {
				const perm = this.permissions.get(permId);
				return {
					id: permId,
					resource: perm?.resource || 'unknown',
					action: perm?.action || 'unknown',
					granted: true,
					source: 'direct',
				};
			}),
			inheritsFrom: role.baseRole ? [role.baseRole] : undefined,
			isActive: role.isActive,
			metadata: {
				createdBy: role.createdBy,
				createdAt: role.createdAt.toISOString(),
				updatedAt: role.updatedAt.toISOString(),
			},
		}));
		const allRoles = [...systemRoles, ...enhancedCustomRoles];
		const total = allRoles.length;
		const roles = allRoles.slice(query.offset, query.offset + query.limit);
		const result = { roles, total };
		await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
		return result;
	}
	async assignRole(assignerUser, assignment) {
		const targetUser = await this.userRepository.findOneBy({ id: assignment.userId });
		if (!targetUser) {
			throw new not_found_error_1.NotFoundError('Target user not found');
		}
		const roleExists = await this.validateRoleExists(assignment.roleId);
		if (!roleExists) {
			throw new not_found_error_1.NotFoundError('Role not found');
		}
		await this.validateRoleAssignmentPermissions(assignerUser, assignment);
		const assignmentId = `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const roleAssignment = {
			id: assignmentId,
			userId: assignment.userId,
			roleId: assignment.roleId,
			scope: assignment.scope,
			scopeId: assignment.scopeId,
			assignedBy: assignment.assignedBy,
			assignedAt: new Date(),
			expiresAt: assignment.expiresAt ? new Date(assignment.expiresAt) : undefined,
			isActive: true,
		};
		this.roleAssignments.set(assignmentId, roleAssignment);
		this.eventService.emit('user-updated', {
			user: targetUser,
			fieldsChanged: ['role'],
		});
		await this.invalidateUserPermissionCache(assignment.userId);
		return this.formatRoleAssignment(roleAssignment);
	}
	async checkPermission(request) {
		const cacheKey = `permission-check:${request.userId}:${request.resource}:${request.action}:${JSON.stringify(request.context)}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) return cached;
		await this.getUserRoles(request.userId);
		const userPermissions = await this.getUserPermissions(request.userId, request.context);
		const hasPermission = userPermissions.some(
			(p) => p.resource === request.resource && p.action === request.action && p.granted,
		);
		const result = {
			userId: request.userId,
			resource: request.resource,
			action: request.action,
			granted: hasPermission,
			source: hasPermission ? 'direct' : 'denied',
			context: request.context,
		};
		if (hasPermission) {
			const grantingPermission = userPermissions.find(
				(p) => p.resource === request.resource && p.action === request.action && p.granted,
			);
			result.source = grantingPermission?.source || 'direct';
			result.roleId = grantingPermission?.id;
		}
		await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
		return result;
	}
	async getRoleUsageAnalytics(roleId) {
		const cacheKey = `role-analytics:${roleId}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) return cached;
		const role = this.customRoles.get(roleId) || (await this.getSystemRole(roleId));
		if (!role) {
			throw new not_found_error_1.NotFoundError('Role not found');
		}
		const assignments = Array.from(this.roleAssignments.values()).filter(
			(a) => a.roleId === roleId,
		);
		const activeAssignments = assignments.filter(
			(a) => a.isActive && (!a.expiresAt || a.expiresAt > new Date()),
		);
		const topUsers = await this.getTopUsersForRole(roleId, activeAssignments);
		const analytics = {
			roleId,
			roleName: typeof role === 'object' && 'name' in role ? role.name : roleId,
			assignmentCount: assignments.length,
			activeAssignments: activeAssignments.length,
			permissionUsage: [],
			topUsers,
			trends: {
				assignmentGrowth: 0,
				permissionChanges: 0,
				complianceIssues: 0,
			},
		};
		await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);
		return analytics;
	}
	async bulkAssignRoles(assignerUser, request) {
		const results = {
			success: [],
			errors: [],
			totalProcessed: request.assignments.length,
			successCount: 0,
			errorCount: 0,
		};
		for (const assignment of request.assignments) {
			try {
				const assignmentRequest = {
					...assignment,
					assignedBy: assignerUser.id,
				};
				await this.assignRole(assignerUser, assignmentRequest);
				results.success.push({
					userId: assignment.userId,
					roleId: assignment.roleId,
					message: `Role ${assignment.roleId} assigned successfully`,
				});
				results.successCount++;
			} catch (error) {
				results.errors.push({
					userId: assignment.userId,
					roleId: assignment.roleId,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
				results.errorCount++;
			}
		}
		return results;
	}
	async initializeDefaultPermissions() {
		const defaultPermissions = [
			{
				id: 'workflow:create',
				resource: 'workflow',
				action: 'create',
				description: 'Create new workflows',
				category: 'workflow',
				isDefault: true,
				dependencies: [],
			},
			{
				id: 'workflow:read',
				resource: 'workflow',
				action: 'read',
				description: 'View workflows',
				category: 'workflow',
				isDefault: true,
				dependencies: [],
			},
			{
				id: 'workflow:update',
				resource: 'workflow',
				action: 'update',
				description: 'Edit workflows',
				category: 'workflow',
				isDefault: true,
				dependencies: ['workflow:read'],
			},
			{
				id: 'workflow:delete',
				resource: 'workflow',
				action: 'delete',
				description: 'Delete workflows',
				category: 'workflow',
				isDefault: true,
				dependencies: ['workflow:read'],
			},
			{
				id: 'workflow:execute',
				resource: 'workflow',
				action: 'execute',
				description: 'Execute workflows',
				category: 'workflow',
				isDefault: true,
				dependencies: ['workflow:read'],
			},
		];
		for (const permission of defaultPermissions) {
			this.permissions.set(permission.id, permission);
		}
	}
	async getSystemRoles() {
		return [];
	}
	async getSystemRole(_roleId) {
		return null;
	}
	async validateRoleExists(roleId) {
		return this.customRoles.has(roleId) || (await this.getSystemRole(roleId)) !== null;
	}
	async validateRoleAssignmentPermissions(assignerUser, _assignment) {
		if (!['global:owner', 'global:admin'].includes(assignerUser.role)) {
			throw new forbidden_error_1.ForbiddenError('Insufficient permissions to assign roles');
		}
	}
	async getUserRoles(userId) {
		const assignments = Array.from(this.roleAssignments.values()).filter(
			(a) => a.userId === userId && a.isActive && (!a.expiresAt || a.expiresAt > new Date()),
		);
		return assignments.map((a) => a.roleId);
	}
	async getUserPermissions(userId, _context) {
		const roles = await this.getUserRoles(userId);
		const permissions = [];
		for (const roleId of roles) {
			const role = this.customRoles.get(roleId);
			if (role) {
				for (const permId of role.permissions) {
					const permission = this.permissions.get(permId);
					if (permission) {
						permissions.push({
							id: permId,
							resource: permission.resource,
							action: permission.action,
							granted: true,
							source: 'direct',
						});
					}
				}
			}
		}
		return permissions;
	}
	formatRoleAssignment(assignment) {
		const role = this.customRoles.get(assignment.roleId);
		return {
			id: assignment.id,
			userId: assignment.userId,
			roleId: assignment.roleId,
			roleName: role?.name || assignment.roleId,
			scope: assignment.scope,
			scopeId: assignment.scopeId,
			scopeName: undefined,
			assignedBy: assignment.assignedBy,
			assignedAt: assignment.assignedAt.toISOString(),
			expiresAt: assignment.expiresAt?.toISOString(),
			isActive: assignment.isActive,
		};
	}
	async getTopUsersForRole(_roleId, assignments) {
		const userIds = assignments.slice(0, 5).map((a) => a.userId);
		const users = await this.userRepository.findByIds(userIds);
		return users.map((user) => {
			const assignment = assignments.find((a) => a.userId === user.id);
			return {
				userId: user.id,
				firstName: user.firstName || '',
				lastName: user.lastName || '',
				email: user.email,
				assignedAt: assignment?.assignedAt.toISOString() || '',
			};
		});
	}
	checkLicenseCompatibility(_requiredLicense) {
		return true;
	}
	async invalidateRoleCache() {
		try {
			await this.cacheService.delete('enhanced-roles');
			await this.cacheService.delete('role-analytics');
		} catch (error) {
			this.logger.warn('Failed to invalidate role cache', { error: error.message });
		}
	}
	async invalidateUserPermissionCache(userId) {
		try {
			await this.cacheService.delete(`permission-check:${userId}`);
		} catch (error) {
			this.logger.warn('Failed to invalidate user permission cache', {
				userId,
				error: error.message,
			});
		}
	}
};
exports.EnhancedRoleManagementService = EnhancedRoleManagementService;
exports.EnhancedRoleManagementService = EnhancedRoleManagementService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.UserRepository,
			cache_service_1.CacheService,
			event_service_1.EventService,
		]),
	],
	EnhancedRoleManagementService,
);
//# sourceMappingURL=enhanced-role-management.service.js.map
