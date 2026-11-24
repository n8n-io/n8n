import {
	ListWorkflowReviewInstanceSettingsQueryDto,
	UpdateWorkflowReviewInstanceSettingsDto,
	type WorkflowReviewInstanceSettingsList,
	type WorkflowReviewInstanceSettingsResponse,
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
export class WorkflowReviewInstanceSettingsController {
	constructor(private readonly projectSettingsService: WorkflowReviewProjectSettingsService) {}

	@Get('/')
	@Licensed('feat:workflowReviews')
	@GlobalScope('securitySettings:manage')
	async list(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListWorkflowReviewInstanceSettingsQueryDto,
	): Promise<WorkflowReviewInstanceSettingsList> {
		return await this.projectSettingsService.listInstanceSettings(query);
	}

	// Global scope on purpose: a project role must never set the instance option.
	@Patch('/:projectId')
	@Licensed('feat:workflowReviews')
	@GlobalScope('securitySettings:manage')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Body dto: UpdateWorkflowReviewInstanceSettingsDto,
	): Promise<WorkflowReviewInstanceSettingsResponse> {
		return await this.projectSettingsService.setRequiredByInstance(req.user, projectId, dto);
	}
}
