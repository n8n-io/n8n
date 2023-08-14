import * as get from './get';

import type { INodeProperties } from 'n8n-workflow';

export { get };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['companyReport'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a company report',
				action: 'Get a company report',
			},
		],
		default: 'get',
	},
	...get.description,
];
