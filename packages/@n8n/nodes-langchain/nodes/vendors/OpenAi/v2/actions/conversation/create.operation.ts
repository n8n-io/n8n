import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { isObjectEmpty, jsonParse, updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../../transport';
import { metadataProperty, textMessageProperties } from '../descriptions';
import { formatInputMessages } from '../text/helpers/responses';

const properties: INodeProperties[] = [
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		placeholder: 'Add Message',
		default: { values: [{ type: 'text' }] },
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						description:
							"Role in shaping the model's response, it tells the model how it should behave and interact with the user",
						options: [
							{
								name: 'User',
								value: 'user',
								description: 'Send a message as a user and get a response from the model',
							},
							{
								name: 'Assistant',
								value: 'assistant',
								description: 'Tell the model to adopt a specific tone or personality',
							},
							{
								name: 'System',
								value: 'system',
								description:
									"Usually used to set the model's behavior or context for the next user message",
							},
						],
						default: 'user',
					},
					{
						...textMessageProperties[0],
						displayOptions: {},
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [metadataProperty],
	},
];

const displayOptions = {
	show: {
		operation: ['create'],
		resource: ['conversation'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const messages = this.getNodeParameter('messages.values', i, []) as IDataObject[];

	const body: IDataObject = {
		items: await formatInputMessages.call(this, i, messages),
	};

	if (options.metadata) {
		const metadata = jsonParse(options.metadata as string, {
			errorMessage: 'Invalid JSON in metadata field',
		}) as IDataObject;
		if (!isObjectEmpty(metadata)) {
			body.metadata = metadata;
		}
	}

	const response = await apiRequest.call(this, 'POST', '/conversations', { body });

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
