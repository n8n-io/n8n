import type { IRestApiContext, ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export interface DynamicTemplatesResponse {
	templates: Array<{ workflow: ITemplatesWorkflowFull }>;
}

export interface DynamicTemplatesParams {
	selectedApps?: string[];
	cloudInformation?: Record<string, string | string[]>;
}

export async function getDynamicRecommendedTemplates(
	ctx: IRestApiContext,
	params?: DynamicTemplatesParams,
): Promise<DynamicTemplatesResponse> {
	const queryParams = new URLSearchParams();

	if (params?.selectedApps?.length) {
		queryParams.append('selectedApps', JSON.stringify(params.selectedApps));
	}

	if (params?.cloudInformation && Object.keys(params.cloudInformation).length > 0) {
		queryParams.append('cloudInformation', JSON.stringify(params.cloudInformation));
	}

	const queryString = queryParams.toString();
	const endpoint = queryString ? `/dynamic-templates?${queryString}` : '/dynamic-templates';

	return await makeRestApiRequest(ctx, 'GET', endpoint);
}
