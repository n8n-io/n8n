import type { INodeProperties } from 'n8n-workflow';

import * as getPaginated from './getPaginated.operation';

export { getPaginated };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['extraction'],
			},
		},
		options: [
			{
				name: 'Get Paginated',
				value: 'getPaginated',
				description: 'Get data from a paginated source',
				action: 'Get paginated data',
			},
		],
		default: 'getPaginated',
	},
	...getPaginated.description,
];
