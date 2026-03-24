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
				name: 'Analyze a File',
				value: 'analyze',
				action: 'Analyze a file',
				description: 'Ask questions about a file via a public URL',
			},
		],
		default: 'analyze',
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
	},
	...analyze.description,
];
