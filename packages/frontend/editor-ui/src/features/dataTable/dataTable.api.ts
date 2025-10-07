import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type {
	DataTableColumnCreatePayload,
	DataTable,
	DataTableColumn,
	DataTableRow,
} from '@/features/dataTable/dataTable.types';
import type { DataTablesSizeResult } from 'n8n-workflow';

export const fetchDataTablesApi = async (
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
	return await makeRestApiRequest<{ count: number; data: DataTable[] }>(
		context,
		'GET',
		apiEndpoint,
		{
			...options,
			filter: filter ?? undefined,
		},
	);
};

export const createDataTableApi = async (
	context: IRestApiContext,
	name: string,
	projectId: string,
	columns?: DataTableColumnCreatePayload[],
) => {
	return await makeRestApiRequest<DataTable>(
		context,
		'POST',
		`/projects/${projectId}/data-tables`,
		{
			name,
			columns: columns ?? [],
		},
	);
};

export const deleteDataTableApi = async (
	context: IRestApiContext,
	dataTableId: string,
	projectId: string,
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'DELETE',
		`/projects/${projectId}/data-tables/${dataTableId}`,
		{
			dataTableId,
			projectId,
		},
	);
};

export const updateDataTableApi = async (
	context: IRestApiContext,
	dataTableId: string,
	name: string,
	projectId: string,
) => {
	return await makeRestApiRequest<DataTable>(
		context,
		'PATCH',
		`/projects/${projectId}/data-tables/${dataTableId}`,
		{
			name,
		},
	);
};

export const addDataTableColumnApi = async (
	context: IRestApiContext,
	dataTableId: string,
	projectId: string,
	column: DataTableColumnCreatePayload,
) => {
	return await makeRestApiRequest<DataTableColumn>(
		context,
		'POST',
		`/projects/${projectId}/data-tables/${dataTableId}/columns`,
		{
			...column,
		},
	);
};

export const deleteDataTableColumnApi = async (
	context: IRestApiContext,
	dataTableId: string,
	projectId: string,
	columnId: string,
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'DELETE',
		`/projects/${projectId}/data-tables/${dataTableId}/columns/${columnId}`,
	);
};

export const moveDataTableColumnApi = async (
	context: IRestApiContext,
	dataTableId: string,
	projectId: string,
	columnId: string,
	targetIndex: number,
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'PATCH',
		`/projects/${projectId}/data-tables/${dataTableId}/columns/${columnId}/move`,
		{
			targetIndex,
		},
	);
};

export const getDataTableRowsApi = async (
	context: IRestApiContext,
	dataTableId: string,
	projectId: string,
	options?: {
		skip?: number;
		take?: number;
		sortBy?: string;
		filter?: string;
	},
) => {
	return await makeRestApiRequest<{
		count: number;
		data: DataTableRow[];
	}>(context, 'GET', `/projects/${projectId}/data-tables/${dataTableId}/rows`, {
		...(options ?? {}),
	});
};

export const insertDataTableRowApi = async (
	context: IRestApiContext,
	dataTableId: string,
	row: DataTableRow,
	projectId: string,
) => {
	return await makeRestApiRequest<DataTableRow[]>(
		context,
		'POST',
		`/projects/${projectId}/data-tables/${dataTableId}/insert`,
		{
			returnType: 'all',
			data: [row],
		},
	);
};

export const updateDataTableRowsApi = async (
	context: IRestApiContext,
	dataTableId: string,
	rowId: number,
	rowData: DataTableRow,
	projectId: string,
) => {
	return await makeRestApiRequest<boolean>(
		context,
		'PATCH',
		`/projects/${projectId}/data-tables/${dataTableId}/rows`,
		{
			filter: {
				type: 'and',
				filters: [{ columnName: 'id', condition: 'eq', value: rowId }],
			},
			data: rowData,
		},
	);
};

export const deleteDataTableRowsApi = async (
	context: IRestApiContext,
	dataTableId: string,
	rowIds: number[],
	projectId: string,
) => {
	const filters = rowIds.map((id) => ({
		columnName: 'id',
		condition: 'eq',
		value: id,
	}));
	return await makeRestApiRequest<boolean>(
		context,
		'DELETE',
		`/projects/${projectId}/data-tables/${dataTableId}/rows`,
		{
			filter: {
				type: 'or',
				filters,
			},
		},
	);
};

export const fetchDataTableGlobalLimitInBytes = async (context: IRestApiContext) => {
	return await makeRestApiRequest<DataTablesSizeResult>(
		context,
		'GET',
		'/data-tables-global/limits',
	);
};
