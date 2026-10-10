import type {
	PromotePackageResultDto,
	PromoteSelectionRequestDto,
	PromotionChanges,
	PromotionDirection,
} from '@n8n/api-types';
import type { IRestApiContext, PublicApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest, request } from '@n8n/rest-api-client';

export async function getPromotableChanges(
	context: IRestApiContext,
	projectId: string,
	direction: PromotionDirection = 'promote',
): Promise<PromotionChanges> {
	return await makeRestApiRequest(context, 'GET', `/promotions/${projectId}/changes/${direction}`);
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
