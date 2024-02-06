import type { INodeProperties } from 'n8n-workflow';

import * as createAssistant from './createAssistant.operation';
import * as messageAssistant from './messageAssistant.operation';

export { createAssistant, messageAssistant };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create an Assistant',
				value: 'createAssistant',
				action: 'Create an assistant',
				description: 'Create a new assistant',
			},
			{
				name: 'Message an Assistant',
				value: 'messageAssistant',
				action: 'Message an assistant',
				description: 'Send messages to an assistant',
			},
		],
		default: 'messageModel',
		displayOptions: {
			show: {
				resource: ['assistant'],
			},
		},
	},

	...createAssistant.description,
	...messageAssistant.description,
];
