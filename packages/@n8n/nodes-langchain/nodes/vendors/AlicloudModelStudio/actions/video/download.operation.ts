import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		placeholder: 'e.g. https://dashscope-result.oss-cn-beijing.aliyuncs.com/xxx.mp4',
		description: 'The URL of the generated video to download',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Put Output in Field',
				name: 'binaryPropertyOutput',
				type: 'string',
				default: 'data',
				hint: 'The name of the output field to put the binary file data in',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['download'],
		resource: ['video'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData> {
	const url = this.getNodeParameter('url', i, '') as string;
	const binaryPropertyOutput = this.getNodeParameter(
		'options.binaryPropertyOutput',
		i,
		'data',
	) as string;

	const response = await this.helpers.httpRequest({
		method: 'GET',
		url,
		encoding: 'arraybuffer',
		returnFullResponse: true,
	});

	const contentType = (response.headers?.['content-type'] as string) || 'video/mp4';
	const fileContent = Buffer.from(response.body as ArrayBuffer);
	const binaryData = await this.helpers.prepareBinaryData(fileContent, 'video.mp4', contentType);

	return {
		binary: { [binaryPropertyOutput]: binaryData },
		json: {
			...binaryData,
			data: undefined,
		},
		pairedItem: i,
	};
}
