import type { INodeProperties } from 'n8n-workflow';

import * as analyze from './analyze.operation';

export { analyze };

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
				description: 'Analyze an image and answer questions about it',
			},
		],
		default: 'analyze',
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
	},
	...analyze.description,
];
