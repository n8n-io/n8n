import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import { apiRequest } from '../../transport';
import type { IImageOptions, IModelStudioRequestBody } from '../../helpers/interfaces';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'modelId',
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
		displayName: 'Download Image',
		name: 'downloadImage',
		type: 'boolean',
		default: true,
		description:
			'Whether to download the generated image as binary data. When disabled, only the image URL is returned.',
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
						'/modelId': ['z-image-turbo', 'wan2.6-t2i'],
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
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'options',
				displayOptions: {
					show: {
						'/modelId': ['qwen-image', 'qwen-image-plus', 'qwen-image-max'],
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
			},
			{
				displayName: 'Prompt Extend',
				name: 'promptExtend',
				type: 'boolean',
				default: false,
				description: 'Whether to automatically extend and enhance the prompt',
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
	const model = this.getNodeParameter('modelId', itemIndex) as string;
	const prompt = this.getNodeParameter('prompt', itemIndex) as string;
	const imageOptions = this.getNodeParameter('imageOptions', itemIndex, {}) as IImageOptions;
	const downloadImage = this.getNodeParameter('downloadImage', itemIndex, true) as boolean;

	const body: IModelStudioRequestBody = {
		model,
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
			prompt_extend: imageOptions.promptExtend ?? false,
		},
	};

	if (imageOptions.size) {
		body.parameters.size = imageOptions.size;
	}

	const response = await apiRequest.call(
		this,
		'POST',
		'/api/v1/services/aigc/multimodal-generation/generation',
		{
			body,
		},
	);

	const imageUrl = (response.output?.choices?.[0]?.message?.content?.[0]?.image as string) || '';

	if (downloadImage && imageUrl) {
		const imageResponse = await this.helpers.httpRequest({
			method: 'GET',
			url: imageUrl,
			encoding: 'arraybuffer',
			returnFullResponse: true,
		});

		const contentType = (imageResponse.headers?.['content-type'] as string) || 'image/png';
		const fileContent = Buffer.from(imageResponse.body as ArrayBuffer);
		const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
		const binaryData = await this.helpers.prepareBinaryData(
			fileContent,
			`image.${ext}`,
			contentType,
		);

		return {
			binary: { data: binaryData },
			json: {
				model,
				imageUrl,
				usage: response.usage,
			},
			pairedItem: itemIndex,
		};
	}

	return {
		json: {
			model,
			imageUrl,
			usage: response.usage,
		},
		pairedItem: itemIndex,
	};
}
