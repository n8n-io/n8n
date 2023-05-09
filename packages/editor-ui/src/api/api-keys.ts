import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';

export function getApiKey(context: IRestApiContext): Promise<{ apiKey: string | null }> {
	return makeRestApiRequest(context, 'GET', '/me/api-key');
}

export function createApiKey(context: IRestApiContext): Promise<{ apiKey: string | null }> {
	return makeRestApiRequest(context, 'POST', '/me/api-key');
}

export function deleteApiKey(context: IRestApiContext): Promise<{ success: boolean }> {
	return makeRestApiRequest(context, 'DELETE', '/me/api-key');
}
