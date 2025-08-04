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
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.EnhancedRolesController = void 0;
const api_types_1 = require('@n8n/api-types');
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const enhanced_role_management_service_1 = require('@/services/enhanced-role-management.service');
let EnhancedRolesController = class EnhancedRolesController {
	constructor(logger, enhancedRoleService) {
		this.logger = logger;
		this.enhancedRoleService = enhancedRoleService;
	}
	async getPermissionDefinitions(req, _, category) {
		this.logger.debug('Fetching permission definitions', {
			requesterId: req.user.id,
			category,
		});
		return await this.enhancedRoleService.getPermissionDefinitions(category);
	}
	async validatePermissions(req, _, body) {
		this.logger.debug('Validating permissions', {
			requesterId: req.user.id,
			permissionCount: body.permissionIds.length,
		});
		if (!body.permissionIds || body.permissionIds.length === 0) {
			throw new bad_request_error_1.BadRequestError('Permission IDs are required');
		}
		return await this.enhancedRoleService.validatePermissions(body.permissionIds);
	}
	async getEnhancedRoles(req, _, query) {
		this.logger.debug('Fetching enhanced roles', {
			requesterId: req.user.id,
			query,
		});
		return await this.enhancedRoleService.getEnhancedRoles(query);
	}
	async createCustomRole(req, _, data) {
		this.logger.debug('Creating custom role', {
			requesterId: req.user.id,
			roleName: data.name,
			scope: data.scope,
			permissionCount: data.permissions.length,
		});
		if (!['global:owner', 'global:admin'].includes(req.user.role)) {
			throw new forbidden_error_1.ForbiddenError('Only administrators can create custom roles');
		}
		const customRole = await this.enhancedRoleService.createCustomRole(req.user, data);
		return customRole;
	}
	async updateCustomRole(req, _, roleId, data) {
		this.logger.debug('Updating custom role', {
			requesterId: req.user.id,
			roleId,
			changes: Object.keys(data),
		});
		const updatedRole = await this.enhancedRoleService.updateCustomRole(req.user, roleId, data);
		return updatedRole;
	}
	async deleteCustomRole(req, _, roleId) {
		this.logger.debug('Deleting custom role', {
			requesterId: req.user.id,
			roleId,
		});
		await this.enhancedRoleService.deleteCustomRole(req.user, roleId);
		return { success: true };
	}
	async assignRole(req, _, assignment) {
		this.logger.debug('Assigning role to user', {
			requesterId: req.user.id,
			userId: assignment.userId,
			roleId: assignment.roleId,
			scope: assignment.scope,
		});
		assignment.assignedBy = req.user.id;
		const roleAssignment = await this.enhancedRoleService.assignRole(req.user, assignment);
		return roleAssignment;
	}
	async bulkAssignRoles(req, _, request) {
		this.logger.debug('Bulk assigning roles', {
			requesterId: req.user.id,
			assignmentCount: request.assignments.length,
		});
		const result = await this.enhancedRoleService.bulkAssignRoles(req.user, request);
		return result;
	}
	async checkPermission(req, _, request) {
		if (
			request.userId !== req.user.id &&
			!['global:admin', 'global:owner'].includes(req.user.role)
		) {
			throw new forbidden_error_1.ForbiddenError('Access denied to check other user permissions');
		}
		this.logger.debug('Checking user permission', {
			requesterId: req.user.id,
			userId: request.userId,
			resource: request.resource,
			action: request.action,
		});
		return await this.enhancedRoleService.checkPermission(request);
	}
	async checkPermissionsBatch(req, _, body) {
		this.logger.debug('Batch checking permissions', {
			requesterId: req.user.id,
			requestCount: body.requests.length,
		});
		if (!body.requests || body.requests.length === 0) {
			throw new bad_request_error_1.BadRequestError('Permission check requests are required');
		}
		if (body.requests.length > 100) {
			throw new bad_request_error_1.BadRequestError(
				'Maximum 100 permission checks per batch request',
			);
		}
		for (const request of body.requests) {
			if (
				request.userId !== req.user.id &&
				!['global:admin', 'global:owner'].includes(req.user.role)
			) {
				throw new forbidden_error_1.ForbiddenError(
					`Access denied to check permissions for user ${request.userId}`,
				);
			}
		}
		const results = [];
		for (const request of body.requests) {
			const result = await this.enhancedRoleService.checkPermission(request);
			results.push(result);
		}
		return results;
	}
	async getRoleUsageAnalytics(req, _, roleId) {
		if (!['global:admin', 'global:owner'].includes(req.user.role)) {
			throw new forbidden_error_1.ForbiddenError('Access denied to role analytics');
		}
		this.logger.debug('Fetching role usage analytics', {
			requesterId: req.user.id,
			roleId,
		});
		return await this.enhancedRoleService.getRoleUsageAnalytics(roleId);
	}
	async getRoleSystemOverview(req, _) {
		if (!['global:admin', 'global:owner'].includes(req.user.role)) {
			throw new forbidden_error_1.ForbiddenError('Access denied to role system overview');
		}
		this.logger.debug('Fetching role system overview', {
			requesterId: req.user.id,
		});
		return {
			totalRoles: 0,
			customRoles: 0,
			activeAssignments: 0,
			recentActivity: [],
		};
	}
	async getUserRoles(req, _, userId) {
		if (userId !== req.user.id && !['global:admin', 'global:owner'].includes(req.user.role)) {
			throw new forbidden_error_1.ForbiddenError('Access denied to view other user roles');
		}
		this.logger.debug('Fetching user roles', {
			requesterId: req.user.id,
			userId,
		});
		return {
			userId,
			roles: [],
			effectivePermissions: [],
		};
	}
	async getUserEffectivePermissions(req, _, userId, context) {
		if (userId !== req.user.id && !['global:admin', 'global:owner'].includes(req.user.role)) {
			throw new forbidden_error_1.ForbiddenError('Access denied to view other user permissions');
		}
		this.logger.debug('Fetching user effective permissions', {
			requesterId: req.user.id,
			userId,
			context,
		});
		return {
			userId,
			permissions: [],
			context: context ? JSON.parse(context) : undefined,
		};
	}
	async getRoleTemplates(req, _, category) {
		this.logger.debug('Fetching role templates', {
			requesterId: req.user.id,
			category,
		});
		const templates = [
			{
				id: 'workflow-developer',
				name: 'Workflow Developer',
				description: 'Can create, edit, and execute workflows with full development access',
				category: 'development',
				permissions: ['workflow:create', 'workflow:read', 'workflow:update', 'workflow:execute'],
				recommendedFor: ['developers', 'automation-engineers'],
			},
			{
				id: 'workflow-viewer',
				name: 'Workflow Viewer',
				description: 'Read-only access to workflows and executions',
				category: 'business',
				permissions: ['workflow:read', 'execution:read'],
				recommendedFor: ['stakeholders', 'auditors'],
			},
		];
		return category ? templates.filter((t) => t.category === category) : templates;
	}
};
exports.EnhancedRolesController = EnhancedRolesController;
__decorate(
	[
		(0, decorators_1.Get)('/permissions'),
		(0, decorators_1.GlobalScope)('user:list'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'getPermissionDefinitions',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/permissions/validate'),
		(0, decorators_1.GlobalScope)('user:list'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'validatePermissions',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/'),
		(0, decorators_1.GlobalScope)('user:list'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.EnhancedRoleQueryDto]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'getEnhancedRoles',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/'),
		(0, decorators_1.GlobalScope)('user:create'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.CreateCustomRoleRequestDto]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'createCustomRole',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:roleId'),
		(0, decorators_1.GlobalScope)('user:update'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, (0, decorators_1.Param)('roleId')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			String,
			api_types_1.UpdateCustomRoleRequestDto,
		]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'updateCustomRole',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:roleId'),
		(0, decorators_1.GlobalScope)('user:delete'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, (0, decorators_1.Param)('roleId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'deleteCustomRole',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/assignments'),
		(0, decorators_1.GlobalScope)('user:changeRole'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.RoleAssignmentRequestDto]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'assignRole',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/assignments/bulk'),
		(0, decorators_1.GlobalScope)('user:changeRole'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.BulkRoleAssignmentRequestDto]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'bulkAssignRoles',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/check-permission'),
		(0, decorators_1.GlobalScope)('user:read'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.PermissionCheckRequestDto]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'checkPermission',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/check-permissions/batch'),
		(0, decorators_1.GlobalScope)('user:read'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'checkPermissionsBatch',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:roleId/analytics'),
		(0, decorators_1.GlobalScope)('user:list'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, (0, decorators_1.Param)('roleId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'getRoleUsageAnalytics',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/analytics/overview'),
		(0, decorators_1.GlobalScope)('user:list'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'getRoleSystemOverview',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/users/:userId/roles'),
		(0, decorators_1.GlobalScope)('user:read'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, (0, decorators_1.Param)('userId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'getUserRoles',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/users/:userId/permissions'),
		(0, decorators_1.GlobalScope)('user:read'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, (0, decorators_1.Param)('userId')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, String]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'getUserEffectivePermissions',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/templates'),
		(0, decorators_1.GlobalScope)('user:read'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	EnhancedRolesController.prototype,
	'getRoleTemplates',
	null,
);
exports.EnhancedRolesController = EnhancedRolesController = __decorate(
	[
		(0, decorators_1.RestController)('/roles/enhanced'),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			enhanced_role_management_service_1.EnhancedRoleManagementService,
		]),
	],
	EnhancedRolesController,
);
//# sourceMappingURL=enhanced-roles.controller.js.map
