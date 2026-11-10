import type {
	ApprovePromotionReviewDto,
	InboxPromotionReviewItem,
	PromotionReviewChanges,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export async function getPromotionReviewChanges(
	context: IRestApiContext,
	reviewId: string,
): Promise<PromotionReviewChanges> {
	return await makeRestApiRequest<PromotionReviewChanges>(
		context,
		'GET',
		`/promotions/reviews/${encodeURIComponent(reviewId)}/changes`,
	);
}

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
