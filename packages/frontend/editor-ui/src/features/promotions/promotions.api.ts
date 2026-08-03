import type {
	PromotionModelDescription,
	PromotionsConfigView,
	PromotionSummary,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export type CreatePromotionPayload = {
	model: string;
	unitOfWork?: { type: string; id: string };
	options: Record<string, unknown>;
};

export async function fetchPromotions(context: IRestApiContext): Promise<PromotionSummary[]> {
	return await makeRestApiRequest(context, 'GET', '/promotions');
}

export async function fetchPromotion(
	context: IRestApiContext,
	promotionId: string,
): Promise<PromotionSummary> {
	return await makeRestApiRequest(context, 'GET', `/promotions/${promotionId}`);
}

export async function fetchPromotionModels(
	context: IRestApiContext,
): Promise<PromotionModelDescription[]> {
	return await makeRestApiRequest(context, 'GET', '/promotions/models');
}

export async function fetchPromotionsConfig(
	context: IRestApiContext,
): Promise<PromotionsConfigView> {
	return await makeRestApiRequest(context, 'GET', '/promotions/config');
}

export async function createPromotion(
	context: IRestApiContext,
	payload: CreatePromotionPayload,
): Promise<PromotionSummary> {
	return await makeRestApiRequest(context, 'POST', '/promotions', { ...payload });
}

export async function executePromotionAction(
	context: IRestApiContext,
	promotionId: string,
	action: string,
	payload?: Record<string, unknown>,
): Promise<PromotionSummary> {
	return await makeRestApiRequest(context, 'POST', `/promotions/${promotionId}/actions/${action}`, {
		payload,
	});
}

export async function syncPromotion(
	context: IRestApiContext,
	promotionId: string,
): Promise<PromotionSummary> {
	return await makeRestApiRequest(context, 'POST', `/promotions/${promotionId}/sync`);
}
