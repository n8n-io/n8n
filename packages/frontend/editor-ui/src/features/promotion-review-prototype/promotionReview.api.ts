import type {
	PromotionReviewPlanRequestDto,
	PromotionReviewPlanResponse,
	PromotionReviewSummary,
	PromotionTargetCredential,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export async function fetchPendingPromotions(
	context: IRestApiContext,
): Promise<PromotionReviewSummary[]> {
	return await makeRestApiRequest(context, 'GET', '/promotion-review-prototype/pending');
}

export async function fetchUsableCredentials(
	context: IRestApiContext,
	projectId: string,
	credentialType?: string,
): Promise<PromotionTargetCredential[]> {
	const params = new URLSearchParams({ projectId });
	if (credentialType) {
		params.set('type', credentialType);
	}
	return await makeRestApiRequest(
		context,
		'GET',
		`/promotion-review-prototype/credentials?${params.toString()}`,
	);
}

export async function planPromotion(
	context: IRestApiContext,
	promotionId: string,
	body: PromotionReviewPlanRequestDto = {},
): Promise<PromotionReviewPlanResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/promotion-review-prototype/${promotionId}/plan`,
		body,
	);
}

export async function approvePromotion(
	context: IRestApiContext,
	promotionId: string,
	body: PromotionReviewPlanRequestDto,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/promotion-review-prototype/${promotionId}/approve`,
		body,
	);
}

export async function rejectPromotion(
	context: IRestApiContext,
	promotionId: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/promotion-review-prototype/${promotionId}/reject`,
	);
}
