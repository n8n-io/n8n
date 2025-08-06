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
		],
		default: 'generate',
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
	},
	...analyze.description,
	...generate.description,
];
