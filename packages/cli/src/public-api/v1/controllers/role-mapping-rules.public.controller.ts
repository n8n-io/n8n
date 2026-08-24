import {
	CreateRoleMappingRuleDto,
	MoveRoleMappingRuleDto,
	RoleMappingRuleListPublicDto,
	RoleMappingRuleListQueryPublicDto,
	RoleMappingRulePublicDto,
	UpdateRoleMappingRulePublicDto,
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
	Delete,
	Get,
	Param,
	Patch,
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

	@Post('/:roleMappingRuleId/move')
	@ApiKeyScope('roleMappingRule:update')
	@ApiSummary('Move a role-mapping rule')
	@ApiDescription(
		"Changes a rule's position in the evaluation order for its type. `targetIndex` is the desired 0-based position within the rule's own `type` sequence; a value beyond the last position moves the rule to the end.",
	)
	@ApiTags(['RoleMappingRule'])
	@ApiResponse(200, RoleMappingRulePublicDto)
	@ApiErrorResponse(404)
	async moveRoleMappingRule(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('roleMappingRuleId') roleMappingRuleId: string,
		@Body body: MoveRoleMappingRuleDto,
	): Promise<RoleMappingRulePublicDto> {
		this.assertProvisioningLicensed();

		const rule = await this.roleMappingRuleService.move({
			id: roleMappingRuleId,
			targetIndex: body.targetIndex,
			userId: req.user.id,
			userEmail: req.user.email,
		});

		return toRoleMappingRulePublicDto(rule);
	}

	@Patch('/:roleMappingRuleId')
	@ApiKeyScope('roleMappingRule:update')
	@ApiSummary('Update a role-mapping rule')
	@ApiDescription(
		"Updates a rule's claim expression, role, and/or project assignments. A rule's type cannot be changed once created, so `type` isn't accepted here, and reordering is handled by the move endpoint.",
	)
	@ApiTags(['RoleMappingRule'])
	@ApiResponse(200, RoleMappingRulePublicDto)
	@ApiErrorResponse(404)
	async updateRoleMappingRule(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('roleMappingRuleId') roleMappingRuleId: string,
		@Body body: UpdateRoleMappingRulePublicDto,
	): Promise<RoleMappingRulePublicDto> {
		this.assertProvisioningLicensed();

		const rule = await this.roleMappingRuleService.patch({
			id: roleMappingRuleId,
			dto: body,
			userId: req.user.id,
			userEmail: req.user.email,
		});

		return toRoleMappingRulePublicDto(rule);
	}

	@Delete('/:roleMappingRuleId')
	@ApiKeyScope('roleMappingRule:delete')
	@ApiSummary('Delete a role-mapping rule')
	@ApiDescription(
		'Deletes a role-mapping rule. The remaining rules of the same type close the gap, so their `order` values stay a contiguous sequence starting at 0.',
	)
	@ApiTags(['RoleMappingRule'])
	@ApiResponse(200, RoleMappingRulePublicDto)
	@ApiErrorResponse(404)
	async deleteRoleMappingRule(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('roleMappingRuleId') roleMappingRuleId: string,
	): Promise<RoleMappingRulePublicDto> {
		this.assertProvisioningLicensed();

		const rule = await this.roleMappingRuleService.delete({
			id: roleMappingRuleId,
			userId: req.user.id,
			userEmail: req.user.email,
		});

		return toRoleMappingRulePublicDto(rule);
	}

	private assertProvisioningLicensed(): void {
		if (!this.licenseState.isProvisioningLicensed()) {
			throw new ForbiddenError('Provisioning is not licensed');
		}
	}
}
