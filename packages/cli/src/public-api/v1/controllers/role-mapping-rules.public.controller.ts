import { CreateRoleMappingRuleDto, RoleMappingRulePublicDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Post,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { RoleMappingRuleService } from '@/modules/provisioning.ee/role-mapping-rule.service.ee';

@PublicApiController('/role-mapping-rules')
export class RoleMappingRulesPublicController {
	constructor(
		private readonly roleMappingRuleService: RoleMappingRuleService,
		private readonly licenseState: LicenseState,
		private readonly eventService: EventService,
	) {}

	@Post('/')
	@ApiKeyScope('roleMappingRule:create')
	@ApiSummary('Create a role-mapping rule')
	@ApiDescription(
		'Creates a rule that maps an identity-provider claim expression to a role. Set `type` to `instance` for a rule granting a global role, or `project` for a rule granting a project role on the projects named in `projectIds`. Omitting `order` appends the rule to the end of the evaluation order for its type.',
	)
	@ApiTags(['RoleMappingRule'])
	@ApiResponse(201, RoleMappingRulePublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async createRoleMappingRule(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateRoleMappingRuleDto,
	): Promise<RoleMappingRulePublicDto> {
		if (!this.licenseState.isProvisioningLicensed()) {
			throw new ForbiddenError('Provisioning is not licensed');
		}

		const rule = await this.roleMappingRuleService.create(body);

		this.eventService.emit('role-mapping-rule-created', {
			user: { id: req.user.id, email: req.user.email },
			ruleId: rule.id,
			ruleType: rule.type,
			expression: rule.expression,
			role: rule.role,
		});

		return {
			id: rule.id,
			expression: rule.expression,
			role: rule.role,
			type: rule.type,
			order: rule.order,
			projectIds: rule.projectIds,
			createdAt: rule.createdAt,
			updatedAt: rule.updatedAt,
		};
	}
}
