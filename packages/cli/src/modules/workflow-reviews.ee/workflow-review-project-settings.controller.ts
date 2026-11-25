import {
	UpdateProjectWorkflowReviewSettingsDto,
	type ProjectWorkflowReviewSettingsResponse,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, Param, Patch, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { WorkflowReviewProjectSettingsService } from './workflow-review-project-settings.service';

@RestController('/projects/:projectId/workflow-review-settings')
export class WorkflowReviewProjectSettingsController {
	constructor(private readonly projectSettingsService: WorkflowReviewProjectSettingsService) {}

	@Get('/')
	@Licensed('feat:workflowReviews')
	@ProjectScope('project:read')
	async get(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<ProjectWorkflowReviewSettingsResponse> {
		return await this.projectSettingsService.get(projectId);
	}

	@Patch('/')
	@Licensed('feat:workflowReviews')
	@ProjectScope('project:update')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Body dto: UpdateProjectWorkflowReviewSettingsDto,
	): Promise<ProjectWorkflowReviewSettingsResponse> {
		return await this.projectSettingsService.update(req.user, projectId, dto);
	}
}
