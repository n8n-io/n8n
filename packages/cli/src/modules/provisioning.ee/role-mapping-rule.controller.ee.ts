import { CreateRoleMappingRuleDto, PatchRoleMappingRuleDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Param, Patch, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import type { RoleMappingRuleResponse } from './role-mapping-rule.service.ee';
import { RoleMappingRuleService } from './role-mapping-rule.service.ee';

@RestController('/role-mapping-rule')
export class RoleMappingRuleController {
	constructor(
		private readonly roleMappingRuleService: RoleMappingRuleService,
		private readonly licenseState: LicenseState,
	) {}

	@Post('/')
	@GlobalScope('roleMappingRule:create')
	async create(
		_req: AuthenticatedRequest,
		res: Response,
		@Body body: CreateRoleMappingRuleDto,
	): Promise<RoleMappingRuleResponse | Response> {
		if (!this.licenseState.isProvisioningLicensed()) {
			return res.status(403).json({ message: 'Provisioning is not licensed' });
		}

		return await this.roleMappingRuleService.create(body);
	}

	@Patch('/:id')
	@GlobalScope('roleMappingRule:update')
	// @Body at param index 2 (same as `create`) so controller-registry applies Zod to PatchRoleMappingRuleDto; @Param before @Body skips body validation.
	async patch(
		_req: AuthenticatedRequest,
		res: Response,
		@Body body: PatchRoleMappingRuleDto,
		@Param('id') id: string,
	): Promise<RoleMappingRuleResponse | Response> {
		if (!this.licenseState.isProvisioningLicensed()) {
			return res.status(403).json({ message: 'Provisioning is not licensed' });
		}

		return await this.roleMappingRuleService.patch(id, body);
	}
}
