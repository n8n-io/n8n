import {
	CreateWorkflowRuleExemptionDto,
	EffectiveWorkflowRulesQueryDto,
	PutWorkflowRuleSetDto,
	ScanWorkflowRulesDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Post, ProjectScope, Put, Query, RestController } from '@n8n/decorators';
import { hasGlobalScope } from '@n8n/permissions';
import type { Response } from 'express';

import { WorkflowRulesScanService } from './workflow-rules-scan.service';
import { type ExemptionActor, WorkflowRulesService } from './workflow-rules.service';

type ProjectRequest<Params = object> = AuthenticatedRequest<{ projectId: string } & Params>;

/** One project's rules, plus the effective rules the editor evaluates for its workflows. */
@RestController('/projects/:projectId/workflow-rules')
export class WorkflowRulesProjectController {
	constructor(
		private readonly service: WorkflowRulesService,
		private readonly scanService: WorkflowRulesScanService,
	) {}

	/** Builders read this to see findings live. It needs no rules permission. */
	@Get('/effective')
	@ProjectScope('workflow:read')
	async getEffective(
		req: ProjectRequest,
		_res: Response,
		@Query query: EffectiveWorkflowRulesQueryDto,
	) {
		return await this.service.getEffective(req.params.projectId, query.workflowId);
	}

	@Get('/')
	@ProjectScope('workflowRules:manage')
	async getProjectRuleSet(req: ProjectRequest) {
		return await this.service.getRuleSet(req.params.projectId);
	}

	@Put('/')
	@ProjectScope('workflowRules:manage')
	async putProjectRuleSet(req: ProjectRequest, _res: Response, @Body dto: PutWorkflowRuleSetDto) {
		return await this.service.putRuleSet(req.params.projectId, dto.ruleSet, dto.version, req.user);
	}

	@Post('/scan')
	@ProjectScope('workflowRules:manage')
	async scan(req: ProjectRequest, _res: Response, @Body dto: ScanWorkflowRulesDto) {
		return await this.scanService.scan({
			projectId: req.params.projectId,
			ruleSet: dto.ruleSet,
			limit: dto.limit,
		});
	}

	@Get('/exemptions')
	@ProjectScope('workflowRules:manage')
	async listExemptions(req: ProjectRequest) {
		return await this.service.listExemptions({ projectId: req.params.projectId });
	}

	@Post('/exemptions')
	@ProjectScope('workflowRules:manage')
	async createExemption(
		req: ProjectRequest,
		_res: Response,
		@Body dto: CreateWorkflowRuleExemptionDto,
	) {
		return await this.service.createExemption(dto, this.actor(req));
	}

	@Delete('/exemptions/:exemptionId')
	@ProjectScope('workflowRules:manage')
	async deleteExemption(req: ProjectRequest<{ exemptionId: string }>) {
		await this.service.deleteExemption(Number(req.params.exemptionId), this.actor(req));
		return { success: true };
	}

	/** An instance admin keeps instance rights on a project page. */
	private actor(req: ProjectRequest): ExemptionActor {
		return hasGlobalScope(req.user, 'workflowRules:manage')
			? { kind: 'instance', user: req.user }
			: { kind: 'project', user: req.user, projectId: req.params.projectId };
	}
}
