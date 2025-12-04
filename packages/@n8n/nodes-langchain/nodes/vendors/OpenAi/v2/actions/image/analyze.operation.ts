import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { ResponseInputImage } from 'openai/resources/responses/responses';
import type { ChatContent, ChatResponse, ChatResponseRequest } from '../../../helpers/interfaces';
import { apiRequest } from '../../../transport';
import { modelRLC } from '../descriptions';
import { getBinaryDataFile } from '../../../helpers/binary-data';

const properties: INodeProperties[] = [
	{
		...modelRLC('imageModelSearch'),
	},
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
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		default: 'url',
		options: [
			{
				name: 'Image URL(s)',
				value: 'url',
			},
			{
				name: 'Binary File(s)',
				value: 'base64',
			},
		],
	},
	{
		displayName: 'URL(s)',
		name: 'imageUrls',
		type: 'string',
		placeholder: 'e.g. https://example.com/image.jpeg',
		description: 'URL(s) of the image(s) to analyze, multiple URLs can be added separated by comma',
		default: '',
		displayOptions: {
			show: {
				inputType: ['url'],
			},
		},
	},
	{
		displayName: 'Input Data Field Name',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
		description: 'Name of the binary property which contains the image(s)',
		displayOptions: {
			show: {
				inputType: ['base64'],
			},
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to simplify the response or not',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Detail',
				name: 'detail',
				type: 'options',
				default: 'auto',
				options: [
					{
						name: 'Auto',
						value: 'auto',
						description:
							'Model will look at the image input size and decide if it should use the low or high setting',
					},
					{
						name: 'Low',
						value: 'low',
						description: 'Return faster responses and consume fewer tokens',
					},
					{
						name: 'High',
						value: 'high',
						description: 'Return more detailed responses, consumes more tokens',
					},
				],
			},
			{
				displayName: 'Length of Description (Max Tokens)',
				description: 'Fewer tokens will result in shorter, less detailed image description',
				name: 'maxTokens',
				type: 'number',
				default: 300,
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
	const model = this.getNodeParameter('modelId', i, 'gpt-4o', { extractValue: true }) as string;

	const text = this.getNodeParameter('text', i, '') as string;
	const inputType = this.getNodeParameter('inputType', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const content: ChatContent = [
		{
			type: 'input_text',
			text,
		},
	];

	const detail = (options.detail as ResponseInputImage['detail']) || ('auto' as const);

	if (inputType === 'url') {
		const imageUrls = (this.getNodeParameter('imageUrls', i) as string)
			.split(',')
			.map((url) => url.trim());

		for (const url of imageUrls) {
			content.push({
				type: 'input_image',
				detail,
				image_url: url,
			});
		}
	} else {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i)
			.split(',')
			.map((propertyName) => propertyName.trim());

		for (const propertyName of binaryPropertyName) {
			const { fileContent, contentType } = await getBinaryDataFile(this, i, propertyName);
			const buffer = await this.helpers.binaryToBuffer(fileContent);
			const fileBase64 = buffer.toString('base64');

			content.push({
				type: 'input_image',
				detail,
				image_url: `data:${contentType};base64,${fileBase64}`,
			});
		}
	}

	const body: ChatResponseRequest = {
		model,
		input: [
			{
				role: 'user',
				content,
			},
		],
		max_output_tokens: (options.maxTokens as number) || 300,
	};

	const response = (await apiRequest.call(this, 'POST', '/responses', {
		body,
	})) as ChatResponse;

	const simplify = this.getNodeParameter('simplify', i) as boolean;

	if (simplify) {
		return [
			{
				json: response.output as unknown as IDataObject,
				pairedItem: { item: i },
			},
		];
	}

	return [
		{
			json: response as unknown as IDataObject,
			pairedItem: { item: i },
		},
	];
}
