import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { QueryResult } from './dashboards.types';

export async function runQuery(query: string): Promise<QueryResult> {
	const { restApiContext } = useRootStore();
	return await makeRestApiRequest(restApiContext, 'POST', '/query', { query });
}
