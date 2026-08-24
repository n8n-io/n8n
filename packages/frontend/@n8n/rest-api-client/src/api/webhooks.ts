import type { IHttpRequestMethods } from 'n8n-workflow';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

type WebhookData = {
	workflowId: string;
	webhookPath: string;
	method: IHttpRequestMethods;
	node: string;
};

export type InstanceWebhook = {
	kind: 'webhook' | 'trigger';
	workflowId: string;
	workflowName?: string;
	method?: IHttpRequestMethods;
	path?: string;
	node: string;
	nodeType?: string;
	isActive: boolean;
	project?: {
		name: string;
		type: 'personal' | 'team';
		icon: { type: 'emoji' | 'icon'; value: string } | null;
	};
};

export const findWebhook = async (
	context: IRestApiContext,
	data: { path: string; method: string },
): Promise<WebhookData | null> => {
	return await makeRestApiRequest(context, 'POST', '/webhooks/find', data);
};

export const getInstanceWebhooks = async (context: IRestApiContext): Promise<InstanceWebhook[]> => {
	return await makeRestApiRequest(context, 'GET', '/webhooks');
};
