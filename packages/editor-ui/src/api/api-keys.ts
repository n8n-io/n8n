import {IRestApiContext} from "@/Interface";
import {makeRestApiRequest} from "@/api/helpers";

export async function getApiKey(context: IRestApiContext): Promise<{ apiKey: string | null }> {
	return makeRestApiRequest(context, 'GET', '/me/api-key');
}

export async function createApiKey(context: IRestApiContext): Promise<{ apiKey: string | null }> {
	return makeRestApiRequest(context, 'POST', '/me/api-key');
}

export async function deleteApiKey(context: IRestApiContext): Promise<{ success: boolean }> {
	return makeRestApiRequest(context, 'DELETE', '/me/api-key');
}
