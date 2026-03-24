import type { INodeProperties } from 'n8n-workflow';

import * as generate from './generate.operation';

export { generate };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Generate an Image',
				value: 'generate',
				action: 'Generate an image',
				description: 'Use an image-capable model via chat completions',
			},
		],
		default: 'generate',
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
	},
	...generate.description,
];
