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
				resource: ['attachment'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List the attachments on a page, optionally downloading each file',
				action: 'Get many attachments',
			},
		],
		default: 'getMany',
	},
	...getMany.description,
];
