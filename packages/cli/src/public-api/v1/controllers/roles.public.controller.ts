import {
	CreateRoleDto,
	RoleListPublicDto,
	RoleListQueryPublicDto,
	RolePublicDto,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Get,
	Licensed,
	Post,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import { RoleNamespace, type Role as RoleDTO } from '@n8n/permissions';
import type { Response } from 'express';

import { EventService } from '@/events/event.service';
import { assertCanManageRoleType } from '@/services/role-authorization';
import { RoleService } from '@/services/role.service';

type PublicRoleNamespace = Extract<RoleNamespace, 'global' | 'project'>;
const isPublicRole = (role: RoleDTO): role is RoleDTO & { roleType: PublicRoleNamespace } =>
	role.roleType === 'global' || role.roleType === 'project';

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
					slug: role.slug,
					displayName: role.displayName,
					description: role.description,
					systemRole: role.systemRole,
					roleType: role.roleType,
					licensed: role.licensed,
					scopes: role.scopes,
					createdAt: role.createdAt!.toISOString(),
					updatedAt: role.updatedAt!.toISOString(),
					...(withUsageCount
						? { usedByUsers: role.usedByUsers, usedByProjects: role.usedByProjects }
						: {}),
				}));

		return {
			global: groupOf('global'),
			project: groupOf('project'),
		};
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
		assertCanManageRoleType(req.user, createRole.roleType);

		const role = await this.roleService.createCustomRole(createRole);

		this.eventService.emit('custom-role-created', {
			userId: req.user.id,
			roleSlug: role.slug,
			scopes: role.scopes,
		});

		return {
			slug: role.slug,
			displayName: role.displayName,
			description: role.description,
			systemRole: role.systemRole,
			roleType: createRole.roleType,
			scopes: role.scopes,
			createdAt: role.createdAt!.toISOString(),
			updatedAt: role.updatedAt!.toISOString(),
		};
	}
}
