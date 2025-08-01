import {
	PermissionDefinitionDto,
	CustomRoleDefinitionDto,
	RoleAssignmentRequestDto,
	EnhancedRoleDto,
	UserRoleAssignmentDto,
	CreateCustomRoleRequestDto,
	UpdateCustomRoleRequestDto,
	BulkRoleAssignmentRequestDto,
	PermissionCheckRequestDto,
	PermissionCheckResponseDto,
	EnhancedRoleQueryDto,
	RoleUsageAnalyticsDto,
	BulkRoleOperationResponseDto,
	PermissionValidationDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	RestController,
	Get,
	Post,
	Patch,
	Delete,
	Body,
	Param,
	Query,
	GlobalScope,
	Licensed,
} from '@n8n/decorators';
import { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
// Future import for event handling
// import { EventService } from '@/events/event.service';
import { EnhancedRoleManagementService } from '@/services/enhanced-role-management.service';

@RestController('/roles/enhanced')
export class EnhancedRolesController {
	constructor(
		private readonly logger: Logger,
		private readonly enhancedRoleService: EnhancedRoleManagementService,
		// Future use for event handling
		// private readonly eventService: EventService,
	) {}

	// Permission Management Endpoints

	@Get('/permissions')
	@GlobalScope('user:list')
	@Licensed('feat:advancedPermissions')
	async getPermissionDefinitions(
		req: AuthenticatedRequest,
		_: Response,
		@Query category?: string,
	): Promise<PermissionDefinitionDto[]> {
		this.logger.debug('Fetching permission definitions', {
			requesterId: req.user.id,
			category,
		});

		return await this.enhancedRoleService.getPermissionDefinitions(category);
	}

	@Post('/permissions/validate')
	@GlobalScope('user:list')
	@Licensed('feat:advancedPermissions')
	async validatePermissions(
		req: AuthenticatedRequest,
		_: Response,
		@Body body: { permissionIds: string[] },
	): Promise<PermissionValidationDto[]> {
		this.logger.debug('Validating permissions', {
			requesterId: req.user.id,
			permissionCount: body.permissionIds.length,
		});

		if (!body.permissionIds || body.permissionIds.length === 0) {
			throw new BadRequestError('Permission IDs are required');
		}

		return await this.enhancedRoleService.validatePermissions(body.permissionIds);
	}

	// Custom Role Management Endpoints

	@Get('/')
	@GlobalScope('user:list')
	@Licensed('feat:advancedPermissions')
	async getEnhancedRoles(
		req: AuthenticatedRequest,
		_: Response,
		@Query query: EnhancedRoleQueryDto,
	): Promise<{ roles: EnhancedRoleDto[]; total: number }> {
		this.logger.debug('Fetching enhanced roles', {
			requesterId: req.user.id,
			query,
		});

		return await this.enhancedRoleService.getEnhancedRoles(query);
	}

	@Post('/')
	@GlobalScope('user:create')
	@Licensed('feat:advancedPermissions')
	async createCustomRole(
		req: AuthenticatedRequest,
		_: Response,
		@Body data: CreateCustomRoleRequestDto,
	): Promise<CustomRoleDefinitionDto> {
		this.logger.debug('Creating custom role', {
			requesterId: req.user.id,
			roleName: data.name,
			scope: data.scope,
			permissionCount: data.permissions.length,
		});

		// Validate role creation permissions
		if (!['global:owner', 'global:admin'].includes(req.user.role)) {
			throw new ForbiddenError('Only administrators can create custom roles');
		}

		const customRole = await this.enhancedRoleService.createCustomRole(req.user, data);

		// TODO: Add 'custom-role-management' event to EventService type map
		// this.eventService.emit('custom-role-management', {
		//	userId: req.user.id,
		//	action: 'create',
		//	roleId: customRole.id,
		//	roleName: customRole.name,
		//	publicApi: false,
		// });

		return customRole;
	}

	@Patch('/:roleId')
	@GlobalScope('user:update')
	@Licensed('feat:advancedPermissions')
	async updateCustomRole(
		req: AuthenticatedRequest,
		_: Response,
		@Param('roleId') roleId: string,
		@Body data: UpdateCustomRoleRequestDto,
	): Promise<CustomRoleDefinitionDto> {
		this.logger.debug('Updating custom role', {
			requesterId: req.user.id,
			roleId,
			changes: Object.keys(data),
		});

		const updatedRole = await this.enhancedRoleService.updateCustomRole(req.user, roleId, data);

		// TODO: Add 'custom-role-management' event to EventService type map
		// this.eventService.emit('custom-role-management', {
		//	userId: req.user.id,
		//	action: 'update',
		//	roleId,
		//	roleName: updatedRole.name,
		//	changes: Object.keys(data),
		//	publicApi: false,
		// });

		return updatedRole;
	}

	@Delete('/:roleId')
	@GlobalScope('user:delete')
	@Licensed('feat:advancedPermissions')
	async deleteCustomRole(
		req: AuthenticatedRequest,
		_: Response,
		@Param('roleId') roleId: string,
	): Promise<{ success: boolean }> {
		this.logger.debug('Deleting custom role', {
			requesterId: req.user.id,
			roleId,
		});

		await this.enhancedRoleService.deleteCustomRole(req.user, roleId);

		// TODO: Add 'custom-role-management' event to EventService type map
		// this.eventService.emit('custom-role-management', {
		//	userId: req.user.id,
		//	action: 'delete',
		//	roleId,
		//	publicApi: false,
		// });

		return { success: true };
	}

	// Role Assignment Endpoints

	@Post('/assignments')
	@GlobalScope('user:changeRole')
	@Licensed('feat:advancedPermissions')
	async assignRole(
		req: AuthenticatedRequest,
		_: Response,
		@Body assignment: RoleAssignmentRequestDto,
	): Promise<UserRoleAssignmentDto> {
		this.logger.debug('Assigning role to user', {
			requesterId: req.user.id,
			userId: assignment.userId,
			roleId: assignment.roleId,
			scope: assignment.scope,
		});

		// Ensure the assigner is tracked
		assignment.assignedBy = req.user.id;

		const roleAssignment = await this.enhancedRoleService.assignRole(req.user, assignment);

		// TODO: Add 'enhanced-role-assigned' event to EventService type map
		// this.eventService.emit('enhanced-role-assigned', {
		//	assignerId: req.user.id,
		//	userId: assignment.userId,
		//	roleId: assignment.roleId,
		//	scope: assignment.scope,
		//	scopeId: assignment.scopeId,
		//	expiresAt: assignment.expiresAt,
		//	publicApi: false,
		// });

		return roleAssignment;
	}

	@Post('/assignments/bulk')
	@GlobalScope('user:changeRole')
	@Licensed('feat:advancedPermissions')
	async bulkAssignRoles(
		req: AuthenticatedRequest,
		_: Response,
		@Body request: BulkRoleAssignmentRequestDto,
	): Promise<BulkRoleOperationResponseDto> {
		this.logger.debug('Bulk assigning roles', {
			requesterId: req.user.id,
			assignmentCount: request.assignments.length,
		});

		const result = await this.enhancedRoleService.bulkAssignRoles(req.user, request);

		// TODO: Add 'enhanced-roles-bulk-assigned' event to EventService type map
		// this.eventService.emit('enhanced-roles-bulk-assigned', {
		//	assignerId: req.user.id,
		//	totalAssignments: request.assignments.length,
		//	successCount: result.successCount,
		//	errorCount: result.errorCount,
		//	publicApi: false,
		// });

		return result;
	}

	// Permission Checking Endpoints

	@Post('/check-permission')
	@GlobalScope('user:read')
	@Licensed('feat:advancedPermissions')
	async checkPermission(
		req: AuthenticatedRequest,
		_: Response,
		@Body request: PermissionCheckRequestDto,
	): Promise<PermissionCheckResponseDto> {
		// Users can only check their own permissions unless they're admin/owner
		if (
			request.userId !== req.user.id &&
			!['global:admin', 'global:owner'].includes(req.user.role)
		) {
			throw new ForbiddenError('Access denied to check other user permissions');
		}

		this.logger.debug('Checking user permission', {
			requesterId: req.user.id,
			userId: request.userId,
			resource: request.resource,
			action: request.action,
		});

		return await this.enhancedRoleService.checkPermission(request);
	}

	@Post('/check-permissions/batch')
	@GlobalScope('user:read')
	@Licensed('feat:advancedPermissions')
	async checkPermissionsBatch(
		req: AuthenticatedRequest,
		_: Response,
		@Body body: { requests: PermissionCheckRequestDto[] },
	): Promise<PermissionCheckResponseDto[]> {
		this.logger.debug('Batch checking permissions', {
			requesterId: req.user.id,
			requestCount: body.requests.length,
		});

		if (!body.requests || body.requests.length === 0) {
			throw new BadRequestError('Permission check requests are required');
		}

		if (body.requests.length > 100) {
			throw new BadRequestError('Maximum 100 permission checks per batch request');
		}

		// Validate access to check each user's permissions
		for (const request of body.requests) {
			if (
				request.userId !== req.user.id &&
				!['global:admin', 'global:owner'].includes(req.user.role)
			) {
				throw new ForbiddenError(`Access denied to check permissions for user ${request.userId}`);
			}
		}

		const results: PermissionCheckResponseDto[] = [];
		for (const request of body.requests) {
			const result = await this.enhancedRoleService.checkPermission(request);
			results.push(result);
		}

		return results;
	}

	// Role Analytics Endpoints

	@Get('/:roleId/analytics')
	@GlobalScope('user:list')
	@Licensed('feat:advancedPermissions')
	async getRoleUsageAnalytics(
		req: AuthenticatedRequest,
		_: Response,
		@Param('roleId') roleId: string,
	): Promise<RoleUsageAnalyticsDto> {
		// Only admin/owner can access role analytics
		if (!['global:admin', 'global:owner'].includes(req.user.role)) {
			throw new ForbiddenError('Access denied to role analytics');
		}

		this.logger.debug('Fetching role usage analytics', {
			requesterId: req.user.id,
			roleId,
		});

		return await this.enhancedRoleService.getRoleUsageAnalytics(roleId);
	}

	@Get('/analytics/overview')
	@GlobalScope('user:list')
	@Licensed('feat:advancedPermissions')
	async getRoleSystemOverview(
		req: AuthenticatedRequest,
		_: Response,
	): Promise<{
		totalRoles: number;
		customRoles: number;
		activeAssignments: number;
		recentActivity: any[];
	}> {
		// Only admin/owner can access system overview
		if (!['global:admin', 'global:owner'].includes(req.user.role)) {
			throw new ForbiddenError('Access denied to role system overview');
		}

		this.logger.debug('Fetching role system overview', {
			requesterId: req.user.id,
		});

		// This would aggregate data from the enhanced role service
		return {
			totalRoles: 0, // Placeholder
			customRoles: 0,
			activeAssignments: 0,
			recentActivity: [],
		};
	}

	// User Role Information Endpoints

	@Get('/users/:userId/roles')
	@GlobalScope('user:read')
	@Licensed('feat:advancedPermissions')
	async getUserRoles(
		req: AuthenticatedRequest,
		_: Response,
		@Param('userId') userId: string,
	): Promise<{
		userId: string;
		roles: UserRoleAssignmentDto[];
		effectivePermissions: string[];
	}> {
		// Users can only view their own roles unless they're admin/owner
		if (userId !== req.user.id && !['global:admin', 'global:owner'].includes(req.user.role)) {
			throw new ForbiddenError('Access denied to view other user roles');
		}

		this.logger.debug('Fetching user roles', {
			requesterId: req.user.id,
			userId,
		});

		// This would be implemented in the service
		return {
			userId,
			roles: [], // Placeholder
			effectivePermissions: [],
		};
	}

	@Get('/users/:userId/permissions')
	@GlobalScope('user:read')
	@Licensed('feat:advancedPermissions')
	async getUserEffectivePermissions(
		req: AuthenticatedRequest,
		_: Response,
		@Param('userId') userId: string,
		@Query context?: string,
	): Promise<{
		userId: string;
		permissions: Array<{
			resource: string;
			action: string;
			granted: boolean;
			source: string;
			roleId?: string;
		}>;
		context?: Record<string, unknown>;
	}> {
		// Users can only view their own permissions unless they're admin/owner
		if (userId !== req.user.id && !['global:admin', 'global:owner'].includes(req.user.role)) {
			throw new ForbiddenError('Access denied to view other user permissions');
		}

		this.logger.debug('Fetching user effective permissions', {
			requesterId: req.user.id,
			userId,
			context,
		});

		// This would be implemented in the service
		return {
			userId,
			permissions: [], // Placeholder
			context: context ? JSON.parse(context) : undefined,
		};
	}

	// Role Templates and Suggestions

	@Get('/templates')
	@GlobalScope('user:read')
	@Licensed('feat:advancedPermissions')
	async getRoleTemplates(
		req: AuthenticatedRequest,
		_: Response,
		@Query category?: string,
	): Promise<
		Array<{
			id: string;
			name: string;
			description: string;
			category: string;
			permissions: string[];
			recommendedFor: string[];
		}>
	> {
		this.logger.debug('Fetching role templates', {
			requesterId: req.user.id,
			category,
		});

		// Return predefined role templates based on common use cases
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
			// More templates would be defined here
		];

		return category ? templates.filter((t) => t.category === category) : templates;
	}
}
