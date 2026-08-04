import { CreateRoleDto, RolePublicDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest, User } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Licensed,
	Post,
	PublicApiController,
} from '@n8n/decorators';
import { hasGlobalScope, RoleNamespace } from '@n8n/permissions';
import type { Response } from 'express';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { RoleService } from '@/services/role.service';

@PublicApiController('/roles')
export class RolesPublicController {
	constructor(
		private readonly roleService: RoleService,
		private readonly eventService: EventService,
	) {}

	private assertCanManageRoleType(user: User, roleType: RoleNamespace): void {
		if (hasGlobalScope(user, 'role:manage')) return;
		if (roleType === 'project' && hasGlobalScope(user, 'role:manageProject')) return;
		throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.MISSING_SCOPE);
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
	@ApiErrorResponse(400)
	@ApiErrorResponse(403)
	async createRole(
		req: AuthenticatedRequest,
		_res: Response,
		@Body createRole: CreateRoleDto,
	): Promise<RolePublicDto> {
		this.assertCanManageRoleType(req.user, createRole.roleType);

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
			licensed: role.licensed,
			scopes: role.scopes,
			createdAt: role.createdAt!.toISOString(),
			updatedAt: role.updatedAt!.toISOString(),
		};
	}
}
