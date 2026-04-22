import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		default: '',
		placeholder: 'conv_1234567890',
		description: 'The ID of the conversation to retrieve',
		required: true,
	},
];

const displayOptions = {
	show: {
		operation: ['get'],
		resource: ['conversation'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const conversationId = this.getNodeParameter('conversationId', i, '') as string;

	const response = await apiRequest.call(this, 'GET', `/conversations/${conversationId}`);

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
