import {
	CreateRuntimeCredentialRuleDto,
	RuntimeCredentialRuleImpactDto,
	UpdateRuntimeCredentialRuleDto,
} from '@n8n/api-types';
import type { RuntimeCredentialRule, RuntimeCredentialRuleImpact } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	RestController,
} from '@n8n/decorators';
import { BadRequestError } from '@n8n/errors';
import type { Response } from 'express';

import { RuntimeCredentialRuleImpactService } from './runtime-credential-rule-impact.service';
import { RuntimeCredentialRulesService } from './runtime-credential-rules.service';

@RestController('/runtime-credential-rules')
export class RuntimeCredentialRulesController {
	constructor(
		private readonly rulesService: RuntimeCredentialRulesService,
		private readonly impactService: RuntimeCredentialRuleImpactService,
	) {}

	@Get('/')
	@GlobalScope('securitySettings:manage')
	list(): { rules: RuntimeCredentialRule[] } {
		return { rules: this.rulesService.list() };
	}

	@Post('/')
	@GlobalScope('securitySettings:manage')
	async create(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CreateRuntimeCredentialRuleDto,
	) {
		return await this.rulesService.create(dto);
	}

	/** Workflows that read the value a rule with this `nodeType` and `path` removes. */
	@Post('/impact')
	@GlobalScope('securitySettings:manage')
	async impact(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: RuntimeCredentialRuleImpactDto,
	): Promise<RuntimeCredentialRuleImpact> {
		return await this.impactService.findAffectedWorkflows(dto.nodeType, dto.path);
	}

	@Patch('/:alias')
	@GlobalScope('securitySettings:manage')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('alias') alias: string,
		@Body dto: UpdateRuntimeCredentialRuleDto,
	) {
		// The DTO strips unknown keys. Say so for the two keys that look editable.
		const body: unknown = req.body;
		if (typeof body === 'object' && body !== null) {
			for (const key of ['alias', 'credentialType']) {
				if (key in body) throw new BadRequestError(`The ${key} of a rule cannot change`);
			}
		}
		return await this.rulesService.update(alias, dto);
	}

	@Delete('/:alias')
	@GlobalScope('securitySettings:manage')
	async delete(_req: AuthenticatedRequest, _res: Response, @Param('alias') alias: string) {
		await this.rulesService.delete(alias);
		return { success: true };
	}
}
