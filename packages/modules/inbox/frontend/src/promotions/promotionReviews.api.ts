import type { ApprovePromotionReviewDto, InboxPromotionReviewItem } from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export async function approvePromotionReview(
	context: IRestApiContext,
	reviewId: string,
	payload: ApprovePromotionReviewDto,
): Promise<InboxPromotionReviewItem> {
	return await makeRestApiRequest<InboxPromotionReviewItem>(
		context,
		'POST',
		`/promotions/reviews/${encodeURIComponent(reviewId)}/approve`,
		{ ...payload },
	);
}
