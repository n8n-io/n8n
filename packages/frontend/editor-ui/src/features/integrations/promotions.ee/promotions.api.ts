import type {
	PromotePackageResultDto,
	PromoteSelectionRequestDto,
	PromotionDirection,
	PromotionPreview,
	PromotionResourceDetails,
	PromotionResourceDetailsRequestDto,
	PromotionReviewChanges,
	PromotionReviewDetailsRequestDto,
} from '@n8n/api-types';
import type { IRestApiContext, PublicApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest, request } from '@n8n/rest-api-client';

export async function getPromotionPreview(
	context: IRestApiContext,
	projectId: string,
	direction: PromotionDirection,
): Promise<PromotionPreview> {
	return await makeRestApiRequest(context, 'GET', `/promotions/${projectId}/changes/${direction}`);
}

export async function getPromotionResourceDetails(
	context: IRestApiContext,
	projectId: string,
	direction: PromotionDirection,
	payload: PromotionResourceDetailsRequestDto,
): Promise<PromotionResourceDetails> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/promotions/${projectId}/changes/${direction}/details`,
		payload,
	);
}

export async function getPromotionReviewChanges(
	context: IRestApiContext,
	reviewId: string,
): Promise<PromotionReviewChanges> {
	return await makeRestApiRequest(context, 'GET', `/promotions/reviews/${reviewId}/changes`);
}

export async function getPromotionReviewDetails(
	context: IRestApiContext,
	reviewId: string,
	payload: PromotionReviewDetailsRequestDto,
): Promise<PromotionResourceDetails> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/promotions/reviews/${reviewId}/changes/details`,
		payload,
	);
}

export async function promoteProjectSelection(
	context: PublicApiContext,
	projectId: string,
	payload: PromoteSelectionRequestDto,
): Promise<PromotePackageResultDto> {
	return await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `/promotions/projects/${projectId}/promote`,
		data: payload,
	});
}
