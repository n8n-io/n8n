import { UpdateWorkflowReviewRequirementsDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, Param, Patch, ProjectScope, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';

import { WorkflowReviewEnforcementService } from './workflow-review-enforcement.service';
import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';

/**
 * Approval requirements for publishing and promoting.
 * A project admin sets them for every workflow in the project.
 * A workflow editor sets them for one workflow.
 * The instance settings stay on the security settings endpoint.
 */
@RestController('/workflow-review-policies')
export class WorkflowReviewPolicyController {
	constructor(
		private readonly enforcement: WorkflowReviewEnforcementService,
		private readonly featureGate: WorkflowReviewFeatureGate,
	) {}

	@Get('/projects/:projectId')
	@Licensed('feat:workflowReviews')
	@ProjectScope('project:read')
	async getProjectPolicy(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	) {
		await this.featureGate.assertAvailable();
		const view = await this.enforcement.getProjectView(projectId);
		if (!view) throw new NotFoundError('Project not found');
		return view;
	}

	@Patch('/projects/:projectId')
	@Licensed('feat:workflowReviews')
	@ProjectScope('project:update')
	async updateProjectPolicy(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Body dto: UpdateWorkflowReviewRequirementsDto,
	) {
		await this.featureGate.assertAvailable();
		return await this.enforcement.updateProject(projectId, dto);
	}

	@Get('/workflows/:workflowId')
	@Licensed('feat:workflowReviews')
	@ProjectScope('workflow:read')
	async getWorkflowPolicy(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	) {
		await this.featureGate.assertAvailable();
		const view = await this.enforcement.getWorkflowView(workflowId);
		if (!view) throw new NotFoundError('Workflow not found');
		return view;
	}

	@Patch('/workflows/:workflowId')
	@Licensed('feat:workflowReviews')
	@ProjectScope('workflow:update')
	async updateWorkflowPolicy(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body dto: UpdateWorkflowReviewRequirementsDto,
	) {
		await this.featureGate.assertAvailable();
		return await this.enforcement.updateWorkflow(workflowId, dto);
	}
}
