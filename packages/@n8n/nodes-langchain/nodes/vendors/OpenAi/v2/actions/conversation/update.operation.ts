import type {
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { updateDisplayOptions, jsonParse } from 'n8n-workflow';

import { apiRequest } from '../../../transport';
import { metadataProperty } from '../descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		default: '',
		placeholder: 'conv_1234567890',
		description: 'The ID of the conversation to update',
		required: true,
	},
	{ ...metadataProperty, required: true },
];

const displayOptions = {
	show: {
		operation: ['update'],
		resource: ['conversation'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const conversationId = this.getNodeParameter('conversationId', i, '') as string;
	const metadata = this.getNodeParameter('metadata', i, '') as string;

	if (!conversationId) {
		throw new Error('Conversation ID is required');
	}

	if (!metadata) {
		throw new Error('Metadata is required');
	}

	const body: IDataObject = {};

	body.metadata = jsonParse(metadata, {
		errorMessage: 'Invalid JSON in metadata field',
	});

	const response = await apiRequest.call(this, 'POST', `/conversations/${conversationId}`, {
		body,
	});

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
