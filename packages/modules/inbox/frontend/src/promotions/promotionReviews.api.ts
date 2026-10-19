import type { PromotionReviewDetail } from '@n8n/api-types';
import { request, type PublicApiContext } from '@n8n/rest-api-client';

export async function fetchPromotionReview(
	context: PublicApiContext,
	reviewId: string,
): Promise<PromotionReviewDetail> {
	return await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `/promotions/reviews/${encodeURIComponent(reviewId)}`,
	});
}
