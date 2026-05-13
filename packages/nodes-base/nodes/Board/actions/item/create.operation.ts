import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { getBoardProxyExecute, validateNonEmpty } from '../../common/utils';

export const FIELD = 'create';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['item'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'itemName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Implement feature X',
		description: 'The name of the board item',
		displayOptions,
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Status',
		name: 'itemStatus',
		type: 'options',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'The status column to place this item in',
		typeOptions: {
			loadOptionsDependsOn: ['boardId.value'],
			loadOptionsMethod: 'getBoardStatuses',
		},
		default: '',
		displayOptions,
	},
	{
		displayName: 'Description',
		name: 'itemDescription',
		type: 'string',
		default: '',
		placeholder: 'e.g. Details about this item',
		description: 'Optional description for the board item',
		typeOptions: {
			rows: 3,
		},
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getBoardProxyExecute(this, index);

	const name = validateNonEmpty(
		this.getNodeParameter('itemName', index),
		'Item name',
		this.getNode(),
	);
	const status = this.getNodeParameter('itemStatus', index) as string;
	const description = (this.getNodeParameter('itemDescription', index) as string) || '';

	const result = await proxy.createItem({ name, status, description });

	return result.map((json) => ({ json }));
}
