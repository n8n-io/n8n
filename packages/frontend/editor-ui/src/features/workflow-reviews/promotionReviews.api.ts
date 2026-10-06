import type {
	PromotionReviewDetailDto,
	PromotionReviewListPublicDto,
	PromotionReviewTab,
	PromotionReviewWorkflowDiffDto,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export async function fetchPromotionReviews(
	context: IRestApiContext,
	query: { tab: PromotionReviewTab; skip?: number; take?: number },
): Promise<PromotionReviewListPublicDto> {
	return await makeRestApiRequest<PromotionReviewListPublicDto>(
		context,
		'GET',
		'/promotions/reviews',
		{ ...query },
	);
}

export async function fetchPromotionReviewDetail(
	context: IRestApiContext,
	reviewId: string,
): Promise<PromotionReviewDetailDto> {
	return await makeRestApiRequest<PromotionReviewDetailDto>(
		context,
		'GET',
		`/promotions/reviews/${encodeURIComponent(reviewId)}`,
	);
}

export async function fetchPromotionReviewWorkflowDiff(
	context: IRestApiContext,
	reviewId: string,
	workflowId: string,
): Promise<PromotionReviewWorkflowDiffDto> {
	return await makeRestApiRequest<PromotionReviewWorkflowDiffDto>(
		context,
		'GET',
		`/promotions/reviews/${encodeURIComponent(reviewId)}/workflows/${encodeURIComponent(workflowId)}/diff`,
	);
}

export async function approvePromotionReview(
	context: IRestApiContext,
	reviewId: string,
): Promise<PromotionReviewDetailDto> {
	return await makeRestApiRequest<PromotionReviewDetailDto>(
		context,
		'POST',
		`/promotions/reviews/${encodeURIComponent(reviewId)}/approve`,
	);
}
