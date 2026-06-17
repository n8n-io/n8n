import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { getDataTableProxyExecute } from '../../common/utils';

export const FIELD = 'update';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['table'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'New Name',
		name: 'newName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Renamed Data Table',
		description: 'The new name for the data table',
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const newName = this.getNodeParameter('newName', index) as string;

	const dataTableProxy = await getDataTableProxyExecute(this, index);

	const success = await dataTableProxy.updateDataTable({ name: newName });

	return [{ json: { success, name: newName } }];
}
