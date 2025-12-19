import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { Message, PromptResponse } from '../../helpers/interfaces';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		description: 'Messages that constitute the prompt to be improved',
		placeholder: 'Add Message',
		default: { values: [{ content: '', role: 'user' }] },
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Prompt',
						name: 'content',
						type: 'string',
						description: 'The content of the message to be sent',
						default: '',
						placeholder: 'e.g. Concise instructions for a meal prep service',
						typeOptions: {
							rows: 2,
						},
					},
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
						],
						default: 'user',
					},
				],
			},
		],
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'System Message',
				name: 'system',
				type: 'string',
				description: 'The existing system prompt to incorporate, if any',
				default: '',
				placeholder: 'e.g. You are a professional meal prep chef',
			},
			{
				displayName: 'Feedback',
				name: 'feedback',
				type: 'string',
				description: 'Feedback for improving the prompt',
				default: '',
				placeholder: 'e.g. Make it more detailed and include cooking times',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['improve'],
		resource: ['prompt'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const messages = this.getNodeParameter('messages.values', i, []) as Message[];
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {});

	const body = {
		messages,
		system: options.system,
		feedback: options.feedback,
	};
	const response = (await apiRequest.call(this, 'POST', '/v1/experimental/improve_prompt', {
		body,
		enableAnthropicBetas: { promptTools: true },
	})) as PromptResponse;

	if (simplify) {
		return [
			{
				json: {
					messages: response.messages,
					system: response.system,
				},
				pairedItem: { item: i },
			},
		];
	}

	return [
		{
			json: { ...response },
			pairedItem: { item: i },
		},
	];
}
