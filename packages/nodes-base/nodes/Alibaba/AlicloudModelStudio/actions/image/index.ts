import type { INodeProperties } from 'n8n-workflow';

import * as analyze from './analyze.operation';
import * as generate from './generate.operation';
import * as download from './download.operation';

export { analyze, generate, download };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'Analyze Image',
				value: 'analyze',
				action: 'Analyze image',
				description: 'Take in images and answer questions about them',
			},
			{
				name: 'Generate an Image',
				value: 'generate',
				action: 'Generate an image',
				description: 'Creates an image from a text prompt',
			},
			{
				name: 'Download Image',
				value: 'download',
				action: 'Download a generated image',
				description: 'Download a generated image from a URL',
			},
		],
		default: 'generate',
	},
	...analyze.description,
	...generate.description,
	...download.description,
];
