import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function getApiKey(context: IRestApiContext): Promise<{ apiKey: string | null }> {
	return await makeRestApiRequest(context, 'GET', '/me/api-key');
}

export async function createApiKey(context: IRestApiContext): Promise<{ apiKey: string | null }> {
	return await makeRestApiRequest(context, 'POST', '/me/api-key');
}

export async function deleteApiKey(context: IRestApiContext): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'DELETE', '/me/api-key');
}
