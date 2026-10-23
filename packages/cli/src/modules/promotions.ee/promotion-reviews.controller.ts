import { ApprovePromotionReviewDto, type InboxPromotionReviewItem } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Licensed, Param, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PromotionReviewInboxService } from './promotion-review-inbox.service';

@RestController('/promotions/reviews')
export class PromotionReviewsController {
	constructor(private readonly reviews: PromotionReviewInboxService) {}

	@Post('/:reviewId/approve')
	@GlobalScope('gitConnection:approveReviews')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async approve(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('reviewId') reviewId: string,
		@Body body: ApprovePromotionReviewDto,
	): Promise<InboxPromotionReviewItem> {
		return await this.reviews.approve(req.user, reviewId, body);
	}
}
