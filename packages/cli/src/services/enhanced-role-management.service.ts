import type {
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
	RoleHierarchyDto,
	RoleHierarchyRequestDto,
	EnhancedRoleQueryDto,
	RoleUsageAnalyticsDto,
	PermissionAuditDto,
	BulkRoleOperationResponseDto,
	PermissionValidationDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { UserRepository, ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { CacheService } from '@/services/cache/cache.service';
import { EventService } from '@/events/event.service';
import { RoleService } from '@/services/role.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

interface CustomRole {
	id: string;
	name: string;
	description?: string;
	baseRole?: string;
	permissions: string[];
	scope: 'global' | 'project' | 'resource';
	isActive: boolean;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
}

interface RoleAssignment {
	id: string;
	userId: string;
	roleId: string;
	scope: 'global' | 'project' | 'resource';
	scopeId?: string;
	assignedBy: string;
	assignedAt: Date;
	expiresAt?: Date;
	isActive: boolean;
}

interface PermissionDefinition {
	id: string;
	resource: string;
	action: string;
	description: string;
	category: 'core' | 'workflow' | 'credential' | 'user' | 'project' | 'system' | 'integration';
	isDefault: boolean;
	requiresLicense?: string;
	dependencies: string[];
	metadata?: Record<string, unknown>;
}

@Service()
export class EnhancedRoleManagementService {
	private readonly CACHE_TTL = 300; // 5 minutes
	private readonly PERMISSION_CACHE_TTL = 3600; // 1 hour

	// In-memory storage for demonstration - in production, these would be database entities
	private customRoles: Map<string, CustomRole> = new Map();
	private roleAssignments: Map<string, RoleAssignment> = new Map();
	private permissions: Map<string, PermissionDefinition> = new Map();
	private roleHierarchy: Map<string, RoleHierarchyDto[]> = new Map();

	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly cacheService: CacheService,
		private readonly eventService: EventService,
		private readonly roleService: RoleService,
	) {
		this.initializeDefaultPermissions();
	}

	// Permission Management
	async getPermissionDefinitions(category?: string): Promise<PermissionDefinitionDto[]> {
		const cacheKey = `permissions:definitions:${category || 'all'}`;
		const cached = await this.cacheService.get<PermissionDefinitionDto[]>(cacheKey);
		if (cached) return cached;

		let permissions = Array.from(this.permissions.values());

		if (category) {
			permissions = permissions.filter((p) => p.category === category);
		}

		const result = permissions.map(
			(p) =>
				({
					...p,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				}) as PermissionDefinitionDto,
		);

		await this.cacheService.set(cacheKey, result, this.PERMISSION_CACHE_TTL);
		return result;
	}

	async validatePermissions(permissionIds: string[]): Promise<PermissionValidationDto[]> {
		const results: PermissionValidationDto[] = [];

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

			// Check dependencies
			const dependencies = permission.dependencies.map((depId) => {
				const depPermission = this.permissions.get(depId);
				return {
					permissionId: depId,
					satisfied: !!depPermission,
					reason: depPermission ? undefined : 'Dependency not found',
				};
			});

			// Check license compatibility
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
					currentLicense: 'community', // This would come from license service
				},
			});
		}

		return results;
	}

	// Custom Role Management
	async createCustomRole(
		creatorUser: User,
		data: CreateCustomRoleRequestDto,
	): Promise<CustomRoleDefinitionDto> {
		const roleId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Validate permissions
		const validationResults = await this.validatePermissions(data.permissions);
		const invalidPermissions = validationResults.filter((v) => !v.isValid);
		if (invalidPermissions.length > 0) {
			throw new BadRequestError(
				`Invalid permissions: ${invalidPermissions.map((p) => p.permissionId).join(', ')}`,
			);
		}

		// Check for name conflicts
		const existingRole = Array.from(this.customRoles.values()).find(
			(r) => r.name.toLowerCase() === data.name.toLowerCase() && r.scope === data.scope,
		);
		if (existingRole) {
			throw new BadRequestError(
				`Role with name "${data.name}" already exists in ${data.scope} scope`,
			);
		}

		const customRole: CustomRole = {
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

		// Emit event for audit trail
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

		// Invalidate cache
		await this.invalidateRoleCache();

		return {
			...customRole,
			baseRole: customRole.baseRole as
				| 'project:editor'
				| 'project:viewer'
				| 'global:member'
				| undefined,
			createdAt: customRole.createdAt.toISOString(),
			updatedAt: customRole.updatedAt.toISOString(),
		};
	}

	async updateCustomRole(
		updaterUser: User,
		roleId: string,
		data: UpdateCustomRoleRequestDto,
	): Promise<CustomRoleDefinitionDto> {
		const role = this.customRoles.get(roleId);
		if (!role) {
			throw new NotFoundError('Custom role not found');
		}

		// Check permissions to update
		if (
			role.createdBy !== updaterUser.id &&
			!['global:owner', 'global:admin'].includes(updaterUser.role)
		) {
			throw new ForbiddenError('Only role creator or administrators can update custom roles');
		}

		// Validate new permissions if provided
		if (data.permissions) {
			const validationResults = await this.validatePermissions(data.permissions);
			const invalidPermissions = validationResults.filter((v) => !v.isValid);
			if (invalidPermissions.length > 0) {
				throw new BadRequestError(
					`Invalid permissions: ${invalidPermissions.map((p) => p.permissionId).join(', ')}`,
				);
			}
		}

		// Update role
		const updatedRole: CustomRole = {
			...role,
			name: data.name ?? role.name,
			description: data.description ?? role.description,
			permissions: data.permissions ?? role.permissions,
			isActive: data.isActive ?? role.isActive,
			updatedAt: new Date(),
		};

		this.customRoles.set(roleId, updatedRole);

		// Emit event for audit trail
		this.eventService.emit('user-updated', {
			user: updaterUser,
			fieldsChanged: Object.keys(data),
		});

		// Invalidate cache
		await this.invalidateRoleCache();

		return {
			...updatedRole,
			baseRole: updatedRole.baseRole as
				| 'project:editor'
				| 'project:viewer'
				| 'global:member'
				| undefined,
			createdAt: updatedRole.createdAt.toISOString(),
			updatedAt: updatedRole.updatedAt.toISOString(),
		};
	}

	async deleteCustomRole(deleterUser: User, roleId: string): Promise<void> {
		const role = this.customRoles.get(roleId);
		if (!role) {
			throw new NotFoundError('Custom role not found');
		}

		// Check permissions to delete
		if (
			role.createdBy !== deleterUser.id &&
			!['global:owner', 'global:admin'].includes(deleterUser.role)
		) {
			throw new ForbiddenError('Only role creator or administrators can delete custom roles');
		}

		// Check if role is in use
		const activeAssignments = Array.from(this.roleAssignments.values()).filter(
			(a) => a.roleId === roleId && a.isActive,
		);

		if (activeAssignments.length > 0) {
			throw new BadRequestError(
				`Cannot delete role "${role.name}" as it is assigned to ${activeAssignments.length} user(s)`,
			);
		}

		this.customRoles.delete(roleId);

		// Emit event for audit trail
		this.eventService.emit('workflow-deleted', {
			user: deleterUser,
			workflowId: roleId,
			publicApi: false,
		});

		// Invalidate cache
		await this.invalidateRoleCache();
	}

	async getEnhancedRoles(
		query: EnhancedRoleQueryDto,
	): Promise<{ roles: EnhancedRoleDto[]; total: number }> {
		const cacheKey = `enhanced-roles:${JSON.stringify(query)}`;
		const cached = await this.cacheService.get<{ roles: EnhancedRoleDto[]; total: number }>(
			cacheKey,
		);
		if (cached) return cached;

		// Get system roles (from existing role service)
		const systemRoles = await this.getSystemRoles();

		// Get custom roles
		let customRoles = Array.from(this.customRoles.values());

		// Apply filters
		if (query.scope) {
			customRoles = customRoles.filter((r) => r.scope === query.scope);
		}
		if (query.type === 'custom') {
			// Only custom roles
		} else if (query.type === 'system') {
			customRoles = []; // Only system roles
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

		// Convert to enhanced role format
		const enhancedCustomRoles: EnhancedRoleDto[] = customRoles.map((role) => ({
			id: role.id,
			name: role.name,
			displayName: role.name,
			description: role.description,
			type: 'custom' as const,
			scope: role.scope,
			permissions: role.permissions.map((permId) => {
				const perm = this.permissions.get(permId);
				return {
					id: permId,
					resource: perm?.resource || 'unknown',
					action: perm?.action || 'unknown',
					granted: true,
					source: 'direct' as const,
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

		// Combine system and custom roles
		const allRoles = [...systemRoles, ...enhancedCustomRoles];

		// Apply pagination
		const total = allRoles.length;
		const roles = allRoles.slice(query.offset, query.offset + query.limit);

		const result = { roles, total };
		await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
		return result;
	}

	// Role Assignment Management
	async assignRole(
		assignerUser: User,
		assignment: RoleAssignmentRequestDto,
	): Promise<UserRoleAssignmentDto> {
		// Validate user exists
		const targetUser = await this.userRepository.findOneBy({ id: assignment.userId });
		if (!targetUser) {
			throw new NotFoundError('Target user not found');
		}

		// Validate role exists (system or custom)
		const roleExists = await this.validateRoleExists(assignment.roleId);
		if (!roleExists) {
			throw new NotFoundError('Role not found');
		}

		// Check permissions to assign role
		await this.validateRoleAssignmentPermissions(assignerUser, assignment);

		// Create assignment
		const assignmentId = `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const roleAssignment: RoleAssignment = {
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

		// Emit event for audit trail
		this.eventService.emit('user-updated', {
			user: targetUser,
			fieldsChanged: ['role'],
		});

		// Invalidate user permission cache
		await this.invalidateUserPermissionCache(assignment.userId);

		return this.formatRoleAssignment(roleAssignment);
	}

	async checkPermission(request: PermissionCheckRequestDto): Promise<PermissionCheckResponseDto> {
		const cacheKey = `permission-check:${request.userId}:${request.resource}:${request.action}:${JSON.stringify(request.context)}`;
		const cached = await this.cacheService.get<PermissionCheckResponseDto>(cacheKey);
		if (cached) return cached;

		// Get user's roles and permissions
		const userRoles = await this.getUserRoles(request.userId);
		const userPermissions = await this.getUserPermissions(request.userId, request.context);

		// Check if permission is granted
		const permissionKey = `${request.resource}:${request.action}`;
		const hasPermission = userPermissions.some(
			(p) => p.resource === request.resource && p.action === request.action && p.granted,
		);

		const result: PermissionCheckResponseDto = {
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

	// Role Analytics
	async getRoleUsageAnalytics(roleId: string): Promise<RoleUsageAnalyticsDto> {
		const cacheKey = `role-analytics:${roleId}`;
		const cached = await this.cacheService.get<RoleUsageAnalyticsDto>(cacheKey);
		if (cached) return cached;

		// Get role information
		const role = this.customRoles.get(roleId) || (await this.getSystemRole(roleId));
		if (!role) {
			throw new NotFoundError('Role not found');
		}

		// Get assignments for this role
		const assignments = Array.from(this.roleAssignments.values()).filter(
			(a) => a.roleId === roleId,
		);

		const activeAssignments = assignments.filter(
			(a) => a.isActive && (!a.expiresAt || a.expiresAt > new Date()),
		);

		// Get top users
		const topUsers = await this.getTopUsersForRole(roleId, activeAssignments);

		const analytics: RoleUsageAnalyticsDto = {
			roleId,
			roleName: typeof role === 'object' && 'name' in role ? role.name : roleId,
			assignmentCount: assignments.length,
			activeAssignments: activeAssignments.length,
			permissionUsage: [], // Mock data - would track actual permission usage
			topUsers,
			trends: {
				assignmentGrowth: 0, // Mock data
				permissionChanges: 0,
				complianceIssues: 0,
			},
		};

		await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);
		return analytics;
	}

	// Bulk Operations
	async bulkAssignRoles(
		assignerUser: User,
		request: BulkRoleAssignmentRequestDto,
	): Promise<BulkRoleOperationResponseDto> {
		const results: BulkRoleOperationResponseDto = {
			success: [],
			errors: [],
			totalProcessed: request.assignments.length,
			successCount: 0,
			errorCount: 0,
		};

		for (const assignment of request.assignments) {
			try {
				const assignmentRequest: RoleAssignmentRequestDto = {
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

	// Private Helper Methods
	private async initializeDefaultPermissions(): Promise<void> {
		// Initialize default permissions based on existing n8n scope system
		const defaultPermissions: PermissionDefinition[] = [
			// Workflow permissions
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
			// ... more permissions would be defined here
		];

		for (const permission of defaultPermissions) {
			this.permissions.set(permission.id, permission);
		}
	}

	private async getSystemRoles(): Promise<EnhancedRoleDto[]> {
		// Convert existing system roles to enhanced role format
		// This would integrate with the existing role service
		return []; // Placeholder
	}

	private async getSystemRole(roleId: string): Promise<any> {
		// Get system role by ID
		return null; // Placeholder
	}

	private async validateRoleExists(roleId: string): Promise<boolean> {
		return this.customRoles.has(roleId) || (await this.getSystemRole(roleId)) !== null;
	}

	private async validateRoleAssignmentPermissions(
		assignerUser: User,
		assignment: RoleAssignmentRequestDto,
	): Promise<void> {
		// Validate assigner has permission to assign this role
		if (!['global:owner', 'global:admin'].includes(assignerUser.role)) {
			throw new ForbiddenError('Insufficient permissions to assign roles');
		}
	}

	private async getUserRoles(userId: string): Promise<string[]> {
		const assignments = Array.from(this.roleAssignments.values()).filter(
			(a) => a.userId === userId && a.isActive && (!a.expiresAt || a.expiresAt > new Date()),
		);

		return assignments.map((a) => a.roleId);
	}

	private async getUserPermissions(userId: string, context?: any): Promise<any[]> {
		// Get user's effective permissions from all assigned roles
		const roles = await this.getUserRoles(userId);
		const permissions: any[] = [];

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

	private formatRoleAssignment(assignment: RoleAssignment): UserRoleAssignmentDto {
		const role = this.customRoles.get(assignment.roleId);
		return {
			id: assignment.id,
			userId: assignment.userId,
			roleId: assignment.roleId,
			roleName: role?.name || assignment.roleId,
			scope: assignment.scope,
			scopeId: assignment.scopeId,
			scopeName: undefined, // Would be populated with actual scope name
			assignedBy: assignment.assignedBy,
			assignedAt: assignment.assignedAt.toISOString(),
			expiresAt: assignment.expiresAt?.toISOString(),
			isActive: assignment.isActive,
		};
	}

	private async getTopUsersForRole(roleId: string, assignments: RoleAssignment[]): Promise<any[]> {
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

	private checkLicenseCompatibility(requiredLicense: string): boolean {
		// Check if current license supports the required license level
		// This would integrate with the actual license service
		return true; // Placeholder
	}

	private async invalidateRoleCache(): Promise<void> {
		// Note: deleteByPattern method may not be available in current CacheService
		// Using delete with specific keys as fallback
		try {
			// Attempt to clear cache - method signature may vary by implementation
			await this.cacheService.delete('enhanced-roles');
			await this.cacheService.delete('role-analytics');
		} catch (error) {
			this.logger.warn('Failed to invalidate role cache', { error: error.message });
		}
	}

	private async invalidateUserPermissionCache(userId: string): Promise<void> {
		try {
			// Attempt to clear user permission cache
			await this.cacheService.delete(`permission-check:${userId}`);
		} catch (error) {
			this.logger.warn('Failed to invalidate user permission cache', {
				userId,
				error: error.message,
			});
		}
	}
}
