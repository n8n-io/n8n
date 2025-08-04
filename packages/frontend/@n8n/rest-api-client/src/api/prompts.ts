import { N8N_IO_BASE_URL } from '@n8n/constants';

import { get, post } from '../utils';

export interface N8nPrompts {
	message?: string;
	title?: string;
	showContactPrompt?: boolean;
}

export interface N8nPromptResponse {
	updated: boolean;
}

export async function getPromptsData(instanceId: string, userId: string): Promise<N8nPrompts> {
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
): Promise<N8nPromptResponse> {
	return await post(
		N8N_IO_BASE_URL,
		'/prompt',
		{ email },
		{ 'n8n-instance-id': instanceId, 'n8n-user-id': userId },
	);
}
