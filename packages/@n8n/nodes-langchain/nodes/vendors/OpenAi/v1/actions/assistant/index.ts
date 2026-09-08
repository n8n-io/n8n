import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteAssistant from './deleteAssistant.operation';
import * as list from './list.operation';
import * as message from './message.operation';
import * as update from './update.operation';

export { create, deleteAssistant, message, list, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create an assistant',
				value: 'create',
				action: 'Create an assistant',
				description: 'Create a new assistant',
			},
			{
				name: 'Delete an assistant',
				value: 'deleteAssistant',
				action: 'Delete an assistant',
				description: 'Delete an assistant from the account',
			},
			{
				name: 'List assistants',
				value: 'list',
				action: 'List assistants',
				description: 'List assistants in the organization',
			},
			{
				name: 'Message an assistant',
				value: 'message',
				action: 'Message an assistant',
				description: 'Send messages to an assistant',
			},
			{
				name: 'Update an assistant',
				value: 'update',
				action: 'Update an assistant',
				description: 'Update an existing assistant',
			},
		],
		default: 'message',
		displayOptions: {
			show: {
				resource: ['assistant'],
			},
		},
	},

	...create.description,
	...deleteAssistant.description,
	...message.description,
	...list.description,
	...update.description,
];
