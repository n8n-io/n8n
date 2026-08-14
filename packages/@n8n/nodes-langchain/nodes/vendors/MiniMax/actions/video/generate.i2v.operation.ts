import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { generateVideo } from '../../transport';
import { assertH3Prompt, H3_MODEL, h3VideoProperties, prepareVideoOutput } from './helpers';

const modelOptionsV1: INodePropertyOptions[] = [
	{
		name: 'I2V-01',
		value: 'I2V-01',
		description: 'Standard image-to-video model',
	},
	{
		name: 'I2V-01-Director',
		value: 'I2V-01-Director',
		description: 'Image-to-video with camera control commands',
	},
	{
		name: 'I2V-01-Live',
		value: 'I2V-01-live',
		description: 'Image-to-video live model',
	},
	{
		name: 'MiniMax-Hailuo-02',
		value: 'MiniMax-Hailuo-02',
		description: 'Model supporting higher resolution and longer duration',
	},
	{
		name: 'MiniMax-Hailuo-2.3',
		value: 'MiniMax-Hailuo-2.3',
		description: 'Hailuo 2.3 model with enhanced realism',
	},
	{
		name: 'MiniMax-Hailuo-2.3-Fast',
		value: 'MiniMax-Hailuo-2.3-Fast',
		description: 'Faster image-to-video model for value and efficiency',
	},
];

