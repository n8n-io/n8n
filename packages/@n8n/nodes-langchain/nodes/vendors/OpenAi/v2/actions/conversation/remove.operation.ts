import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		default: '',
		placeholder: 'conv_1234567890',
		description: 'The ID of the conversation to delete',
		required: true,
	},
];

const displayOptions = {
	show: {
		operation: ['remove'],
		resource: ['conversation'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const conversationId = this.getNodeParameter('conversationId', i, '') as string;

	const response = await apiRequest.call(this, 'DELETE', `/conversations/${conversationId}`);

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
