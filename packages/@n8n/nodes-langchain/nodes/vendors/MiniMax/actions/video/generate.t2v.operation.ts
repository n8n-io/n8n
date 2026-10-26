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
		name: 'MiniMax-Hailuo-2.3',
		value: 'MiniMax-Hailuo-2.3',
		description: 'Hailuo 2.3 video generation model with enhanced realism',
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
		displayName: 'Aspect Ratio',
		name: 'ratio',
		type: 'options',
		options: [
			{ name: '1:1', value: '1:1' },
			{ name: '16:9', value: '16:9' },
			{ name: '21:9', value: '21:9' },
			{ name: '3:4', value: '3:4' },
			{ name: '4:3', value: '4:3' },
			{ name: '9:16', value: '9:16' },
		],
		default: '16:9',
		description: 'Aspect ratio of the generated video',
		displayOptions: {
			show: {
				modelId: [H3_MODEL],
				'@version': [{ _cnd: { gte: 1.1 } }],
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
		displayOptions: {
			hide: {
				modelId: [H3_MODEL],
			},
		},
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
	const downloadVideo = this.getNodeParameter('downloadVideo', itemIndex, true) as boolean;
	const isH3 = model === H3_MODEL;

	let body: IDataObject;
	if (isH3) {
		assertH3Prompt(this, prompt);
		const ratio = this.getNodeParameter('ratio', itemIndex) as string;
		body = {
			model,
			content: [{ type: 'text', text: prompt }],
			duration: this.getNodeParameter('h3Duration', itemIndex) as number,
			resolution: this.getNodeParameter('h3Resolution', itemIndex) as string,
			ratio,
		};
	} else {
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			promptOptimizer?: boolean;
		};
		body = {
			model,
			prompt,
			duration: this.getNodeParameter('duration', itemIndex) as number,
			resolution: this.getNodeParameter('resolution', itemIndex) as string,
		};

		if (options.promptOptimizer !== undefined) {
			body.prompt_optimizer = options.promptOptimizer;
		}
	}

	const result = await generateVideo.call(this, isH3 ? 'v2' : 'v1', body);
	return await prepareVideoOutput(this, itemIndex, result, downloadVideo);
}
