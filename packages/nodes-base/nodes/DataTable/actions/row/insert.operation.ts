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
				description: 'Whether to improve bulk insert performance 5x by not returning inserted data',
			},
		],
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const optimizeBulkEnabled = this.getNodeParameter('options.optimizeBulk', index, false);
	const dataStoreProxy = await getDataTableProxyExecute(this, index);

	const row = getAddRow(this, index);

	if (optimizeBulkEnabled) {
		// This function is always called by index, so we inherently cannot operate in bulk
		this.addExecutionHints({
			message: 'Unable to optimize bulk insert due to expression in Data Table ID ',
			location: 'outputPane',
		});
		const json = await dataStoreProxy.insertRows([row], 'count');
		return [{ json }];
	} else {
		const insertedRows = await dataStoreProxy.insertRows([row], 'all');
		return insertedRows.map((json, item) => ({ json, pairedItem: { item } }));
	}
}

export async function executeBulk(
	this: IExecuteFunctions,
	proxy: IDataStoreProjectService,
): Promise<INodeExecutionData[]> {
	const optimizeBulkEnabled = this.getNodeParameter('options.optimizeBulk', 0, false);
	const rows = this.getInputData().flatMap((_, i) => [getAddRow(this, i)]);

	if (optimizeBulkEnabled) {
		const json = await proxy.insertRows(rows, 'count');
		return [{ json }];
	} else {
		const insertedRows = await proxy.insertRows(rows, 'all');
		return insertedRows.map((json, item) => ({ json, pairedItem: { item } }));
	}
}
