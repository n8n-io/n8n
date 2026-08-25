import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as getAll from './getAll.operation';

export { get, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['space'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a space',
				action: 'Get a space',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many spaces',
				action: 'Get many spaces',
			},
		],
		default: 'getAll',
	},
	...get.description,
	...getAll.description,
];
