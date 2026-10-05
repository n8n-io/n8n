import {
	ListPromotionReviewsQueryDto,
	type PromotionReviewDetailDto,
	type PromotionReviewListPublicDto,
	type PromotionReviewWorkflowDiffDto,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Licensed, Param, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PromotionReviewsService } from './promotion-reviews.service';

/**
 * Promotion Reviews for the review inbox. Reading needs the connection read
 * scope; approving merges on the Git host, so it needs the push scope.
 */
@RestController('/promotions/reviews')
export class PromotionReviewsController {
	constructor(private readonly reviewsService: PromotionReviewsService) {}

	@Get('/')
	@GlobalScope('gitConnection:read')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async list(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListPromotionReviewsQueryDto,
	): Promise<PromotionReviewListPublicDto> {
		return await this.reviewsService.list(query);
	}

	@Get('/:runId')
	@GlobalScope('gitConnection:read')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async getDetail(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('runId') runId: string,
	): Promise<PromotionReviewDetailDto> {
		return await this.reviewsService.getDetail(runId);
	}

	@Get('/:runId/workflows/:workflowId/diff')
	@GlobalScope('gitConnection:read')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async getWorkflowDiff(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('runId') runId: string,
		@Param('workflowId') workflowId: string,
	): Promise<PromotionReviewWorkflowDiffDto> {
		return await this.reviewsService.getWorkflowDiff(runId, workflowId);
	}

	@Post('/:runId/approve')
	@GlobalScope('gitConnection:push')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async approve(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('runId') runId: string,
	): Promise<PromotionReviewDetailDto> {
		return await this.reviewsService.approve(runId, req.user);
	}
}
