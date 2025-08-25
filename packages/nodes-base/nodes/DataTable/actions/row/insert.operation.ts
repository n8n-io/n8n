import type {
	IDisplayOptions,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { COLUMNS } from '../../common/fields';
import { dataObjectToApiInput, getDataTableProxyExecute } from '../../common/utils';

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

	const dataStoreProxy = await getDataTableProxyExecute(this, index);
	const dataMode = this.getNodeParameter('columns.mappingMode', index) as string;

	let data: IDataObject;

	if (dataMode === 'autoMapInputData') {
		data = items[index].json;
	} else {
		const fields = this.getNodeParameter('columns.value', index, {}) as IDataObject;

		data = fields;
	}

	const rows = dataObjectToApiInput(data, this.getNode(), index);

	const insertedRowIds = await dataStoreProxy.insertRows([rows]);
	return insertedRowIds.map((x) => ({ json: { id: x } }));
}
