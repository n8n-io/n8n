import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type {
	DataTableColumnCreatePayload,
	DataTable,
	DataTableColumn,
	DataTableRow,
} from '@/features/core/dataTable/dataTable.types';
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
	fileId?: string,
	hasHeaders: boolean = true,
) => {
	return await makeRestApiRequest<DataTable>(
		context,
		'POST',
		`/projects/${projectId}/data-tables`,
		{
			name,
			columns: columns ?? [],
			hasHeaders,
			...(fileId ? { fileId } : {}),
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
		search?: string;
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

export const uploadCsvFileApi = async (
	context: IRestApiContext,
	file: File,
	hasHeaders: boolean = true,
) => {
	const formData = new FormData();
	formData.append('file', file);
	formData.append('hasHeaders', String(hasHeaders));

	return await makeRestApiRequest<{
		originalName: string;
		id: string;
		rowCount: number;
		columnCount: number;
		columns: Array<{ name: string; type: string; compatibleTypes: string[] }>;
	}>(context, 'POST', '/data-tables/uploads', formData);
};
