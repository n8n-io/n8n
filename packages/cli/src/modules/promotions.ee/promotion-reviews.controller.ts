import {
	PromotionReviewDetailsRequestDto,
	type PromotionResourceDetails,
	type PromotionReviewChanges,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Param, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PromotionReviewChangesService } from './promotion-review-changes.service';

@RestController('/promotions/reviews')
export class PromotionReviewsController {
	constructor(private readonly changes: PromotionReviewChangesService) {}

	@Get('/:reviewId/changes')
	@GlobalScope('gitConnection:readReviews')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async getChanges(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('reviewId') reviewId: string,
	): Promise<PromotionReviewChanges> {
		return await this.changes.getChanges(reviewId);
	}

	@Post('/:reviewId/changes/details')
	@GlobalScope('gitConnection:readReviews')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async getDetails(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('reviewId') reviewId: string,
		@Body body: PromotionReviewDetailsRequestDto,
	): Promise<PromotionResourceDetails> {
		return await this.changes.getDetails(req.user, reviewId, body);
	}
}
