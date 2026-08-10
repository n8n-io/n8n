import { CreateRoleDto, RolePublicDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Licensed,
	Post,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { EventService } from '@/events/event.service';
import { assertCanManageRoleType } from '@/services/role-authorization';
import { RoleService } from '@/services/role.service';

@PublicApiController('/roles')
export class RolesPublicController {
	constructor(
		private readonly roleService: RoleService,
		private readonly eventService: EventService,
	) {}

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
