import { LicenseState } from '@n8n/backend-common';
import { EvalPlanRequestDto } from '@n8n/api-types';
import type { EvalPlan } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { EvalPlanService } from './eval-plan.service';

@RestController('/instance-ai')
export class EvalPlanController {
	constructor(
		private readonly licenseState: LicenseState,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly evalPlanService: EvalPlanService,
	) {}

	@Post('/eval-plan')
	async create(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: EvalPlanRequestDto,
	): Promise<EvalPlan> {
		if (!this.licenseState.isAiAssistantLicensed()) {
			throw new ForbiddenError('This feature is not available');
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(
			payload.workflowId,
			req.user,
			['workflow:read'],
		);
		if (!workflow) {
			throw new NotFoundError('Workflow not found');
		}

		return await this.evalPlanService.generatePlan(
			workflow,
			payload.llmNodeName,
			payload.userIntent,
		);
	}
}
