import {
	type IDisplayOptions,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { COLUMNS } from '../../common/fields';
import { getDataStoreProxy } from '../../common/utils';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: ['insert'],
	},
};

export const FIELD: string = 'insert';

export const description: INodeProperties[] = [
	{
		...COLUMNS,
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();

	const dataStoreProxy = await getDataStoreProxy(this, index);
	const dataMode = this.getNodeParameter('columns.mappingMode', index) as string;

	let data: IDataObject;

	if (dataMode === 'autoMapInputData') {
		data = items[index].json;
	} else {
		const fields = this.getNodeParameter('columns.value', index, {}) as IDataObject;

		data = fields;
	}
	// Todo: insertRows should return the inserted rows including the id
	const success = await dataStoreProxy.insertRows([data as never]);

	if (!success) {
		throw new NodeOperationError(this.getNode(), 'Failed to insert record into data store');
	}

	return [{ json: data }];
}
