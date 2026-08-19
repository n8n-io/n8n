import {
	CreateRoleMappingRuleDto,
	RoleMappingRuleListPublicDto,
	RoleMappingRuleListQueryPublicDto,
	RoleMappingRulePublicDto,
} from '@n8n/api-types';
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
	Get,
	Post,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { RoleMappingRuleResponse } from '@/modules/provisioning.ee/role-mapping-rule.service.ee';
import { RoleMappingRuleService } from '@/modules/provisioning.ee/role-mapping-rule.service.ee';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

function toRoleMappingRulePublicDto(rule: RoleMappingRuleResponse): RoleMappingRulePublicDto {
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

@PublicApiController('/role-mapping-rules')
export class RoleMappingRulesPublicController {
	constructor(
		private readonly roleMappingRuleService: RoleMappingRuleService,
		private readonly licenseState: LicenseState,
	) {}

	@Get('/')
	@ApiKeyScope('roleMappingRule:list')
	@ApiSummary('Retrieve role-mapping rules')
	@ApiDescription(
		"Returns the configured role-mapping rules. `order` is the rule's evaluation position within its own `type`, so instance and project rules each have their own sequence starting at 0 — filter by `type` to retrieve a single evaluation order.",
	)
	@ApiTags(['RoleMappingRule'])
	@ApiResponse(200, RoleMappingRuleListPublicDto)
	async getRoleMappingRules(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: RoleMappingRuleListQueryPublicDto,
	): Promise<RoleMappingRuleListPublicDto> {
		this.assertProvisioningLicensed();

		const { offset, limit } = resolveOffsetPagination(query);

		const { count, items } = await this.roleMappingRuleService.list({
			skip: offset,
			take: limit,
			type: query.type,
		});

		return {
			data: items.map(toRoleMappingRulePublicDto),
			nextCursor: encodeNextCursor({
				offset,
				limit,
				numberOfTotalRecords: count,
			}),
		};
	}

	@Post('/')
	@ApiKeyScope('roleMappingRule:create')
	@ApiSummary('Create a role-mapping rule')
	@ApiDescription(
		'Creates a rule that maps an identity-provider claim expression to a role. Set `type` to `instance` for a rule granting a global role, or `project` for a rule granting a project role on the projects named in `projectIds`. Omitting `order` appends the rule to the end of the evaluation order for its type.',
	)
	@ApiTags(['RoleMappingRule'])
	@ApiResponse(201, RoleMappingRulePublicDto)
	@ApiErrorResponse(404)
	async createRoleMappingRule(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateRoleMappingRuleDto,
	): Promise<RoleMappingRulePublicDto> {
		this.assertProvisioningLicensed();

		const rule = await this.roleMappingRuleService.create(body, req.user);

		return toRoleMappingRulePublicDto(rule);
	}

	private assertProvisioningLicensed(): void {
		if (!this.licenseState.isProvisioningLicensed()) {
			throw new ForbiddenError('Provisioning is not licensed');
		}
	}
}
