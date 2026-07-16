import { CreateWorkflowReviewRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Licensed, Post, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { WorkflowReviewRequestService } from './workflow-review-request.service';

@RestController('/workflow-review-requests')
export class WorkflowReviewRequestsController {
	constructor(private readonly workflowReviewRequestService: WorkflowReviewRequestService) {}

	@Post('/')
	@Licensed('feat:workflowReviews')
	async create(
		req: AuthenticatedRequest,
		res: Response,
		@Body dto: CreateWorkflowReviewRequestDto,
	) {
		const request = await this.workflowReviewRequestService.create(req.user, dto);
		res.status(201);
		return request;
	}
}
