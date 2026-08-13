import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';

export { get };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['page'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a page, optionally with its full sub-tree',
				action: 'Get a page',
			},
		],
		default: 'get',
	},
	...get.description,
];
