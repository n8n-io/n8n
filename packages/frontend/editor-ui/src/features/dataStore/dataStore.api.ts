import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type {
	DataStoreColumnCreatePayload,
	DataStore,
	DataStoreColumn,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';

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
		projectId: string | string[];
	},
) => {
	const apiEndpoint = projectId ? `/projects/${projectId}/data-stores` : '/data-stores-global';
	return await makeRestApiRequest<{ count: number; data: DataStore[] }>(
		context,
		'GET',
		apiEndpoint,
		{
			options: options ?? undefined,
			filter: filter ?? undefined,
		},
	);
};

export const createDataStoreApi = async (
	context: IRestApiContext,
	name: string,
	projectId: string,
	columns?: DataStoreColumnCreatePayload[],
) => {
	return await makeRestApiRequest<DataStore>(
		context,
		'POST',
		`/projects/${projectId}/data-stores`,
		{
			name,
			columns: columns ?? [],
		},
	);
};

export const deleteDataStoreApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	projectId: string,
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
	projectId: string,
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

export const addDataStoreColumnApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	projectId: string,
	column: DataStoreColumnCreatePayload,
) => {
	return await makeRestApiRequest<DataStoreColumn>(
		context,
		'POST',
		`/projects/${projectId}/data-stores/${dataStoreId}/columns`,
		{
			...column,
		},
	);
};

export const deleteDataStoreColumnApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	projectId: string,
	columnId: string,
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'DELETE',
		`/projects/${projectId}/data-stores/${dataStoreId}/columns/${columnId}`,
	);
};

export const moveDataStoreColumnApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	projectId: string,
	columnId: string,
	targetIndex: number,
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'PATCH',
		`/projects/${projectId}/data-stores/${dataStoreId}/columns/${columnId}/move`,
		{
			targetIndex,
		},
	);
};

export const getDataStoreRowsApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	projectId: string,
	options?: {
		skip?: number;
		take?: number;
	},
) => {
	return await makeRestApiRequest<{
		count: number;
		data: DataStoreRow[];
	}>(context, 'GET', `/projects/${projectId}/data-stores/${dataStoreId}/rows`, {
		...(options ?? {}),
	});
};

export const insertDataStoreRowApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	row: DataStoreRow,
	projectId: string,
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'POST',
		`/projects/${projectId}/data-stores/${dataStoreId}/insert`,
		{
			data: [row],
		},
	);
};

export const upsertDataStoreRowsApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	rows: DataStoreRow[],
	projectId: string,
	matchFields: string[] = ['id'],
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'POST',
		`/projects/${projectId}/data-stores/${dataStoreId}/upsert`,
		{
			rows,
			matchFields,
		},
	);
};
