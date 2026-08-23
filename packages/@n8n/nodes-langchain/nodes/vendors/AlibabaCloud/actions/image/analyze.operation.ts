import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import { apiRequest } from '../../transport';
import type { IModelStudioRequestBody } from '../../helpers/interfaces';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'modelId',
		type: 'options',
		options: [
			{
				name: 'Qwen-VL Flash',
				value: 'qwen3-vl-flash',
				description: 'Fast vision-language model',
			},
			{
				name: 'Qwen-VL Plus',
				value: 'qwen3-vl-plus',
				description: 'Enhanced vision-language model',
			},
		],
		default: 'qwen3-vl-flash',
		description: 'The model to use for image analysis',
		displayOptions: {
			show: { '@version': [1] },
		},
	},
	{
		...modelRLC('visionModelSearch'),
		displayOptions: {
			show: { '@version': [{ _cnd: { gte: 1.1 } }] },
		},
	},
	{
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		options: [
			{
				name: 'URL',
				value: 'url',
			},
			{
				name: 'Binary Data',
				value: 'binary',
			},
		],
		default: 'url',
		description: 'How to provide the image for analysis',
	},
	{
		displayName: 'Image URL',
		name: 'imageUrl',
		type: 'string',
		default: '',
		description: 'The URL of the image to analyze',
		required: true,
		placeholder: 'https://example.com/image.jpg',
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
		required: true,
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
		displayOptions: {
			show: {
				inputType: ['binary'],
			},
		},
	},
	{
		displayName: 'Question',
		name: 'question',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		description: 'The question or instruction about the image',
		required: true,
		placeholder: 'What is in this image?',
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
		name: 'visionOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
				default: 1,
				description:
					'Controls randomness in the output. Lower values make output more focused and deterministic.',
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 2000,
				description: 'Maximum number of tokens to generate',
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

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const nodeVersion = this.getNode().typeVersion;
	const model =
		nodeVersion >= 1.1
			? (this.getNodeParameter('modelId', itemIndex, '', { extractValue: true }) as string)
			: (this.getNodeParameter('modelId', itemIndex) as string);
	const inputType = this.getNodeParameter('inputType', itemIndex) as string;
	const question = this.getNodeParameter('question', itemIndex) as string;
	const visionOptions = this.getNodeParameter('visionOptions', itemIndex, {}) as Record<
		string,
		unknown
	>;
	const simplify = this.getNodeParameter('simplify', itemIndex, true) as boolean;

	let imageContent: string;
	if (inputType === 'binary') {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
		const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
		const mimeType = binaryData.mimeType || 'image/png';
		imageContent = `data:${mimeType};base64,${buffer.toString('base64')}`;
	} else {
		imageContent = this.getNodeParameter('imageUrl', itemIndex) as string;
	}

	const body: IModelStudioRequestBody = {
		model,
		input: {
			messages: [
				{
					role: 'user',
					content: [
						{
							image: imageContent,
						},
						{
							text: question,
						},
					],
				},
			],
		},
		parameters: {},
	};

	if (visionOptions.temperature !== undefined) {
		body.parameters.temperature = visionOptions.temperature as number;
	}
	if (visionOptions.maxTokens !== undefined) {
		body.parameters.max_tokens = visionOptions.maxTokens as number;
	}

	const response = await apiRequest.call(
		this,
		'POST',
		'/api/v1/services/aigc/multimodal-generation/generation',
		{
			body,
		},
	);

	const output = (response.output?.choices?.[0]?.message?.content?.[0]?.text as string) || '';

	return {
		json: simplify
			? { content: output }
			: {
					content: output,
					model,
					usage: response.usage,
					fullResponse: response,
				},
		pairedItem: itemIndex,
	};
}
