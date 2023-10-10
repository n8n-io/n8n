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
				authentication: ['webhook'],
			},
		},
		options: [
			{
				name: 'Send a Message',
				value: 'sendLegacy',
				description: 'Send a message to a channel using the webhook',
				action: 'Send a message',
			},
		],
		default: 'sendLegacy',
	},
	...sendLegacy.description,
];
