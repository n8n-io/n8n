import type { INodeProperties } from 'n8n-workflow';

import * as sendLegacy from './sendLegacy.operation';

export { sendLegacy };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['webhook'],
				authentication: ['webhook'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'sendLegacy',
				description: 'Send a message to a channel using webhook',
				action: 'Send a message to a channel using webhook',
			},
		],
		default: 'sendLegacy',
	},
	...sendLegacy.description,
];
