import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import { type DataStoreEntity } from '@/features/dataStore/datastore.types';

export const fetchDataStoresApi = async (
	context: IRestApiContext,
	projectId?: string,
	options?: {
		skip?: number;
		take?: number;
	},
) => {
	const apiEndpoint = projectId ? `/projects/${projectId}/data-stores` : '/data-stores-global';
	return await makeRestApiRequest<{ count: number; data: DataStoreEntity[] }>(
		context,
		'GET',
		apiEndpoint,
		{
			...options,
		},
	);
};

export const createDataStoreApi = async (
	context: IRestApiContext,
	name: string,
	projectId?: string,
) => {
	return await makeRestApiRequest<DataStoreEntity>(
		context,
		'POST',
		`/projects/${projectId}/data-stores`,
		{
			name,
			columns: [],
		},
	);
};

export const deleteDataStoreApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	projectId?: string,
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'DELETE',
		`/projects/${projectId}/data-stores/${dataStoreId}`,
		{
			dataStoreId,
			projectId,
		},
	);
};

export const updateDataStoreApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	name: string,
	projectId?: string,
) => {
	return await makeRestApiRequest<DataStoreEntity>(
		context,
		'PATCH',
		`/projects/${projectId}/data-stores/${dataStoreId}`,
		{
			name,
		},
	);
};
