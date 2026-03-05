import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { DATA_TABLE_ID_FIELD } from '../../common/fields';
import { getDataTableProxyExecute } from '../../common/utils';

export const FIELD = 'delete';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['table'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName:
			'This will permanently delete the data table and all its data. This action cannot be undone.',
		name: 'deleteWarning',
		type: 'notice',
		default: '',
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const dataTableId = this.getNodeParameter(DATA_TABLE_ID_FIELD, index, undefined, {
		extractValue: true,
	}) as string;

	const dataTableProxy = await getDataTableProxyExecute(this, index);

	const success = await dataTableProxy.deleteDataTable();

	return [{ json: { success, deletedTableId: dataTableId } }];
}
