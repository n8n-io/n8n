// import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { MOCKED_DATASTORES } from './mocks/datastores.mock';

export const fetchDataStores = async (
	context: IRestApiContext,
	projectId?: string,
	options?: {
		page?: number;
		pageSize?: number;
	},
) => {
	await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
	let stores = MOCKED_DATASTORES;
	if (projectId) {
		stores = MOCKED_DATASTORES.filter((store) => store.projectId === projectId);
	}
	if (options?.page && options?.pageSize) {
		const start = (options.page - 1) * options.pageSize;
		const end = start + options.pageSize;
		return {
			count: stores.length,
			data: stores.slice(start, end),
		};
	}
	if (options?.pageSize) {
		return {
			count: stores.length,
			data: stores.slice(0, options.pageSize),
		};
	}
	return { count: MOCKED_DATASTORES.length, data: stores };
};
