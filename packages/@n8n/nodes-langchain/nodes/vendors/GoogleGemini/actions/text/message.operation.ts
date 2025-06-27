import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC('modelSearch'),
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		placeholder: 'Add Message',
		default: { values: [{ content: '' }] },
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Prompt',
						name: 'content',
						type: 'string',
						description: 'The content of the message to be send',
						default: '',
						placeholder: 'e.g. Hello, how can you help me?',
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
								name: 'Model',
								value: 'model',
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
				name: 'systemMessage',
				type: 'string',
				default: '',
				placeholder: 'e.g. You are a helpful assistant',
			},
			// TODO: show only for models that support it?
			{
				displayName: 'Code Execution',
				name: 'codeExecution',
				type: 'boolean',
				default: false,
				description:
					'Whether to allow the model to execute code it generates to produce a response',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['message'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const messages = this.getNodeParameter('messages.values', i, []) as Array<{
		content: string;
		role: string;
	}>;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {});

	const tools: IDataObject[] = [];
	if (options.codeExecution) {
		tools.push({
			code_execution: {},
		});
	}

	const body = {
		tools,
		contents: messages.map((m) => ({
			parts: [{ text: m.content }],
			role: m.role,
		})),
		systemInstruction: options.systemMessage
			? { parts: [{ text: options.systemMessage }] }
			: undefined,
	};

	const response = (await apiRequest.call(this, 'POST', `/v1beta/${model}:generateContent`, {
		body,
	})) as { candidates: IDataObject[] };

	if (simplify) {
		return response.candidates.map((candidate) => ({
			json: candidate,
			pairedItem: { item: i },
		}));
	}

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
