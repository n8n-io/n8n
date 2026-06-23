import type {
	PromotionMarkForDeploymentRequestDto,
	PromotionMarkForDeploymentResult,
	PromotionProducibleWorkflow,
	PromotionReviewPlanRequestDto,
	PromotionReviewPlanResponse,
	PromotionReviewSummary,
	PromotionSourceConnection,
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

export async function fetchProducibleWorkflows(
	context: IRestApiContext,
): Promise<PromotionProducibleWorkflow[]> {
	return await makeRestApiRequest(
		context,
		'GET',
		'/promotion-review-prototype/producing/workflows',
	);
}

export async function markForDeployment(
	context: IRestApiContext,
	body: PromotionMarkForDeploymentRequestDto,
): Promise<PromotionMarkForDeploymentResult> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/promotion-review-prototype/producing/deployables',
		{
			workflowIds: body.workflowIds.map(String),
			targetEnv: body.targetEnv.trim(),
			...(body.title ? { title: body.title } : {}),
		},
	);
}

export async function fetchSourceConnections(
	context: IRestApiContext,
): Promise<PromotionSourceConnection[]> {
	return await makeRestApiRequest(
		context,
		'GET',
		'/promotion-review-prototype/consuming/source-connections',
	);
}

export async function addSourceConnection(
	context: IRestApiContext,
	body: { name: string; baseUrl: string; apiKey: string },
): Promise<PromotionSourceConnection> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/promotion-review-prototype/consuming/source-connections',
		body,
	);
}

export async function deleteSourceConnection(
	context: IRestApiContext,
	id: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(
		context,
		'DELETE',
		`/promotion-review-prototype/consuming/source-connections/${id}`,
	);
}
