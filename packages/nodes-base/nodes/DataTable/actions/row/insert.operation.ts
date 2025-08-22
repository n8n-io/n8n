import {
	type IDisplayOptions,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { COLUMNS } from '../../common/fields';
import { getDataStoreProxyExecute } from '../../common/utils';

export const FIELD: string = 'insert';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: [FIELD],
	},
};

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

	const dataStoreProxy = await getDataStoreProxyExecute(this, index);
	const dataMode = this.getNodeParameter('columns.mappingMode', index) as string;

	let data: IDataObject;

	if (dataMode === 'autoMapInputData') {
		data = items[index].json;
	} else {
		const fields = this.getNodeParameter('columns.value', index, {}) as IDataObject;

		data = fields;
	}

	const insertedRowIds = (await dataStoreProxy.insertRows([data as never])) as never as number[];
	return insertedRowIds.map((x) => ({ json: { id: x } }));
}
