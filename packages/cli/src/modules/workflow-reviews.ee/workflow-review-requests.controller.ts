import {
	CreateWorkflowReviewCommentDto,
	CreateWorkflowReviewRequestDto,
	DecideWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	ListWorkflowReviewActivityQueryDto,
	ListWorkflowReviewRequestsQueryDto,
	UpdateWorkflowReviewRequestVersionDto,
	type GetWorkflowReviewInboxSummaryResponse,
	type ListWorkflowReviewActivityResponse,
	type ListWorkflowReviewInboxResponse,
	ListWorkflowReviewInboxQueryDto,
	type WorkflowReviewActivityEntry,
	type WorkflowReviewRequestDetail,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, Param, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { WorkflowReviewActivityService } from './workflow-review-activity.service';
import { WorkflowReviewInboxService } from './workflow-review-inbox.service';
import { WorkflowReviewRequestDecisionService } from './workflow-review-request-decision.service';
import { WorkflowReviewRequestStatusService } from './workflow-review-request-status.service';
import { WorkflowReviewRequestSubmissionService } from './workflow-review-request-submission.service';

@RestController('/workflow-review-requests')
export class WorkflowReviewRequestsController {
	constructor(
		private readonly workflowReviewRequestStatusService: WorkflowReviewRequestStatusService,
		private readonly workflowReviewRequestSubmissionService: WorkflowReviewRequestSubmissionService,
		private readonly workflowReviewRequestDecisionService: WorkflowReviewRequestDecisionService,
		private readonly workflowReviewInboxService: WorkflowReviewInboxService,
		private readonly workflowReviewActivityService: WorkflowReviewActivityService,
	) {}

	@Get('/')
	@Licensed('feat:workflowReviews')
	async list(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListWorkflowReviewRequestsQueryDto,
	) {
		return await this.workflowReviewRequestStatusService.list(req.user, query);
	}

	// Keep literal routes above `GET /:id` because routes register in declaration order.
	@Get('/eligible-reviewers')
	@Licensed('feat:workflowReviews')
	async getEligibleReviewers(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: GetWorkflowReviewEligibleReviewersQueryDto,
	) {
		return await this.workflowReviewRequestSubmissionService.getEligibleReviewers(req.user, query);
	}

	@Post('/')
	@Licensed('feat:workflowReviews')
	async create(
		req: AuthenticatedRequest,
		res: Response,
		@Body dto: CreateWorkflowReviewRequestDto,
	) {
		const request = await this.workflowReviewRequestSubmissionService.create(req.user, dto);
		res.status(201);
		return request;
	}

	@Post('/:workflowReviewRequestId/update-version')
	@Licensed('feat:workflowReviews')
	async updateVersion(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowReviewRequestId') workflowReviewRequestId: string,
		@Body dto: UpdateWorkflowReviewRequestVersionDto,
	) {
		return await this.workflowReviewRequestSubmissionService.updateVersion(
			req.user,
			workflowReviewRequestId,
			dto,
		);
	}

	@Post('/:workflowReviewRequestId/decision')
	@Licensed('feat:workflowReviews')
	async decide(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowReviewRequestId') workflowReviewRequestId: string,
		@Body dto: DecideWorkflowReviewRequestDto,
	) {
		return await this.workflowReviewRequestDecisionService.decide(
			req.user,
			workflowReviewRequestId,
			dto,
		);
	}

	/** Cross-project inbox. `GET /` remains the workflow-specific list used by LIGO-838. */
	@Get('/inbox')
	@Licensed('feat:workflowReviews')
	async listInbox(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListWorkflowReviewInboxQueryDto,
	): Promise<ListWorkflowReviewInboxResponse> {
		return await this.workflowReviewInboxService.listForInbox(req.user, query);
	}

	@Get('/summary')
	@Licensed('feat:workflowReviews')
	async getSummary(
		req: AuthenticatedRequest,
		_res: Response,
	): Promise<GetWorkflowReviewInboxSummaryResponse> {
		return await this.workflowReviewInboxService.getInboxSummaryForUser(req.user);
	}

	@Get('/:workflowReviewRequestId/activity')
	@Licensed('feat:workflowReviews')
	async listActivity(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowReviewRequestId') workflowReviewRequestId: string,
		@Query query: ListWorkflowReviewActivityQueryDto,
	): Promise<ListWorkflowReviewActivityResponse> {
		return await this.workflowReviewActivityService.listActivity(
			req.user,
			workflowReviewRequestId,
			query,
		);
	}

	@Post('/:workflowReviewRequestId/comments')
	@Licensed('feat:workflowReviews')
	async createComment(
		req: AuthenticatedRequest,
		res: Response,
		@Param('workflowReviewRequestId') workflowReviewRequestId: string,
		@Body dto: CreateWorkflowReviewCommentDto,
	): Promise<WorkflowReviewActivityEntry> {
		const entry = await this.workflowReviewActivityService.createComment(
			req.user,
			workflowReviewRequestId,
			dto,
		);
		res.status(201);
		return entry;
	}

	/**
	 * Keep this route last so `/:id` does not match the literal routes above.
	 * The service handles authorization because `@ProjectScope` cannot resolve a review ID.
	 */
	@Get('/:workflowReviewRequestId')
	@Licensed('feat:workflowReviews')
	async getDetail(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowReviewRequestId') workflowReviewRequestId: string,
	): Promise<WorkflowReviewRequestDetail> {
		return await this.workflowReviewInboxService.getDetail(req.user, workflowReviewRequestId);
	}
}
