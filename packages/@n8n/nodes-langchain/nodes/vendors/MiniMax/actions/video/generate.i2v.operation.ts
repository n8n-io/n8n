import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError, updateDisplayOptions } from 'n8n-workflow';

import type { VideoGenerationResponse } from '../../helpers/interfaces';
import { apiRequest, getVideoDownloadUrl, pollVideoTask } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'modelId',
		type: 'options',
		options: [
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
				description: 'Latest model with enhanced realism',
			},
			{
				name: 'MiniMax-Hailuo-2.3-Fast',
				value: 'MiniMax-Hailuo-2.3-Fast',
				description: 'Faster image-to-video model for value and efficiency',
			},
		],
		default: 'MiniMax-Hailuo-2.3',
		description: 'The model to use for video generation',
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
	},
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
					'Provide a last frame image to generate a first-and-last-frame video. Only supported by MiniMax-Hailuo-2.3 and MiniMax-Hailuo-02.',
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
	const duration = this.getNodeParameter('duration', itemIndex) as number;
	const resolution = this.getNodeParameter('resolution', itemIndex) as string;
	const downloadVideo = this.getNodeParameter('downloadVideo', itemIndex, true) as boolean;
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

	let firstFrameImage: string;
	if (imageInputType === 'binary') {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
		firstFrameImage = await resolveImageInput(this, itemIndex, 'binary', '', binaryPropertyName);
	} else {
		const imageUrl = this.getNodeParameter('imageUrl', itemIndex) as string;
		firstFrameImage = imageUrl;
	}

	const body: IDataObject = {
		model,
		first_frame_image: firstFrameImage,
		duration,
		resolution,
	};

	if (prompt) {
		body.prompt = prompt;
	}

	if (options.promptOptimizer !== undefined) {
		body.prompt_optimizer = options.promptOptimizer;
	}

	const lastFrameInputType = (options.lastFrameInputType as string) || 'none';
	if (lastFrameInputType !== 'none') {
		body.last_frame_image = await resolveImageInput(
			this,
			itemIndex,
			lastFrameInputType,
			(options.lastFrameImageUrl as string) || '',
			(options.lastFrameBinaryPropertyName as string) || 'lastFrame',
		);
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

	const createResponse = (await apiRequest.call(this, 'POST', '/video_generation', {
		body,
	})) as VideoGenerationResponse;

	if (createResponse.base_resp?.status_code !== 0) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to create video task: ${createResponse.base_resp?.status_msg || 'Unknown error'}`,
		);
	}

	const taskId = createResponse.task_id;
	if (!taskId) {
		throw new NodeOperationError(
			this.getNode(),
			'No task_id returned from video generation request',
		);
	}

	const { fileId } = await pollVideoTask.call(this, taskId);
	const videoUrl = await getVideoDownloadUrl.call(this, fileId);

	const jsonData: IDataObject = {
		videoUrl,
		taskId,
		fileId,
	};

	if (downloadVideo && videoUrl) {
		const videoResponse = await this.helpers.httpRequest({
			method: 'GET',
			url: videoUrl,
			encoding: 'arraybuffer',
			returnFullResponse: true,
		});

		const contentType = (videoResponse.headers?.['content-type'] as string) || 'video/mp4';
		const fileContent = Buffer.from(videoResponse.body as ArrayBuffer);
		const binaryData = await this.helpers.prepareBinaryData(fileContent, 'video.mp4', contentType);

		return [
			{
				binary: { data: binaryData },
				json: jsonData,
				pairedItem: { item: itemIndex },
			},
		];
	}

	return [
		{
			json: jsonData,
			pairedItem: { item: itemIndex },
		},
	];
}
