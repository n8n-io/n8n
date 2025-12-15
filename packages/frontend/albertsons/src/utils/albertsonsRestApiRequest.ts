import { makeRestApiRequest, ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const API_BASE_URL = import.meta.env.ALBERTSONS_API_BASE_URL ?? 'http://localhost:8000/api';

export async function albertsonsRestApiRequest<T = any>(
	method: HttpMethod,
	endpoint: string,
	body?: any,
): Promise<T> {
	const rootStore = useRootStore();

	try {
		const customContext = { ...rootStore.restApiContext, baseUrl: API_BASE_URL };
		return await makeRestApiRequest<T>(customContext, method, endpoint, body);
	} catch (error) {
		if (error instanceof ResponseError) {
			// optional: centralize error handling
			throw error;
		}
		throw error;
	}
}
