import type { INodeProperties } from 'n8n-workflow';

import * as analyze from './analyze.operation';
import * as generate from './generate.operation';

export { analyze, generate };

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
		],
		default: 'generate',
		displayOptions: {
			show: {
				resource: ['video'],
			},
		},
	},
	...analyze.description,
	...generate.description,
];
