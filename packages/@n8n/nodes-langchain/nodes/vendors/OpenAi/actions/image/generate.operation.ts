import type {
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		default: 'dall-e-3',
		description: 'The model to use for image generation',
		options: [
			{
				name: 'DALL·E 2',
				value: 'dall-e-2',
			},
			{
				name: 'DALL·E 3',
				value: 'dall-e-3',
			},
			{
				name: 'GPT Image 1',
				value: 'gpt-image-1',
			},
		],
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		placeholder: 'e.g. A cute cat eating a dinosaur',
		description:
			'A text description of the desired image(s). The maximum length is 1000 characters for dall-e-2 and 4000 characters for dall-e-3.',
		default: '',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Number of Images',
				name: 'n',
				default: 1,
				description: 'Number of images to generate',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				displayOptions: {
					show: {
						'/model': ['dall-e-2'],
					},
				},
			},
			{
				displayName: 'Quality',
				name: 'dalleQuality',
				type: 'options',
				description:
					'The quality of the image that will be generated, HD creates images with finer details and greater consistency across the image',
				options: [
					{
						name: 'HD',
						value: 'hd',
					},
					{
						name: 'Standard',
						value: 'standard',
					},
				],
				displayOptions: {
					show: {
						'/model': ['dall-e-3'],
					},
				},
				default: 'standard',
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'options',
				description:
					'The quality of the image that will be generated, High creates images with finer details and greater consistency across the image',
				options: [
					{
						name: 'High',
						value: 'high',
					},
					{
						name: 'Medium',
						value: 'medium',
					},
					{
						name: 'Low',
						value: 'low',
					},
				],
				displayOptions: {
					show: {
						'/model': ['gpt-image-1'],
					},
				},
				default: 'medium',
			},

			{
				displayName: 'Resolution',
				name: 'size',
				type: 'options',
				options: [
					{
						name: '256x256',
						value: '256x256',
					},
					{
						name: '512x512',
						value: '512x512',
					},
					{
						name: '1024x1024',
						value: '1024x1024',
					},
				],
				displayOptions: {
					show: {
						'/model': ['dall-e-2'],
					},
				},
				default: '1024x1024',
			},
			{
				displayName: 'Resolution',
				name: 'size',
				type: 'options',
				options: [
					{
						name: '1024x1024',
						value: '1024x1024',
					},
					{
						name: '1792x1024',
						value: '1792x1024',
					},
					{
						name: '1024x1792',
						value: '1024x1792',
					},
				],
				displayOptions: {
					show: {
						'/model': ['dall-e-3'],
					},
				},
				default: '1024x1024',
			},
			{
				displayName: 'Resolution',
				name: 'size',
				type: 'options',
				options: [
					{
						name: '1024x1024',
						value: '1024x1024',
					},
					{
						name: '1024x1536',
						value: '1024x1536',
					},
					{
						name: '1536x1024',
						value: '1536x1024',
					},
				],
				displayOptions: {
					show: {
						'/model': ['gpt-image-1'],
					},
				},
				default: '1024x1024',
			},

			{
				displayName: 'Style',
				name: 'style',
				type: 'options',
				options: [
					{
						name: 'Natural',
						value: 'natural',
						description: 'Produce more natural looking images',
					},
					{
						name: 'Vivid',
						value: 'vivid',
						description: 'Lean towards generating hyper-real and dramatic images',
					},
				],
				displayOptions: {
					show: {
						'/model': ['dall-e-3'],
					},
				},
				default: 'vivid',
			},
			{
				displayName: 'Respond with Image URL(s)',
				name: 'returnImageUrls',
				type: 'boolean',
				default: false,
				description: 'Whether to return image URL(s) instead of binary file(s)',
				displayOptions: {
					hide: {
						'/model': ['gpt-image-1'],
					},
				},
			},
			{
				displayName: 'Put Output in Field',
				name: 'binaryPropertyOutput',
				type: 'string',
				default: 'data',
				hint: 'The name of the output field to put the binary file data in',
				displayOptions: {
					show: {
						returnImageUrls: [false],
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

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('model', i) as string;
	const prompt = this.getNodeParameter('prompt', i) as string;
	const options = this.getNodeParameter('options', i, {});
	let response_format = 'b64_json';
	let binaryPropertyOutput = 'data';

	if (options.returnImageUrls) {
		response_format = 'url';
	}

	if (options.binaryPropertyOutput) {
		binaryPropertyOutput = options.binaryPropertyOutput as string;
		delete options.binaryPropertyOutput;
	}

	if (options.dalleQuality) {
		options.quality = options.dalleQuality;
		delete options.dalleQuality;
	}

	delete options.returnImageUrls;
	const body: IDataObject = {
		prompt,
		model,
		response_format: model !== 'gpt-image-1' ? response_format : undefined, // gpt-image-1 does not support response_format
		...options,
	};

	const { data } = await apiRequest.call(this, 'POST', '/images/generations', { body });
	if (response_format === 'url') {
		return ((data as IDataObject[]) || []).map((entry) => ({
			json: entry,
			pairedItem: { item: i },
		}));
	} else {
		const returnData: INodeExecutionData[] = [];

		for (const entry of data) {
			const binaryData = await this.helpers.prepareBinaryData(
				Buffer.from(entry.b64_json as string, 'base64'),
				'data',
			);
			returnData.push({
				json: Object.assign({}, binaryData, {
					data: undefined,
				}),
				binary: {
					[binaryPropertyOutput]: binaryData,
				},
				pairedItem: { item: i },
			});
		}

		return returnData;
	}
}
