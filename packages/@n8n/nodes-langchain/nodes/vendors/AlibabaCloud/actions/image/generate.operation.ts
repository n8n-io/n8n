import type {
	IDataObject,
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError, updateDisplayOptions } from 'n8n-workflow';

import type { IImageOptions, IModelStudioRequestBody } from '../../helpers/interfaces';
import { planWanImage } from '../../helpers/wanImage';
import { apiRequest, pollTaskResult } from '../../transport';
import { modelRLC } from '../descriptions';

const WAN_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

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
				name: 'Wan 2.6 Image',
				value: 'wan2.6-image',
				description: 'Wan image editing model. Requires 1 to 4 reference images.',
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
		displayOptions: {
			show: { '@version': [1] },
		},
	},
	{
		...modelRLC('imageGenerationModelSearch'),
		displayOptions: {
			show: { '@version': [{ _cnd: { gte: 1.1 } }] },
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
		displayName:
			'Attach reference images for Wan image editing. Use a Wan t2i model for text-only generate.',
		name: 'wanImageEditNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				'/modelId': [{ _cnd: { includes: 'wan' } }],
			},
			hide: {
				'/modelId': [{ _cnd: { includes: '-t2i' } }],
			},
		},
	},
	{
		displayName: 'Reference Images',
		name: 'referenceImages',
		type: 'fixedCollection',
		placeholder: 'Add Image',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Image',
		},
		default: {
			values: [{ inputType: 'url', imageUrl: '', binaryPropertyName: 'data' }],
		},
		description: '1 to 4 reference images for Wan image editing',
		displayOptions: {
			show: {
				'/modelId': [{ _cnd: { includes: 'wan' } }],
			},
			hide: {
				'/modelId': [{ _cnd: { includes: '-t2i' } }],
			},
		},
		options: [
			{
				displayName: 'Image',
				name: 'values',
				values: [
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
					},
					{
						displayName: 'Image URL',
						name: 'imageUrl',
						type: 'string',
						default: '',
						placeholder: 'https://example.com/image.png',
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
						hint: 'The name of the input field containing the binary image data',
						typeOptions: {
							binaryDataProperty: true,
						},
						displayOptions: {
							show: {
								inputType: ['binary'],
							},
						},
					},
				],
			},
		],
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
						'/modelId': ['z-image-turbo'],
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
						'/modelId': ['wan2.6-t2i', 'wan2.6-image'],
					},
				},
				options: [
					{
						name: '1104x1472 (3:4)',
						value: '1104*1472',
					},
					{
						name: '1280x1280 (1:1)',
						value: '1280*1280',
					},
					{
						name: '1472x1104 (4:3)',
						value: '1472*1104',
					},
					{
						name: '1696x960 (16:9)',
						value: '1696*960',
					},
					{
						name: '960x1696 (9:16)',
						value: '960*1696',
					},
				],
				default: '1280*1280',
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

