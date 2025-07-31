import { z } from 'zod';
import { Z } from 'zod-class';

// Enhanced Permission System DTOs

// Permission Definition Schema
export class PermissionDefinitionDto extends Z.class({
	id: z.string().uuid(),
	resource: z.string(),
	action: z.string(),
	description: z.string(),
	category: z.enum(['core', 'workflow', 'credential', 'user', 'project', 'system', 'integration']),
	isDefault: z.boolean().default(false),
	requiresLicense: z.string().optional(),
	dependencies: z.array(z.string()).default([]),
	metadata: z.record(z.unknown()).optional(),
}) {}

// Custom Role Definition
export class CustomRoleDefinitionDto extends Z.class({
	id: z.string().uuid(),
	name: z.string().min(1).max(50),
	description: z.string().max(200).optional(),
	baseRole: z.enum(['global:member', 'project:viewer', 'project:editor']).optional(),
	permissions: z.array(z.string()), // Permission IDs
	scope: z.enum(['global', 'project', 'resource']),
	isActive: z.boolean().default(true),
	createdBy: z.string().uuid(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
}) {}

// Role Assignment Request
export class RoleAssignmentRequestDto extends Z.class({
	userId: z.string().uuid(),
	roleId: z.string(),
	scope: z.enum(['global', 'project', 'resource']),
	scopeId: z.string().uuid().optional(), // Project ID or resource ID
	expiresAt: z.string().datetime().optional(),
	assignedBy: z.string().uuid(),
}) {}

// Enhanced Role with Permissions
export class EnhancedRoleDto extends Z.class({
	id: z.string(),
	name: z.string(),
	displayName: z.string(),
	description: z.string().optional(),
	type: z.enum(['system', 'custom']),
	scope: z.enum(['global', 'project', 'resource']),
	permissions: z.array(
		z.object({
			id: z.string(),
			resource: z.string(),
			action: z.string(),
			granted: z.boolean(),
			source: z.enum(['direct', 'inherited', 'license']),
		}),
	),
	inheritsFrom: z.array(z.string()).optional(),
	isActive: z.boolean(),
	metadata: z.record(z.unknown()).optional(),
}) {}

// User Role Assignment
export class UserRoleAssignmentDto extends Z.class({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	roleId: z.string(),
	roleName: z.string(),
	scope: z.enum(['global', 'project', 'resource']),
	scopeId: z.string().uuid().optional(),
	scopeName: z.string().optional(),
	assignedBy: z.string().uuid(),
	assignedAt: z.string().datetime(),
	expiresAt: z.string().datetime().optional(),
	isActive: z.boolean(),
}) {}

// Role Management Requests
export class CreateCustomRoleRequestDto extends Z.class({
	name: z.string().min(1).max(50),
	description: z.string().max(200).optional(),
	baseRole: z.string().optional(),
	permissions: z.array(z.string()).min(1),
	scope: z.enum(['global', 'project', 'resource']),
}) {}

export class UpdateCustomRoleRequestDto extends Z.class({
	name: z.string().min(1).max(50).optional(),
	description: z.string().max(200).optional(),
	permissions: z.array(z.string()).optional(),
	isActive: z.boolean().optional(),
}) {}

export class BulkRoleAssignmentRequestDto extends Z.class({
	assignments: z
		.array(
			z.object({
				userId: z.string().uuid(),
				roleId: z.string(),
				scope: z.enum(['global', 'project', 'resource']),
				scopeId: z.string().uuid().optional(),
				expiresAt: z.string().datetime().optional(),
			}),
		)
		.min(1)
		.max(100),
}) {}

// Permission Check Request/Response
export class PermissionCheckRequestDto extends Z.class({
	userId: z.string().uuid(),
	resource: z.string(),
	action: z.string(),
	context: z
		.object({
			projectId: z.string().uuid().optional(),
			resourceId: z.string().uuid().optional(),
			metadata: z.record(z.unknown()).optional(),
		})
		.optional(),
}) {}

export class PermissionCheckResponseDto extends Z.class({
	userId: z.string().uuid(),
	resource: z.string(),
	action: z.string(),
	granted: z.boolean(),
	source: z.enum(['direct', 'inherited', 'license', 'denied']),
	roleId: z.string().optional(),
	reason: z.string().optional(),
	context: z.record(z.unknown()).optional(),
}) {}

// Role Hierarchy Management
export class RoleHierarchyDto extends Z.class({
	parentRoleId: z.string(),
	childRoleId: z.string(),
	inheritanceType: z.enum(['full', 'partial', 'additive']),
	restrictions: z.array(z.string()).default([]), // Restricted permissions
	createdAt: z.string().datetime(),
}) {}

export class RoleHierarchyRequestDto extends Z.class({
	parentRoleId: z.string(),
	childRoleId: z.string(),
	inheritanceType: z.enum(['full', 'partial', 'additive']).default('full'),
	restrictions: z.array(z.string()).default([]),
}) {}

// Enhanced Role Query Parameters
export class EnhancedRoleQueryDto extends Z.class({
	scope: z.enum(['global', 'project', 'resource']).optional(),
	type: z.enum(['system', 'custom']).optional(),
	isActive: z.boolean().optional(),
	search: z.string().optional(),
	category: z
		.enum(['core', 'workflow', 'credential', 'user', 'project', 'system', 'integration'])
		.optional(),
	hasPermission: z.string().optional(),
	createdBy: z.string().uuid().optional(),
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
}) {}

// Role Analytics and Usage
export class RoleUsageAnalyticsDto extends Z.class({
	roleId: z.string(),
	roleName: z.string(),
	assignmentCount: z.number(),
	activeAssignments: z.number(),
	permissionUsage: z.array(
		z.object({
			permission: z.string(),
			usageCount: z.number(),
			lastUsed: z.string().datetime().optional(),
		}),
	),
	topUsers: z.array(
		z.object({
			userId: z.string().uuid(),
			firstName: z.string(),
			lastName: z.string(),
			email: z.string(),
			assignedAt: z.string().datetime(),
		}),
	),
	trends: z.object({
		assignmentGrowth: z.number(),
		permissionChanges: z.number(),
		complianceIssues: z.number(),
	}),
}) {}

// Permission Audit Trail
export class PermissionAuditDto extends Z.class({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	actorId: z.string().uuid(),
	action: z.enum(['granted', 'revoked', 'modified', 'inherited', 'expired']),
	resource: z.string(),
	permission: z.string(),
	roleId: z.string().optional(),
	context: z
		.object({
			projectId: z.string().uuid().optional(),
			reason: z.string().optional(),
			metadata: z.record(z.unknown()).optional(),
		})
		.optional(),
	timestamp: z.string().datetime(),
	expiresAt: z.string().datetime().optional(),
}) {}

// Template Role Definitions for Common Use Cases
export class RoleTemplateDto extends Z.class({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	category: z.enum(['development', 'operations', 'business', 'security', 'compliance']),
	recommendedFor: z.array(z.string()),
	permissions: z.array(z.string()),
	restrictions: z.array(z.string()).default([]),
	prerequisites: z.array(z.string()).default([]),
	licenseRequired: z.string().optional(),
}) {}

// Bulk Operations Response
export class BulkRoleOperationResponseDto extends Z.class({
	success: z.array(
		z.object({
			userId: z.string().uuid(),
			roleId: z.string(),
			message: z.string(),
		}),
	),
	errors: z.array(
		z.object({
			userId: z.string().uuid(),
			roleId: z.string().optional(),
			error: z.string(),
		}),
	),
	totalProcessed: z.number(),
	successCount: z.number(),
	errorCount: z.number(),
}) {}

// Permission Validation
export class PermissionValidationDto extends Z.class({
	permissionId: z.string(),
	isValid: z.boolean(),
	conflicts: z.array(z.string()).default([]),
	dependencies: z
		.array(
			z.object({
				permissionId: z.string(),
				satisfied: z.boolean(),
				reason: z.string().optional(),
			}),
		)
		.default([]),
	licenseCompatibility: z.object({
		isCompatible: z.boolean(),
		requiredLicense: z.string().optional(),
		currentLicense: z.string().optional(),
	}),
}) {}
