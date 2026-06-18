import type { INodeProperties } from 'n8n-workflow';

import * as message from './message.operation';

export { message };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['text'],
			},
		},
		options: [
			{
				name: 'Message a Model',
				value: 'message',
				action: 'Message a model',
				description: 'Create a completion with a Qwen model',
			},
		],
		default: 'message',
	},
	...message.description,
];
