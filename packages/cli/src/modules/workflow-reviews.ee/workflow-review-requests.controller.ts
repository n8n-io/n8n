import {
	CreateWorkflowReviewCommentDto,
	CreateWorkflowReviewRequestDto,
	DecideWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	GetWorkflowReviewStatusesDto,
	type WorkflowReviewStatusesResponse,
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
import { WorkflowReviewRequestService } from './workflow-review-request.service';

@RestController('/workflow-review-requests')
export class WorkflowReviewRequestsController {
	constructor(
		private readonly workflowReviewRequestService: WorkflowReviewRequestService,
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

	@Post('/:workflowReviewRequestId/update-version')
	@Licensed('feat:workflowReviews')
	async updateVersion(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowReviewRequestId') workflowReviewRequestId: string,
		@Body dto: UpdateWorkflowReviewRequestVersionDto,
	) {
		return await this.workflowReviewRequestService.updateVersion(
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
		return await this.workflowReviewRequestService.decide(req.user, workflowReviewRequestId, dto);
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
		return await this.workflowReviewInboxService.listForInbox(req.user, query);
	}

	/**
	 * Batched open-review statuses for a page of workflows. POST for the body
	 * only — a read that avoids one request per workflow and long query strings.
	 */
	@Post('/statuses')
	@Licensed('feat:workflowReviews')
	async getStatuses(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: GetWorkflowReviewStatusesDto,
	): Promise<WorkflowReviewStatusesResponse> {
		return await this.workflowReviewInboxService.getStatusesForWorkflows(req.user, dto);
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
	 * Review detail, including the diff inputs per covered workflow.
	 *
	 * Keep this last: routes register in declaration order, so a `/:id` pattern
	 * declared earlier would swallow the literal paths above. Authorization lives
	 * in the service — `@ProjectScope` cannot resolve a project from a review id.
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
