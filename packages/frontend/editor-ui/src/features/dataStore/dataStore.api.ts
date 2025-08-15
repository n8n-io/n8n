import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import { type DataStore } from '@/features/dataStore/datastore.types';

export const fetchDataStoresApi = async (
	context: IRestApiContext,
	projectId: string,
	options?: {
		skip?: number;
		take?: number;
	},
	filter?: {
		id?: string | string[];
		name?: string | string[];
		projectId?: string | string[];
	},
) => {
	const apiEndpoint = projectId ? `/projects/${projectId}/data-stores` : '/data-stores-global';
	return await makeRestApiRequest<{ count: number; data: DataStore[] }>(
		context,
		'GET',
		apiEndpoint,
		{
			...options,
			...(filter ?? {}),
		},
	);
};

export const createDataStoreApi = async (
	context: IRestApiContext,
	name: string,
	projectId?: string,
) => {
	return await makeRestApiRequest<DataStore>(
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
	return await makeRestApiRequest<DataStore>(
		context,
		'PATCH',
		`/projects/${projectId}/data-stores/${dataStoreId}`,
		{
			name,
		},
	);
};
