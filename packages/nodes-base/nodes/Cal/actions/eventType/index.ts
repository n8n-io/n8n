import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as getMany from './getMany.operation';

export { get, getMany };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['eventType'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an event type',
				action: 'Get an event type',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve many event types',
				action: 'Get many event types',
			},
		],
		default: 'getMany',
	},
	...get.description,
	...getMany.description,
];
