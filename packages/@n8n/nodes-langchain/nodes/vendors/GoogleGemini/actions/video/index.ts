import { READ_ONLY_ANNOTATIONS, type INodeProperties } from 'n8n-workflow';

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
				// Uploads binary inputs and external URLs to the Gemini Files API.
				annotations: { effect: 'write', destructive: false, idempotent: false },
			},
			{
				name: 'Generate a Video',
				value: 'generate',
				action: 'Generate a video',
				description: 'Creates a video from a text prompt',
				// Starts a new long-running job and stores the generated video on Gemini.
				annotations: { effect: 'write', destructive: false, idempotent: false },
			},
			{
				name: 'Download Video',
				value: 'download',
				action: 'Download a video',
				description: 'Download a generated video from the Google Gemini API using a URL',
				annotations: READ_ONLY_ANNOTATIONS,
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
