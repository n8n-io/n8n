import type { INodeProperties } from 'n8n-workflow';

import * as getMany from './getMany.operation';

export { getMany };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['slot'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve many available time slots',
				action: 'Get many slots',
			},
		],
		default: 'getMany',
	},
	...getMany.description,
];
