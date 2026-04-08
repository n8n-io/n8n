import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError, updateDisplayOptions } from 'n8n-workflow';
import { apiRequest, pollTaskResult } from '../../transport';
import type { IModelStudioRequestBody } from '../../helpers/interfaces';

export const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'modelId',
		type: 'options',
		options: [
			{
				name: 'Wan 2.6 Image-to-Video Flash',
				value: 'wan2.6-i2v-flash',
				description: 'Fast image-to-video generation model',
			},
			{
				name: 'Wan 2.6 Image-to-Video',
				value: 'wan2.6-i2v',
				description: 'Standard image-to-video generation model',
			},
		],
		default: 'wan2.6-i2v-flash',
		description: 'The model to use for image-to-video generation',
	},
	{
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		options: [
			{
				name: 'Image URL',
				value: 'url',
			},
			{
				name: 'Binary File',
				value: 'binary',
			},
		],
		default: 'url',
	},
	{
		displayName: 'Image URL',
		name: 'imgUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com/image.png',
		description: 'The URL of the first-frame image to generate video from',
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
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		description:
			'A text prompt describing the desired content and visual characteristics for the generated video',
		placeholder: 'A small cat running on the grass',
	},
	{
		displayName: 'Resolution',
		name: 'resolution',
		type: 'options',
		options: [
			{
				name: '720P',
				value: '720P',
			},
			{
				name: '1080P',
				value: '1080P',
			},
		],
		default: '1080P',
		description: 'Resolution tier of the generated video',
	},
	{
		displayName: 'Duration (Seconds)',
		name: 'duration',
		type: 'number',
		typeOptions: {
			minValue: 2,
			maxValue: 15,
		},
		default: 5,
		description: 'Duration of the generated video in seconds (2–15)',
	},
	{
		displayName: 'Shot Type',
		name: 'shotType',
		type: 'options',
		options: [
			{
				name: 'Single',
				value: 'single',
			},
			{
				name: 'Multi',
				value: 'multi',
			},
		],
		default: 'single',
		description: 'Whether to generate a single-shot or multi-shot narrative video',
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
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'imageToVideoOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Prompt Extend',
				name: 'promptExtend',
				type: 'boolean',
				default: false,
				description: 'Whether to automatically extend and enhance the prompt',
			},
			{
				displayName: 'Audio',
				name: 'audio',
				type: 'boolean',
				default: true,
				description: 'Whether to generate audio for the video',
			},
			{
				displayName: 'Audio Input Type',
				name: 'audioInputType',
				type: 'options',
				options: [
					{
						name: 'Audio URL',
						value: 'url',
					},
					{
						name: 'Binary File',
						value: 'binary',
					},
				],
				default: 'url',
			},
			{
				displayName: 'Audio URL',
				name: 'audioUrl',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/audio.mp3',
				description: 'URL of the audio file to use for the video',
				displayOptions: {
					show: {
						audioInputType: ['url'],
					},
				},
			},
			{
				displayName: 'Audio Data Field Name',
				name: 'audioBinaryPropertyName',
				type: 'string',
				default: 'audio',
				placeholder: 'e.g. audio',
				hint: 'The name of the input field containing the binary audio data',
				typeOptions: {
					binaryDataProperty: true,
				},
				displayOptions: {
					show: {
						audioInputType: ['binary'],
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

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const model = this.getNodeParameter('modelId', itemIndex) as string;
	const imageInputType = this.getNodeParameter('inputType', itemIndex) as string;
	const prompt = this.getNodeParameter('prompt', itemIndex, '') as string;
	const resolution = this.getNodeParameter('resolution', itemIndex) as string;
	const duration = this.getNodeParameter('duration', itemIndex) as number;
	const shotType = this.getNodeParameter('shotType', itemIndex) as string;
	const simplify = this.getNodeParameter('simplify', itemIndex, true) as boolean;
	const downloadVideo = this.getNodeParameter('downloadVideo', itemIndex, true) as boolean;
	const options = this.getNodeParameter('imageToVideoOptions', itemIndex, {}) as IDataObject;

	let imgUrl: string;
	if (imageInputType === 'binary') {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
		const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
		const mimeType = binaryData.mimeType || 'image/png';
		imgUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
	} else {
		imgUrl = this.getNodeParameter('imgUrl', itemIndex) as string;
	}

	const body: IModelStudioRequestBody = {
		model,
		input: {
			img_url: imgUrl,
			prompt,
		},
		parameters: {
			resolution,
			duration,
			shot_type: shotType,
		},
	};

	if (options.promptExtend !== undefined) {
		body.parameters.prompt_extend = options.promptExtend as boolean;
	}

	if (options.audio !== undefined) {
		body.parameters.audio = options.audio as boolean;
	}

	const audioInputType = options.audioInputType as string | undefined;
	if (audioInputType === 'binary') {
		const binaryPropertyName = (options.audioBinaryPropertyName as string) || 'audio';
		const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
		const mimeType = binaryData.mimeType || 'audio/mpeg';
		body.input.audio_url = `data:${mimeType};base64,${buffer.toString('base64')}`;
	} else if (options.audioUrl) {
		body.input.audio_url = options.audioUrl as string;
	}

	const createResponse = await apiRequest.call(
		this,
		'POST',
		'/api/v1/services/aigc/video-generation/video-synthesis',
		{
			headers: {
				'X-DashScope-Async': 'enable',
			},
			body,
		},
	);

	const taskId = createResponse?.output?.task_id as string;
	if (!taskId) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to create video generation task: ${createResponse?.message || 'No task_id returned'}`,
		);
	}

	const result = await pollTaskResult.call(this, taskId);

	const output = result.output as IDataObject;
	const videoUrl = (output?.video_url as string) || '';

	const jsonData = simplify
		? { videoUrl }
		: {
				videoUrl,
				model,
				taskId,
				usage: result.usage,
				taskStatus: output?.task_status,
				submitTime: output?.submit_time,
				endTime: output?.end_time,
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

		return {
			binary: { data: binaryData },
			json: jsonData,
			pairedItem: itemIndex,
		};
	}

	return {
		json: jsonData,
		pairedItem: itemIndex,
	};
}
