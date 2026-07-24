import {
	CreateWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	ListWorkflowReviewRequestsQueryDto,
	type GetWorkflowReviewInboxSummaryResponse,
	type ListWorkflowReviewInboxResponse,
	ListWorkflowReviewInboxQueryDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

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

	/**
	 * Cross-project inbox. Lives under `/inbox` so `GET /` stays free for the
	 * workflow-scoped list used by review-required toggle sync (LIGO-838).
	 */
	@Get('/inbox')
	@Licensed('feat:workflowReviews')
	async listInbox(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListWorkflowReviewInboxQueryDto,
	): Promise<ListWorkflowReviewInboxResponse> {
		return await this.workflowReviewRequestService.listForInbox(req.user, query);
	}

	@Get('/summary')
	@Licensed('feat:workflowReviews')
	async getSummary(
		req: AuthenticatedRequest,
		_res: Response,
	): Promise<GetWorkflowReviewInboxSummaryResponse> {
		return await this.workflowReviewRequestService.getInboxSummaryForUser(req.user);
	}
}
