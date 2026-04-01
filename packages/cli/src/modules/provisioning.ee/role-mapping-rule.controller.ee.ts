import {
	CreateRoleMappingRuleDto,
	ListRoleMappingRuleQueryDto,
	MoveRoleMappingRuleDto,
	PatchRoleMappingRuleDto,
} from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	Query,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import type {
	RoleMappingRuleListResponse,
	RoleMappingRuleResponse,
} from './role-mapping-rule.service.ee';
import { RoleMappingRuleService } from './role-mapping-rule.service.ee';

@RestController('/role-mapping-rule')
export class RoleMappingRuleController {
	constructor(
		private readonly roleMappingRuleService: RoleMappingRuleService,
		private readonly licenseState: LicenseState,
	) {}

	@Get('/')
	@GlobalScope('roleMappingRule:list')
	async list(
		_req: AuthenticatedRequest,
		res: Response,
		@Query query: ListRoleMappingRuleQueryDto,
	): Promise<RoleMappingRuleListResponse | Response> {
		if (!this.licenseState.isProvisioningLicensed()) {
			return res.status(403).json({ message: 'Provisioning is not licensed' });
		}

		return await this.roleMappingRuleService.list(query);
	}

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

	@Post('/:id/move')
	@GlobalScope('roleMappingRule:update')
	async move(
		_req: AuthenticatedRequest,
		res: Response,
		@Body body: MoveRoleMappingRuleDto,
		@Param('id') id: string,
	): Promise<RoleMappingRuleResponse | Response> {
		if (!this.licenseState.isProvisioningLicensed()) {
			return res.status(403).json({ message: 'Provisioning is not licensed' });
		}

		return await this.roleMappingRuleService.move(id, body.targetIndex);
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

	@Delete('/:id')
	@GlobalScope('roleMappingRule:delete')
	async delete(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('id') id: string,
	): Promise<{ success: true } | Response> {
		if (!this.licenseState.isProvisioningLicensed()) {
			return res.status(403).json({ message: 'Provisioning is not licensed' });
		}

		await this.roleMappingRuleService.delete(id);

		return { success: true };
	}
}
