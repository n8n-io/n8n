import type { INodeProperties } from 'n8n-workflow';

import * as analyze from './analyze.operation';
import * as download from './download.operation';
import * as generate from './generate.operation';

export { analyze, download, generate };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Analyze Video',
				value: 'analyze',
				action: 'Analyze video',
				description: 'Take in videos and answer questions about them',
			},
			{
				name: 'Generate a Video',
				value: 'generate',
				action: 'Generate a video',
				description: 'Creates a video from a text prompt',
			},
			{
				name: 'Download Video',
				value: 'download',
				action: 'Download a video',
				description: 'Download a generated video from the Google Gemini API using a URL',
			},
		],
		default: 'generate',
		displayOptions: {
			show: {
				resource: ['video'],
			},
		},
	},
	...analyze.description,
	...download.description,
	...generate.description,
];
