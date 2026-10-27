import {
	ApprovePromotionReviewDto,
	PromotionReviewDetailsRequestDto,
	type InboxPromotionReviewItem,
	type PromotionResourceDetails,
	type PromotionReviewChanges,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Param, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PromotionReviewChangesService } from './promotion-review-changes.service';
import { PromotionReviewInboxService } from './promotion-review-inbox.service';

@RestController('/promotions/reviews')
export class PromotionReviewsController {
	constructor(
		private readonly reviews: PromotionReviewInboxService,
		private readonly changes: PromotionReviewChangesService,
	) {}

	@Post('/:reviewId/approve')
	@GlobalScope('promotions:approveReviews')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	async approve(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('reviewId') reviewId: string,
		@Body body: ApprovePromotionReviewDto,
	): Promise<InboxPromotionReviewItem> {
		return await this.reviews.approve(req.user, reviewId, body);
	}

	@Get('/:reviewId/changes')
	@GlobalScope('promotions:readReviews')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	async getChanges(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('reviewId') reviewId: string,
	): Promise<PromotionReviewChanges> {
		return await this.changes.getChanges(reviewId);
	}

	@Post('/:reviewId/changes/details')
	@GlobalScope('promotions:readReviews')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	async getDetails(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('reviewId') reviewId: string,
		@Body body: PromotionReviewDetailsRequestDto,
	): Promise<PromotionResourceDetails> {
		return await this.changes.getDetails(req.user, reviewId, body);
	}
}
