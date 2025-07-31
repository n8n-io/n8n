import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { downloadFile } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		placeholder: 'e.g. https://generativelanguage.googleapis.com/v1beta/files/abcdefg:download',
		description: 'The URL from Google Gemini API to download the video from',
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

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const url = this.getNodeParameter('url', i, '') as string;
	const binaryPropertyOutput = this.getNodeParameter(
		'options.binaryPropertyOutput',
		i,
		'data',
	) as string;
	const credentials = await this.getCredentials('googlePalmApi');
	const { fileContent, mimeType } = await downloadFile.call(this, url, 'video/mp4', {
		key: credentials.apiKey as string,
	});
	const binaryData = await this.helpers.prepareBinaryData(fileContent, 'video.mp4', mimeType);
	return [
		{
			binary: { [binaryPropertyOutput]: binaryData },
			json: {
				...binaryData,
				data: undefined,
			},
			pairedItem: { item: i },
		},
	];
}
