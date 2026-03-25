import { CreateRoleMappingRuleDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Post, RestController } from '@n8n/decorators';
import { LicenseState } from '@n8n/backend-common';
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
}
