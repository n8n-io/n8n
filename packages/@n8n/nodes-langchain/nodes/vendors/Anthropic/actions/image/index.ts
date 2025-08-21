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
				description: 'Take in images and answer questions about them',
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
