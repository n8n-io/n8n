import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { QuickConnectOption } from '@n8n/api-types';

type GetQuickConnectApiKeyResponse = {
	apiKey: string;
};

export async function getQuickConnectApiKey(
	context: IRestApiContext,
	{ quickConnectType }: { quickConnectType: QuickConnectOption['quickConnectType'] },
): Promise<GetQuickConnectApiKeyResponse> {
	return await makeRestApiRequest(context, 'POST', '/quick-connect', { quickConnectType });
}
