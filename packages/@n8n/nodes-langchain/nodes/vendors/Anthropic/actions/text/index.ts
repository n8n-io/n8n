import type { INodeProperties } from 'n8n-workflow';

import * as message from './message.operation';

export { message };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Message a Model',
				value: 'message',
				action: 'Message a model',
				description: 'Create a completion with Anthropic model',
				// Connected tools can change external data, so keep the default annotations.
			},
		],
		default: 'message',
		displayOptions: {
			show: {
				resource: ['text'],
			},
		},
	},
	...message.description,
];
