import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export const H3_MODEL = 'MiniMax-H3';

export const h3VideoProperties: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		description: 'Text description of the video (max 7000 characters)',
		placeholder: 'A subject moves naturally through the scene',
		displayOptions: {
			show: {
				modelId: [H3_MODEL],
				'@version': [{ _cnd: { gte: 1.1 } }],
			},
		},
	},
	{
		displayName: 'Duration (Seconds)',
		name: 'h3Duration',
		type: 'options',
		options: Array.from({ length: 12 }, (_, index) => {
			const duration = index + 4;
			return { name: `${duration} Seconds`, value: duration };
		}),
		default: 5,
		description: 'Duration of the generated video',
		displayOptions: {
			show: {
				modelId: [H3_MODEL],
				'@version': [{ _cnd: { gte: 1.1 } }],
			},
		},
	},
	{
		displayName: 'Resolution',
		name: 'h3Resolution',
		type: 'options',
		options: [
			{ name: '768P', value: '768P' },
			{ name: '2K', value: '2K' },
		],
		default: '2K',
		description: 'Resolution of the generated video',
		displayOptions: {
			show: {
				modelId: [H3_MODEL],
				'@version': [{ _cnd: { gte: 1.1 } }],
			},
		},
	},
];

export function assertH3Prompt(executeFunctions: IExecuteFunctions, prompt: string) {
	if (!prompt.trim()) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Prompt is required for MiniMax-H3 video generation',
		);
	}
}

export async function prepareVideoOutput(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	result: { videoUrl: string; taskId: string; fileId?: string },
	downloadVideo: boolean,
): Promise<INodeExecutionData[]> {
	const json: IDataObject = {
		videoUrl: result.videoUrl,
		taskId: result.taskId,
	};
	if (result.fileId) json.fileId = result.fileId;

	if (!downloadVideo) {
		return [{ json, pairedItem: { item: itemIndex } }];
	}

	const response = await executeFunctions.helpers.httpRequest({
		method: 'GET',
		url: result.videoUrl,
		encoding: 'arraybuffer',
		returnFullResponse: true,
	});
	const contentType = (response.headers?.['content-type'] as string) || 'video/mp4';
	const fileContent = Buffer.from(response.body as ArrayBuffer);
	const binaryData = await executeFunctions.helpers.prepareBinaryData(
		fileContent,
		'video.mp4',
		contentType,
	);

	return [
		{
			binary: { data: binaryData },
			json,
			pairedItem: { item: itemIndex },
		},
	];
}
