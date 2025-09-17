import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type {
	DataStoreColumnCreatePayload,
	DataStore,
	DataStoreColumn,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';
import type { DataTablesSizeResult } from 'n8n-workflow';

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
	const apiEndpoint = projectId ? `/projects/${projectId}/data-tables` : '/data-tables-global';
	return await makeRestApiRequest<{ count: number; data: DataStore[] }>(
		context,
		'GET',
		apiEndpoint,
		{
			...options,
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
		`/projects/${projectId}/data-tables`,
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
		`/projects/${projectId}/data-tables/${dataStoreId}`,
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
		`/projects/${projectId}/data-tables/${dataStoreId}`,
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
		`/projects/${projectId}/data-tables/${dataStoreId}/columns`,
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
		`/projects/${projectId}/data-tables/${dataStoreId}/columns/${columnId}`,
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
		`/projects/${projectId}/data-tables/${dataStoreId}/columns/${columnId}/move`,
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
		sortBy?: string;
	},
) => {
	return await makeRestApiRequest<{
		count: number;
		data: DataStoreRow[];
	}>(context, 'GET', `/projects/${projectId}/data-tables/${dataStoreId}/rows`, {
		...(options ?? {}),
	});
};

export const insertDataStoreRowApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	row: DataStoreRow,
	projectId: string,
) => {
	return await makeRestApiRequest<DataStoreRow[]>(
		context,
		'POST',
		`/projects/${projectId}/data-tables/${dataStoreId}/insert`,
		{
			returnType: 'all',
			data: [row],
		},
	);
};

export const updateDataStoreRowsApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	rowId: number,
	rowData: DataStoreRow,
	projectId: string,
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'PATCH',
		`/projects/${projectId}/data-tables/${dataStoreId}/rows`,
		{
			filter: {
				type: 'and',
				filters: [{ columnName: 'id', condition: 'eq', value: rowId }],
			},
			data: rowData,
		},
	);
};

export const deleteDataStoreRowsApi = async (
	context: IRestApiContext,
	dataStoreId: string,
	rowIds: number[],
	projectId: string,
) => {
	const filters = rowIds.map((id) => ({ columnName: 'id', condition: 'eq', value: id }));
	return await makeRestApiRequest<boolean>(
		context,
		'DELETE',
		`/projects/${projectId}/data-tables/${dataStoreId}/rows`,
		{
			filter: {
				type: 'or',
				filters,
			},
		},
	);
};

export const fetchDataStoreGlobalLimitInBytes = async (context: IRestApiContext) => {
	return await makeRestApiRequest<DataTablesSizeResult>(
		context,
		'GET',
		'/data-tables-global/limits',
	);
};
