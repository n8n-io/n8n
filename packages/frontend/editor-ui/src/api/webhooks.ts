import { makeRestApiRequest } from '@/utils/apiUtils';
import type { IRestApiContext } from '@/Interface';
import type { IHttpRequestMethods } from 'n8n-workflow';

type WebhookData = {
	workflowId: string;
	webhookPath: string;
	method: IHttpRequestMethods;
	node: string;
};

export const findWebhook = async (
	context: IRestApiContext,
	data: { path: string; method: string },
): Promise<WebhookData | null> => {
	return await makeRestApiRequest(context, 'POST', '/webhooks/find', data);
};
