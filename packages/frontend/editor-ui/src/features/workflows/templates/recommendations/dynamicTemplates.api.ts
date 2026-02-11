import type { IRestApiContext, ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export interface DynamicTemplatesResponse {
	templates: Array<{ workflow: ITemplatesWorkflowFull }>;
}

export async function getDynamicRecommendedTemplates(
	ctx: IRestApiContext,
): Promise<DynamicTemplatesResponse> {
	return await makeRestApiRequest(ctx, 'GET', '/dynamic-templates');
}
