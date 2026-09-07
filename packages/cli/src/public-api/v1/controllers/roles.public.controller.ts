import {
	CreateRoleDto,
	RoleDeleteQueryDto,
	RoleGetPublicDto,
	RoleListPublicDto,
	RoleListQueryPublicDto,
	RolePublicDto,
	UpdateRolePublicDto,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	Licensed,
	Param,
	Post,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import { RoleNamespace, type Role as RoleDTO } from '@n8n/permissions';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { assertCanManageRoleType, canReassignUsers } from '@/services/role-authorization';
import { RoleService } from '@/services/role.service';

type PublicRoleNamespace = Extract<RoleNamespace, 'global' | 'project'>;
const isPublicRole = (role: RoleDTO): role is RoleDTO & { roleType: PublicRoleNamespace } =>
	role.roleType === 'global' || role.roleType === 'project';

const toRolePublicDto = (role: RoleDTO & { roleType: PublicRoleNamespace }): RolePublicDto => ({
	slug: role.slug,
	displayName: role.displayName,
	description: role.description,
	systemRole: role.systemRole,
	roleType: role.roleType,
	scopes: role.scopes,
	createdAt: role.createdAt!.toISOString(),
	updatedAt: role.updatedAt!.toISOString(),
});

const toRoleGetPublicDto = (
	role: RoleDTO & { roleType: PublicRoleNamespace },
	withUsageCount: boolean,
): RoleGetPublicDto => ({
	...toRolePublicDto(role),
	licensed: role.licensed,
	...(withUsageCount ? { usedByUsers: role.usedByUsers, usedByProjects: role.usedByProjects } : {}),
});

@PublicApiController('/roles')
export class RolesPublicController {
	constructor(
		private readonly roleService: RoleService,
		private readonly eventService: EventService,
	) {}

	@Get('/')
	@ApiKeyScope('role:list')
	@ApiSummary('Retrieve all roles')
	@ApiDescription(
		'Returns all roles grouped by type (global and project). Set `withUsageCount` to include how many users and projects use each role.',
	)
	@ApiTags(['Role'])
	@ApiResponse(200, RoleListPublicDto)
	async getAllRoles(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: RoleListQueryPublicDto,
	): Promise<RoleListPublicDto> {
		const { withUsageCount } = query;
		const allRoles = await this.roleService.getAllRoles(withUsageCount);
		const publicRoles = allRoles.filter(isPublicRole);

		const groupOf = <T extends PublicRoleNamespace>(roleType: T) =>
			publicRoles
				.filter((role): role is RoleDTO & { roleType: T } => role.roleType === roleType)
				.map((role) => ({
					...toRoleGetPublicDto({ ...role, roleType }, withUsageCount),
					roleType,
				}));

		return {
			global: groupOf('global'),
			project: groupOf('project'),
		};
	}

	@Get('/:slug')
	@ApiKeyScope('role:read')
	@ApiSummary('Retrieve a role')
	@ApiDescription(
		'Returns a single role with its scopes. Set `withUsageCount` to include how many users and projects use the role.',
	)
	@ApiTags(['Role'])
	@ApiResponse(200, RoleGetPublicDto)
	@ApiErrorResponse(404)
	async getRole(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('slug') slug: string,
		@Query query: RoleListQueryPublicDto,
	): Promise<RoleGetPublicDto> {
		const { withUsageCount } = query;
		const role = await this.roleService.getRole(slug, withUsageCount);
		if (!isPublicRole(role)) {
			throw new NotFoundError('Role not found');
		}
		return toRoleGetPublicDto({ ...role, roleType: role.roleType }, withUsageCount);
	}

	@Post('/')
	@ApiKeyScope({ anyOf: ['role:manage', 'role:manageProject'] })
	@Licensed(LICENSE_FEATURES.CUSTOM_ROLES)
	@ApiSummary('Create a custom role')
	@ApiDescription(
		'Creates a custom role. Set `roleType` to `global` for an instance-wide role or `project` for a project role.',
	)
	@ApiTags(['Role'])
	@ApiResponse(201, RolePublicDto)
	async createRole(
		req: AuthenticatedRequest,
		_res: Response,
		@Body createRole: CreateRoleDto,
	): Promise<RolePublicDto> {
		assertCanManageRoleType({
			apiKeyScopes: req.tokenGrant?.apiKeyScopes ?? [],
			roleType: createRole.roleType,
			user: req.user,
		});

		const role = await this.roleService.createCustomRole(createRole);

		this.eventService.emit('custom-role-created', {
			userId: req.user.id,
			roleSlug: role.slug,
			scopes: role.scopes,
		});

		return toRolePublicDto({ ...role, roleType: createRole.roleType });
	}

	@Put('/:slug')
	@ApiKeyScope({ anyOf: ['role:manage', 'role:manageProject'] })
	@Licensed(LICENSE_FEATURES.CUSTOM_ROLES)
	@ApiSummary('Update a custom role')
	@ApiDescription(
		"Replaces a custom role's display name, description, and scopes. System roles cannot be updated.",
	)
	@ApiTags(['Role'])
	@ApiResponse(200, RolePublicDto)
	@ApiErrorResponse(404)
	async updateRole(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('slug') slug: string,
		@Body updateRole: UpdateRolePublicDto,
	): Promise<RolePublicDto> {
		const role = await this.roleService.getRole(slug);
		if (!isPublicRole(role)) {
			throw new NotFoundError('Role not found');
		}

		assertCanManageRoleType({
			apiKeyScopes: req.tokenGrant?.apiKeyScopes ?? [],
			roleType: role.roleType,
			user: req.user,
		});

		const result = await this.roleService.updateCustomRole({
			slug,
			newRole: updateRole,
			userId: req.user.id,
		});

		return toRolePublicDto({ ...result, roleType: role.roleType });
	}

	@Delete('/:slug')
	@ApiKeyScope({ anyOf: ['role:manage', 'role:manageProject'] })
	@Licensed(LICENSE_FEATURES.CUSTOM_ROLES)
	@ApiSummary('Delete a custom role')
	@ApiDescription(
		'Deletes a custom role. System roles cannot be deleted. A role with users assigned cannot be deleted unless `reassignRoleSlug` is set to move those users to another role first.',
	)
	@ApiTags(['Role'])
	@ApiResponse(200, RolePublicDto)
	@ApiErrorResponse(404)
	async deleteRole(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('slug') slug: string,
		@Query query: RoleDeleteQueryDto,
	): Promise<RolePublicDto> {
		const role = await this.roleService.getRole(slug);
		if (!isPublicRole(role)) {
			throw new NotFoundError('Role not found');
		}

		const apiKeyScopes = req.tokenGrant?.apiKeyScopes ?? [];

		assertCanManageRoleType({
			apiKeyScopes,
			roleType: role.roleType,
			user: req.user,
		});

		const reassignRoleSlug = canReassignUsers({ apiKeyScopes, role, user: req.user })
			? query.reassignRoleSlug
			: undefined;

		const result = await this.roleService.removeCustomRole({
			slug,
			reassignRoleSlug,
			userId: req.user.id,
		});

		return toRolePublicDto({ ...result, roleType: role.roleType });
	}
}
