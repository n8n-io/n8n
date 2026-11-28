import {
	ApprovePromotionReviewDto,
	PromotionReviewDetailsRequestDto,
	type InboxPromotionReviewItem,
	type PromotionResourceDetails,
	type PromotionReviewChanges,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, Param, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PromotionReviewChangesService } from './promotion-review-changes.service';
import { PromotionReviewInboxService } from './promotion-review-inbox.service';

/**
 * No route has a scope decorator. The services check the role of the user for each review,
 * because `@ProjectScope` cannot resolve a review id and a review of the whole instance has no project.
 */
@RestController('/promotions/reviews')
export class PromotionReviewsController {
	constructor(
		private readonly reviews: PromotionReviewInboxService,
		private readonly changes: PromotionReviewChangesService,
	) {}

	@Post('/:reviewId/approve')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	async approve(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('reviewId') reviewId: string,
		@Body body: ApprovePromotionReviewDto,
	): Promise<InboxPromotionReviewItem> {
		return await this.reviews.approve(req.user, reviewId, body);
	}

	@Post('/:reviewId/close')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	async close(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('reviewId') reviewId: string,
	): Promise<InboxPromotionReviewItem> {
		return await this.reviews.close(req.user, reviewId);
	}

	@Get('/:reviewId/changes')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	async getChanges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('reviewId') reviewId: string,
	): Promise<PromotionReviewChanges> {
		return await this.changes.getChanges(req.user, reviewId);
	}

	@Post('/:reviewId/changes/details')
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