const modelOptionsV1_1: INodePropertyOptions[] = [
	{
		name: H3_MODEL,
		value: H3_MODEL,
		description: 'Latest multimodal video generation model',
	},
	...modelOptionsV1,
];

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'modelId',
		type: 'options',
		options: modelOptionsV1,
		default: 'MiniMax-Hailuo-2.3',
		description: 'The model to use for video generation',
		displayOptions: {
			show: {
				'@version': [1],
			},
		},
	},
	{
		displayName: 'Model',
		name: 'modelId',
		type: 'options',
		options: modelOptionsV1_1,
		default: H3_MODEL,
		description: 'The model to use for video generation',
		displayOptions: {
			show: {
				'@version': [{ _cnd: { gte: 1.1 } }],
			},
		},
	},
	{
		displayName: 'Image Input Type',
		name: 'imageInputType',
		type: 'options',
		options: [
			{ name: 'URL', value: 'url' },
			{ name: 'Binary File', value: 'binary' },
		],
		default: 'url',
		description: 'How to provide the first frame image',
	},
	{
		displayName: 'Image URL',
		name: 'imageUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/image.jpg',
		description: 'Public URL of the image to use as first frame (JPG, JPEG, PNG, WebP, <20MB)',
		displayOptions: {
			show: {
				imageInputType: ['url'],
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
		hint: 'The name of the input field containing the binary image data',
		typeOptions: {
			binaryDataProperty: true,
		},
		displayOptions: {
			show: {
				imageInputType: ['binary'],
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
		description:
			'Optional text description of the video (max 2000 characters). Camera movements can be controlled using [command] syntax.',
		placeholder: 'e.g. The subject smiles and waves at the camera [Zoom in]',
		displayOptions: {
			hide: {
				modelId: [H3_MODEL],
			},
		},
	},
	...h3VideoProperties,
	{
		displayName: 'Duration (Seconds)',
		name: 'duration',
		type: 'options',
		options: [
			{ name: '6 Seconds', value: 6 },
			{ name: '10 Seconds', value: 10 },
		],
		default: 6,
		description: 'Duration of the generated video',
		displayOptions: {
			hide: {
				modelId: [H3_MODEL],
			},
		},
	},
	{
		displayName: 'Resolution',
		name: 'resolution',
		type: 'options',
		options: [
			{ name: '512P', value: '512P' },
			{ name: '720P', value: '720P' },
			{ name: '768P', value: '768P' },
			{ name: '1080P', value: '1080P' },
		],
		default: '768P',
		description: 'Resolution of the generated video. Available options depend on the model.',
		displayOptions: {
			hide: {
				modelId: [H3_MODEL],
			},
		},
	},
	{
		displayName: 'Download Video',
		name: 'downloadVideo',
		type: 'boolean',
		default: true,
		description:
			'Whether to download the generated video as binary data. When disabled, only the video URL is returned.',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Prompt Optimizer',
				name: 'promptOptimizer',
				type: 'boolean',
				default: true,
				description: 'Whether to automatically optimize the prompt',
				displayOptions: {
					hide: {
						modelId: [H3_MODEL],
					},
				},
			},
			{
				displayName: 'Last Frame Image Input Type',
				name: 'lastFrameInputType',
				type: 'options',
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'URL', value: 'url' },
					{ name: 'Binary File', value: 'binary' },
				],
				default: 'none',
				description:
					'Provide a last frame image to generate a first-and-last-frame video. Available only for supported models.',
			},
			{
				displayName: 'Last Frame Image URL',
				name: 'lastFrameImageUrl',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/last-frame.jpg',
				displayOptions: {
					show: {
						lastFrameInputType: ['url'],
					},
				},
			},
			{
				displayName: 'Last Frame Data Field Name',
				name: 'lastFrameBinaryPropertyName',
				type: 'string',
				default: 'lastFrame',
				placeholder: 'e.g. lastFrame',
				typeOptions: {
					binaryDataProperty: true,
				},
				displayOptions: {
					show: {
						lastFrameInputType: ['binary'],
					},
				},
			},
			{
				displayName: 'Subject Reference Input Type',
				name: 'subjectReferenceInputType',
				type: 'options',
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'URL', value: 'url' },
					{ name: 'Binary File', value: 'binary' },
				],
				default: 'none',
				description:
					'Provide a face photo for facial consistency in the generated video. Only supported by MiniMax-Hailuo-2.3.',
				displayOptions: {
					hide: {
						modelId: [H3_MODEL],
					},
				},
			},
			{
				displayName: 'Subject Reference Image URL',
				name: 'subjectReferenceImageUrl',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/face.jpg',
				displayOptions: {
					show: {
						subjectReferenceInputType: ['url'],
					},
					hide: {
						modelId: [H3_MODEL],
					},
				},
			},
			{
				displayName: 'Subject Reference Data Field Name',
				name: 'subjectReferenceBinaryPropertyName',
				type: 'string',
				default: 'subjectReference',
				placeholder: 'e.g. subjectReference',
				typeOptions: {
					binaryDataProperty: true,
				},
				displayOptions: {
					show: {
						subjectReferenceInputType: ['binary'],
					},
					hide: {
						modelId: [H3_MODEL],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['video'],
		operation: ['imageToVideo'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

async function resolveImageInput(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	inputType: string,
	urlValue: string,
	binaryPropertyName: string,
): Promise<string> {
	if (inputType === 'binary') {
		const binaryData = executeFunctions.helpers.assertBinaryData(itemIndex, binaryPropertyName);
		const buffer = await executeFunctions.helpers.getBinaryDataBuffer(
			itemIndex,
			binaryPropertyName,
		);
		return `data:${binaryData.mimeType};base64,${buffer.toString('base64')}`;
	}
	return urlValue;
}

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', itemIndex) as string;
	const imageInputType = this.getNodeParameter('imageInputType', itemIndex) as string;
	const prompt = this.getNodeParameter('prompt', itemIndex, '') as string;
	const downloadVideo = this.getNodeParameter('downloadVideo', itemIndex, true) as boolean;
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const isH3 = model === H3_MODEL;

	let firstFrameImage: string;
	if (imageInputType === 'binary') {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
		firstFrameImage = await resolveImageInput(this, itemIndex, 'binary', '', binaryPropertyName);
	} else {
		const imageUrl = this.getNodeParameter('imageUrl', itemIndex) as string;
		firstFrameImage = imageUrl;
	}

	const lastFrameInputType = (options.lastFrameInputType as string) || 'none';
	let lastFrameImage: string | undefined;
	if (lastFrameInputType !== 'none') {
		lastFrameImage = await resolveImageInput(
			this,
			itemIndex,
			lastFrameInputType,
			(options.lastFrameImageUrl as string) || '',
			(options.lastFrameBinaryPropertyName as string) || 'lastFrame',
		);
	}

	let body: IDataObject;
	if (isH3) {
		assertH3Prompt(this, prompt);
		const content: IDataObject[] = [
			{ type: 'text', text: prompt },
			{
				type: 'image_url',
				image_url: { url: firstFrameImage },
				role: 'first_frame',
			},
		];
		if (lastFrameImage) {
			content.push({
				type: 'image_url',
				image_url: { url: lastFrameImage },
				role: 'last_frame',
			});
		}

		body = {
			model,
			content,
			duration: this.getNodeParameter('h3Duration', itemIndex) as number,
			resolution: this.getNodeParameter('h3Resolution', itemIndex) as string,
			ratio: 'adaptive',
		};
	} else {
		body = {
			model,
			first_frame_image: firstFrameImage,
			duration: this.getNodeParameter('duration', itemIndex) as number,
			resolution: this.getNodeParameter('resolution', itemIndex) as string,
		};

		if (prompt) {
			body.prompt = prompt;
		}

		if (options.promptOptimizer !== undefined) {
			body.prompt_optimizer = options.promptOptimizer;
		}

		if (lastFrameImage) {
			body.last_frame_image = lastFrameImage;
		}

		const subjectRefInputType = (options.subjectReferenceInputType as string) || 'none';
		if (subjectRefInputType !== 'none') {
			body.subject_reference = [
				{
					image: await resolveImageInput(
						this,
						itemIndex,
						subjectRefInputType,
						(options.subjectReferenceImageUrl as string) || '',
						(options.subjectReferenceBinaryPropertyName as string) || 'subjectReference',
					),
				},
			];
		}
	}

	const result = await generateVideo.call(this, isH3 ? 'v2' : 'v1', body);
	return await prepareVideoOutput(this, itemIndex, result, downloadVideo);
}
