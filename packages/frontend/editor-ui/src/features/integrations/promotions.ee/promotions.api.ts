import type {
	ApplyCheckResult,
	PromotePackageResultDto,
	PromoteSelectionRequestDto,
	PromotionDirection,
	PromotionPreview,
	PromotionResourceDetails,
	PromotionResourceDetailsRequestDto,
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

/** The Apply blockers of every workflow in the project, at the commit of the Apply preview. */
export async function getApplyBlockers(
	context: IRestApiContext,
	projectId: string,
	commitSha: string,
): Promise<ApplyCheckResult> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/promotions/${projectId}/changes/apply/blockers`,
		{
			commitSha,
		},
	);
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
