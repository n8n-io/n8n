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
				name: 'MiniMax-Hailuo-2.3',
				value: 'MiniMax-Hailuo-2.3',
				description: 'Latest video generation model with enhanced realism',
			},
			{
				name: 'MiniMax-Hailuo-02',
				value: 'MiniMax-Hailuo-02',
				description: 'Video model supporting higher resolution and longer duration',
			},
			{
				name: 'T2V-01-Director',
				value: 'T2V-01-Director',
				description: 'Text-to-video model with camera control commands',
			},
			{
				name: 'T2V-01',
				value: 'T2V-01',
				description: 'Standard text-to-video model',
			},
		],
		default: 'MiniMax-Hailuo-2.3',
		description: 'The model to use for video generation',
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		description:
			'Text description of the video (max 2000 characters). Camera movements can be controlled using [command] syntax, e.g. [Push in], [Pan left].',
		placeholder: 'e.g. A cat playing with a ball of yarn [Static shot]',
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
				description: 'Whether to automatically optimize the prompt for better results',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['video'],
		operation: ['textToVideo'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', itemIndex) as string;
	const prompt = this.getNodeParameter('prompt', itemIndex) as string;
	const duration = this.getNodeParameter('duration', itemIndex) as number;
	const resolution = this.getNodeParameter('resolution', itemIndex) as string;
	const downloadVideo = this.getNodeParameter('downloadVideo', itemIndex, true) as boolean;
	const options = this.getNodeParameter('options', itemIndex, {}) as {
		promptOptimizer?: boolean;
	};

	const body: IDataObject = {
		model,
		prompt,
		duration,
		resolution,
	};

	if (options.promptOptimizer !== undefined) {
		body.prompt_optimizer = options.promptOptimizer;
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
