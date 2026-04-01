import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import { apiRequest } from '../../transport';
import type { IModelStudioRequestBody } from '../../helpers/interfaces';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'visionModel',
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
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
	},
	{
		displayName: 'Image URL',
		name: 'imageUrl',
		type: 'string',
		default: '',
		description: 'The URL of the image to analyze',
		required: true,
		placeholder: 'https://example.com/image.jpg',
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
		name: 'simplifyVisionOutput',
		type: 'boolean',
		default: true,
		description: 'Whether to return only the text response instead of the full response object',
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
				routing: {
					send: {
						type: 'body',
						property: 'parameters.temperature',
					},
				},
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
				routing: {
					send: {
						type: 'body',
						property: 'parameters.max_tokens',
					},
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

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const visionModel = this.getNodeParameter('visionModel', itemIndex) as string;
	const imageUrl = this.getNodeParameter('imageUrl', itemIndex) as string;
	const question = this.getNodeParameter('question', itemIndex) as string;
	const visionOptions = this.getNodeParameter('visionOptions', itemIndex, {}) as Record<
		string,
		unknown
	>;
	const simplifyVisionOutput = this.getNodeParameter(
		'simplifyVisionOutput',
		itemIndex,
		true,
	) as boolean;

	const body: IModelStudioRequestBody = {
		model: visionModel,
		input: {
			messages: [
				{
					role: 'user',
					content: [
						{
							image: imageUrl,
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
		json: simplifyVisionOutput
			? { text: output }
			: {
					model: visionModel,
					response: output,
					usage: response.usage,
					fullResponse: response,
				},
		pairedItem: itemIndex,
	};
}
