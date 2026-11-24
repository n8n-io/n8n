import {
	ListWorkflowReviewProjectsQueryDto,
	UpdateWorkflowReviewProjectDto,
	type WorkflowReviewProjectList,
	type WorkflowReviewProjectUpdateResponse,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Get,
	GlobalScope,
	Licensed,
	Param,
	Patch,
	Query,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { WorkflowReviewProjectSettingsService } from './workflow-review-project-settings.service';

@RestController('/workflow-review-settings/projects')
export class WorkflowReviewProjectsController {
	constructor(private readonly projectSettingsService: WorkflowReviewProjectSettingsService) {}

	@Get('/')
	@Licensed('feat:workflowReviews')
	@GlobalScope('securitySettings:manage')
	async list(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListWorkflowReviewProjectsQueryDto,
	): Promise<WorkflowReviewProjectList> {
		return await this.projectSettingsService.listProjects(query);
	}

	// Global scope on purpose: a project role must never set the instance option.
	@Patch('/:projectId')
	@Licensed('feat:workflowReviews')
	@GlobalScope('securitySettings:manage')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Body dto: UpdateWorkflowReviewProjectDto,
	): Promise<WorkflowReviewProjectUpdateResponse> {
		return await this.projectSettingsService.setRequiredByInstance(req.user, projectId, dto);
	}
}
