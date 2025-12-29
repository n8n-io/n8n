import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { Content, Part } from '../../helpers/interfaces';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC('modelSearch'),
	{
		displayName: 'TTL (Seconds)',
		name: 'ttl',
		type: 'number',
		default: 600,
		description: 'The number of seconds the cache should live',
		required: true,
	},
	{
		displayName: 'Initial Messages',
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
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Text',
								value: 'text',
							},
							{
								name: 'File',
								value: 'file',
							},
						],
						default: 'text',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						description: 'The content of the message',
						default: '',
						placeholder: 'e.g. Hello, world!',
						typeOptions: {
							rows: 2,
						},
						displayOptions: {
							show: {
								type: ['text'],
							},
						},
					},
					{
						displayName: 'File URI',
						name: 'fileUri',
						type: 'string',
						description: 'The URI of the file stored in Google GenAI Files API',
						default: '',
						placeholder: 'https://generativelanguage.googleapis.com/v1beta/files/...',
						displayOptions: {
							show: {
								type: ['file'],
							},
						},
					},
					{
						displayName: 'Mime Type',
						name: 'mimeType',
						type: 'string',
						description: 'The MIME type of the file',
						default: '',
						placeholder: 'e.g. image/png',
						displayOptions: {
							show: {
								type: ['file'],
							},
						},
					},
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						description: 'Role of the message sender',
						options: [
							{
								name: 'User',
								value: 'user',
							},
							{
								name: 'Model',
								value: 'model',
							},
						],
						default: 'user',
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
		options: [
			{
				displayName: 'System Instruction',
				name: 'systemInstruction',
				type: 'string',
				default: '',
				placeholder: 'e.g. You are a coding assistant',
				description: 'Instructions that apply to the entire cached session',
			},
			{
				displayName: 'Display Name',
				name: 'displayName',
				type: 'string',
				default: '',
				description: 'User-friendly name for the cache',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['create'],
		resource: ['cache'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const ttlSeconds = this.getNodeParameter('ttl', i, 600) as number;
	const messages = this.getNodeParameter('messages.values', i, []) as Array<{
		type: string;
		content: string;
		fileUri: string;
		mimeType: string;
		role: string;
	}>;
	const options = this.getNodeParameter('options', i, {});

	const contents: Content[] = messages.map((m) => {
		const parts: Part[] = [];
		if (m.type === 'file') {
			parts.push({
				fileData: {
					fileUri: m.fileUri,
					mimeType: m.mimeType,
				},
			});
		} else {
			parts.push({ text: m.content });
		}
		return {
			parts,
			role: m.role,
		};
	});

	const body: any = {
		model,
		contents,
		ttl: `${ttlSeconds}s`,
	};

	if (options.systemInstruction) {
		body.systemInstruction = {
			parts: [{ text: options.systemInstruction as string }],
		};
	}

	if (options.displayName) {
		body.displayName = options.displayName as string;
	}

	const response = await apiRequest.call(this, 'POST', '/v1beta/cachedContents', {
		body,
	});

	return [
		{
			json: { ...response },
			pairedItem: { item: i },
		},
	];
}