function toImageDataUri(
	buffer: Buffer,
	mimeType: string,
	imageUrl: string,
	ctx: IExecuteFunctions,
	itemIndex: number,
): string {
	if (buffer.length > WAN_IMAGE_MAX_BYTES) {
		throw new NodeOperationError(ctx.getNode(), `Reference image exceeds 10 MB: ${imageUrl}`, {
			itemIndex,
		});
	}

	return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

async function downloadImageAsDataUri(
	ctx: IExecuteFunctions,
	imageUrl: string,
	itemIndex: number,
): Promise<string> {
	if (imageUrl.startsWith('data:')) {
		return imageUrl;
	}

	const imageResponse = await ctx.helpers.httpRequest({
		method: 'GET',
		url: imageUrl,
		encoding: 'arraybuffer',
		returnFullResponse: true,
		headers: {
			'User-Agent': 'n8n (https://n8n.io)',
		},
	});
	const contentType =
		(imageResponse.headers?.['content-type'] as string | undefined) ?? 'image/png';
	const mimeType = contentType.split(';')[0]?.trim() || 'image/png';
	const buffer = Buffer.from(imageResponse.body as ArrayBuffer);
	return toImageDataUri(buffer, mimeType, imageUrl, ctx, itemIndex);
}

async function resolveReferenceImages(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<string[]> {
	const collection = ctx.getNodeParameter('referenceImages', itemIndex, {}) as {
		values?: Array<{ inputType?: string; imageUrl?: string; binaryPropertyName?: string }>;
	};
	const uris: string[] = [];

	for (const entry of collection.values ?? []) {
		if (entry.inputType === 'binary') {
			const propertyName = entry.binaryPropertyName ?? 'data';
			const binaryData = ctx.helpers.assertBinaryData(itemIndex, propertyName);
			const buffer = await ctx.helpers.getBinaryDataBuffer(itemIndex, propertyName);
			const mimeType = binaryData.mimeType ?? 'image/png';
			uris.push(toImageDataUri(buffer, mimeType, propertyName, ctx, itemIndex));
		} else if (entry.imageUrl) {
			uris.push(await downloadImageAsDataUri(ctx, entry.imageUrl, itemIndex));
		}
	}

	return uris;
}

function extractGeneratedImageUrl(response: IDataObject): string {
	const output = response.output as IDataObject | undefined;
	const choices = output?.choices as Array<{ message?: { content?: Array<{ image?: string }> } }>;
	const content = choices?.[0]?.message?.content;
	if (Array.isArray(content)) {
		const imagePart = content.find((part) => part?.image);
		if (imagePart?.image) {
			return imagePart.image;
		}
	}

	const results = output?.results as Array<{ url?: string }>;
	return results?.[0]?.url ?? '';
}

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const nodeVersion = this.getNode().typeVersion;
	const model =
		nodeVersion >= 1.1
			? (this.getNodeParameter('modelId', itemIndex, '', { extractValue: true }) as string)
			: (this.getNodeParameter('modelId', itemIndex) as string);
	const prompt = this.getNodeParameter('prompt', itemIndex) as string;
	const imageOptions = this.getNodeParameter('imageOptions', itemIndex, {}) as IImageOptions;
	const downloadImage = this.getNodeParameter('downloadImage', itemIndex, true) as boolean;
	const plan = planWanImage(model);

	let referenceImages: string[] = [];
	if (plan.refs) {
		referenceImages = await resolveReferenceImages(this, itemIndex);
		if (plan.refs.required && referenceImages.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				`This Wan image-edit model needs 1 to ${plan.refs.max} reference images. Use a Wan t2i model for text-only generate.`,
				{ itemIndex },
			);
		}
		if (referenceImages.length > plan.refs.max) {
			throw new NodeOperationError(
				this.getNode(),
				`This Wan image-edit model accepts at most ${plan.refs.max} reference images.`,
				{ itemIndex },
			);
		}
	}

	const parameters: IModelStudioRequestBody['parameters'] = {
		prompt_extend: imageOptions.promptExtend ?? false,
	};
	if (plan.n !== null) {
		parameters.n = plan.n;
	}
	if (plan.defaultSize !== null) {
		parameters.size = imageOptions.size ?? plan.defaultSize;
	} else if (imageOptions.size) {
		parameters.size = imageOptions.size;
	}

	const body: IModelStudioRequestBody = {
		model,
		input:
			plan.input === 'prompt'
				? {
						prompt,
						...(plan.attachImages === 'input' ? { images: referenceImages } : {}),
					}
				: {
						messages: [
							{
								role: 'user',
								content: [
									{ text: prompt },
									...(plan.attachImages === 'content'
										? referenceImages.map((image) => ({ image }))
										: []),
								],
							},
						],
					},
		parameters,
	};

	let response: IDataObject;
	if (!plan.async) {
		response = await apiRequest.call(this, 'POST', plan.endpoint, { body });
	} else {
		const createResponse = await apiRequest.call(this, 'POST', plan.endpoint, {
			headers: {
				'X-DashScope-Async': 'enable',
			},
			body,
		});

		const taskId = createResponse?.output?.task_id as string;
		if (!taskId) {
			throw new NodeOperationError(
				this.getNode(),
				`Failed to create image generation task: ${createResponse?.message || 'No task_id returned'}`,
			);
		}

		response = await pollTaskResult.call(this, taskId);
	}

	const imageUrl = extractGeneratedImageUrl(response);

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
