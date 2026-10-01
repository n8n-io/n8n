import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { ChatCompletionResponse, ContentBlock } from '../../helpers/interfaces';
import { prepareBinaryPropertyList } from '../../helpers/utils';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC,
	{
		displayName: 'Text Input',
		name: 'text',
		type: 'string',
		placeholder: "e.g. What's in this image?",
		default: "What's in this image?",
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Input Data Field Name(s)',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
		description:
			'Name of the binary field(s) which contains the image(s), separate multiple field names with commas',
		typeOptions: {
			binaryDataProperty: true,
		},
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
				displayName: 'Maximum Number of Tokens',
				description: 'Fewer tokens will result in shorter, less detailed image description',
				name: 'maxTokens',
				type: 'number',
				default: 1024,
				typeOptions: {
					minValue: 1,
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['analyze'],
		resource: ['image'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const text = this.getNodeParameter('text', i, '') as string;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {}) as { maxTokens?: number };

	const content: ContentBlock[] = [];
	const binaryPropertyNames = this.getNodeParameter('binaryPropertyName', i, 'data');
	for (const binaryPropertyName of prepareBinaryPropertyList(binaryPropertyNames)) {
		const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
		const base64 = buffer.toString('base64');
		const dataUrl = `data:${binaryData.mimeType};base64,${base64}`;
		content.push({ type: 'image_url', image_url: { url: dataUrl } });
	}

	content.push({ type: 'text', text });

	const body = {
		model,
		max_tokens: options.maxTokens ?? 1024,
		thinking: { type: 'disabled' as const },
		messages: [
			{
				role: 'user',
				content,
			},
		],
	};

	const response = (await apiRequest.call(this, 'POST', '/chat/completions', {
		body,
	})) as ChatCompletionResponse;

	if (simplify) {
		const message = response.choices?.[0]?.message;
		return [
			{
				json: {
					content: message?.content ?? '',
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
