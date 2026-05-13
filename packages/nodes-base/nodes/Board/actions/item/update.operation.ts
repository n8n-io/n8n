import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getBoardProxyExecute } from '../../common/utils';

export const FIELD = 'update';

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
		description: 'The ID of the item to update',
		displayOptions,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions,
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New name for the item',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Status',
				name: 'status',
				type: 'options',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description: 'Move item to this status',
				typeOptions: {
					loadOptionsDependsOn: ['boardId.value'],
					loadOptionsMethod: 'getBoardStatuses',
				},
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'New description for the item',
				typeOptions: {
					rows: 3,
				},
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getBoardProxyExecute(this, index);

	const itemId = this.getNodeParameter('itemId', index) as string;
	const updateFields = this.getNodeParameter('updateFields', index, {}) as {
		name?: string;
		status?: string;
		description?: string;
	};

	if (Object.keys(updateFields).length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one update field must be specified');
	}

	const result = await proxy.updateItem(itemId, updateFields);

	return result.map((json) => ({ json }));
}
