import {
	CreateWorkflowRuleExemptionDto,
	PutWorkflowRuleSetDto,
	ScanWorkflowRulesDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, GlobalScope, Post, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { WorkflowRulesScanService } from './workflow-rules-scan.service';
import { WorkflowRulesService } from './workflow-rules.service';

/** Instance-wide rules, exemptions, the report and the export for CI. */
@RestController('/workflow-rules')
export class WorkflowRulesController {
	constructor(
		private readonly service: WorkflowRulesService,
		private readonly scanService: WorkflowRulesScanService,
	) {}

	@Get('/instance')
	@GlobalScope('workflowRules:manage')
	async getInstanceRuleSet() {
		return await this.service.getRuleSet(null);
	}

	@Put('/instance')
	@GlobalScope('workflowRules:manage')
	async putInstanceRuleSet(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: PutWorkflowRuleSetDto,
	) {
		return await this.service.putRuleSet(null, dto.ruleSet, dto.version, req.user);
	}

	/** Previews a draft instance rule set over every workflow, or reports the stored rules. */
	@Post('/scan')
	@GlobalScope('workflowRules:manage')
	async scan(_req: AuthenticatedRequest, _res: Response, @Body dto: ScanWorkflowRulesDto) {
		return await this.scanService.scan({ ruleSet: dto.ruleSet, limit: dto.limit });
	}

	@Get('/export')
	@GlobalScope('workflowRules:manage')
	async exportRules() {
		return await this.service.exportBundle();
	}

	@Get('/exemptions')
	@GlobalScope('workflowRules:manage')
	async listExemptions() {
		return await this.service.listExemptions({});
	}

	@Post('/exemptions')
	@GlobalScope('workflowRules:manage')
	async createExemption(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CreateWorkflowRuleExemptionDto,
	) {
		return await this.service.createExemption(dto, { kind: 'instance', user: req.user });
	}

	@Delete('/exemptions/:exemptionId')
	@GlobalScope('workflowRules:manage')
	async deleteExemption(req: AuthenticatedRequest<{ exemptionId: string }>) {
		await this.service.deleteExemption(Number(req.params.exemptionId), {
			kind: 'instance',
			user: req.user,
		});
		return { success: true };
	}
}
