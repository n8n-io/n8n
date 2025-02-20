import type { IRestApiContext, IN8nPrompts, IN8nPromptResponse } from '../Interface';
import { makeRestApiRequest, get, post } from '@/utils/apiUtils';
import { N8N_IO_BASE_URL, NPM_COMMUNITY_NODE_SEARCH_API_URL } from '@/constants';
import type { FrontendSettings } from '@n8n/api-types';

export async function getSettings(context: IRestApiContext): Promise<FrontendSettings> {
	return await makeRestApiRequest(context, 'GET', '/settings');
}

export async function getPromptsData(instanceId: string, userId: string): Promise<IN8nPrompts> {
	return await get(
		N8N_IO_BASE_URL,
		'/prompts',
		{},
		{ 'n8n-instance-id': instanceId, 'n8n-user-id': userId },
	);
}

export async function submitContactInfo(
	instanceId: string,
	userId: string,
	email: string,
): Promise<IN8nPromptResponse> {
	return await post(
		N8N_IO_BASE_URL,
		'/prompt',
		{ email },
		{ 'n8n-instance-id': instanceId, 'n8n-user-id': userId },
	);
}

export async function getAvailableCommunityPackageCount(): Promise<number> {
	const response = await get(
		NPM_COMMUNITY_NODE_SEARCH_API_URL,
		'search?q=keywords:n8n-community-node-package',
	);

	return response.total || 0;
}
