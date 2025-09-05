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

export const description: INodeProperties[] = [
	makeAddRow(FIELD, displayOptions),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Optimize Bulk',
				name: 'optimizeBulk',
				type: 'boolean',
				default: false,
				noDataExpression: true, // bulk inserts don't support expressions so this is a bit paradoxical
				description: 'Whether to improve bulk insert performance by not returning inserted data',
			},
		],
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const returnData = !this.getNodeParameter('options.optimizeBulk', index, false);
	const dataStoreProxy = await getDataTableProxyExecute(this, index);

	const row = getAddRow(this, index);

	const insertedRows = await dataStoreProxy.insertRows([row], returnData);
	return insertedRows.map((json) => ({ json }));
}

export async function executeBulk(
	this: IExecuteFunctions,
	proxy: IDataStoreProjectService,
): Promise<INodeExecutionData[]> {
	const returnData = !this.getNodeParameter('options.optimizeBulk', 0, false);
	const rows = this.getInputData().flatMap((_, i) => [getAddRow(this, i)]);

	const insertedRows = await proxy.insertRows(rows, returnData);
	return insertedRows.map((json, item) => ({ json, pairedItem: { item } }));
}
