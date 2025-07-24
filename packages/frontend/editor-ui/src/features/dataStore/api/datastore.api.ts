// import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { MOCKED_DATASTORES } from './mocks/datastores.mock';

export const fetchDataStores = async (context: IRestApiContext, projectId?: string) => {
	await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay
	if (projectId) {
		return MOCKED_DATASTORES.filter((store) => store.projectId === projectId);
	}
	return MOCKED_DATASTORES;
};
