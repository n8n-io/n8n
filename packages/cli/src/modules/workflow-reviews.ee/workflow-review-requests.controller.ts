import {
	CreateWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	ListWorkflowReviewRequestsQueryDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, Post, Query, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { WorkflowReviewRequestService } from './workflow-review-request.service';

@RestController('/workflow-review-requests')
export class WorkflowReviewRequestsController {
	constructor(private readonly workflowReviewRequestService: WorkflowReviewRequestService) {}

	@Get('/')
	@Licensed('feat:workflowReviews')
	async list(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListWorkflowReviewRequestsQueryDto,
	) {
		return await this.workflowReviewRequestService.list(req.user, query);
	}

	// Routes register in declaration order — keep this above any future `GET /:id`
	// so 'eligible-reviewers' is not captured as an id
	@Get('/eligible-reviewers')
	@Licensed('feat:workflowReviews')
	async getEligibleReviewers(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: GetWorkflowReviewEligibleReviewersQueryDto,
	) {
		return await this.workflowReviewRequestService.getEligibleReviewers(req.user, query);
	}

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
