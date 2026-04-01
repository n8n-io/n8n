import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import { apiRequest } from '../../transport';
import { IImageOptions, IModelStudioRequestBody } from '../../helpers/interfaces';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'imageModel',
		type: 'options',
		options: [
			{
				name: 'Qwen Image',
				value: 'qwen-image',
				description: 'Qwen image generation model',
			},
			{
				name: 'Qwen Image Max',
				value: 'qwen-image-max',
				description: 'Most capable Qwen image generation model',
			},
			{
				name: 'Qwen Image Plus',
				value: 'qwen-image-plus',
				description: 'Enhanced Qwen image generation model',
			},
			{
				name: 'Wan 2.6 T2I',
				value: 'wan2.6-t2i',
				description: 'Wanx image generation model',
			},
			{
				name: 'Z-Image Turbo',
				value: 'z-image-turbo',
				description: 'Fast image generation model',
			},
		],
		default: 'z-image-turbo',
		description: 'The model to use for image generation',
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		description: 'The text prompt describing the image to generate',
		required: true,
	},
	{
		displayName: 'Simplify Output',
		name: 'simplifyImageOutput',
		type: 'boolean',
		default: true,
		description: 'Whether to return only the image URL instead of the full response object',
	},
	{
		displayName: 'Options',
		name: 'imageOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Size',
				name: 'size',
				type: 'options',
				displayOptions: {
					show: {
						'/imageModel': ['z-image-turbo', 'wan2.6-t2i'],
					},
				},
				options: [
					{
						name: '1024x1024',
						value: '1024*1024',
					},
					{
						name: '720x1280',
						value: '720*1280',
					},
					{
						name: '1280x720',
						value: '1280*720',
					},
				],
				default: '1024*1024',
				description: 'The size of the generated image',
				routing: {
					send: {
						type: 'body',
						property: 'parameters.size',
					},
				},
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'options',
				displayOptions: {
					show: {
						'/imageModel': ['qwen-image', 'qwen-image-plus', 'qwen-image-max'],
					},
				},
				options: [
					{
						name: '1104x1472 (3:4)',
						value: '1104*1472',
					},
					{
						name: '1328x1328 (1:1)',
						value: '1328*1328',
					},
					{
						name: '1472x1104 (4:3)',
						value: '1472*1104',
					},
					{
						name: '1664x928 (16:9)',
						value: '1664*928',
					},
					{
						name: '928x1664 (9:16)',
						value: '928*1664',
					},
				],
				default: '1664*928',
				description: 'The size of the generated image',
				routing: {
					send: {
						type: 'body',
						property: 'parameters.size',
					},
				},
			},
			{
				displayName: 'Prompt Extend',
				name: 'prompt_extend',
				type: 'boolean',
				default: false,
				description: 'Whether to automatically extend and enhance the prompt',
				routing: {
					send: {
						type: 'body',
						property: 'parameters.prompt_extend',
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['generate'],
		resource: ['image'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	// Get the parameters
	const imageModel = this.getNodeParameter('imageModel', itemIndex) as string;
	const prompt = this.getNodeParameter('prompt', itemIndex) as string;
	const imageOptions = this.getNodeParameter('imageOptions', itemIndex, {}) as IImageOptions;
	const simplifyImageOutput = this.getNodeParameter(
		'simplifyImageOutput',
		itemIndex,
		true,
	) as boolean;

	// Build the request body
	const body: IModelStudioRequestBody = {
		model: imageModel,
		input: {
			messages: [
				{
					role: 'user',
					content: [
						{
							text: prompt,
						},
					],
				},
			],
		},
		parameters: {
			prompt_extend: imageOptions.prompt_extend !== undefined ? imageOptions.prompt_extend : false,
		},
	};

	// Add optional size parameter
	if (imageOptions.size) {
		body.parameters.size = imageOptions.size;
	}

	// Make the API request
	const response = await apiRequest.call(
		this,
		'POST',
		'/api/v1/services/aigc/multimodal-generation/generation',
		{
			body,
		},
	);

	// Extract the image URL from the response
	const image = response.output?.choices[0]?.message?.content[0]?.image || '';

	return {
		json: simplifyImageOutput
			? { image }
			: {
					model: imageModel,
					usage: response.usage,
					fullResponse: response,
				},
		pairedItem: itemIndex,
	};
}
