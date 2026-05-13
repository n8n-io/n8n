import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { getBoardProxyExecute } from '../../common/utils';

export const FIELD = 'deleteItem';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['item'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the item to delete',
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getBoardProxyExecute(this, index);

	const itemId = this.getNodeParameter('itemId', index) as string;
	const result = await proxy.deleteItem(itemId);

	return result.map((json) => ({ json }));
}
