import type {
	IDataStoreProjectService,
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { getAddRow, makeAddRow } from '../../common/addRow';
import { getDataTableProxyExecute } from '../../common/utils';

export const FIELD: string = 'insert';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [makeAddRow(FIELD, displayOptions)];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const dataStoreProxy = await getDataTableProxyExecute(this, index);

	const row = getAddRow(this, index);

	const insertedRows = await dataStoreProxy.insertRows([row]);
	return insertedRows.map((json) => ({ json }));
}

export async function executeBulk(
	this: IExecuteFunctions,
	proxy: IDataStoreProjectService,
): Promise<INodeExecutionData[]> {
	const rows = this.getInputData().flatMap((_, i) => [getAddRow(this, i)]);

	const insertedRows = await proxy.insertRows(rows);
	return insertedRows.map((json, item) => ({ json, pairedItem: { item } }));
}
