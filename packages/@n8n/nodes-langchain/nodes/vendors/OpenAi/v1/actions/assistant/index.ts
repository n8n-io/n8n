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
				name: 'Create an Assistant',
				value: 'create',
				action: 'Create an assistant',
				description: 'Create a new assistant',
			},
			{
				name: 'Delete an Assistant',
				value: 'deleteAssistant',
				action: 'Delete an assistant',
				description: 'Delete an assistant from the account',
			},
			{
				name: 'List Assistants',
				value: 'list',
				action: 'List assistants',
				description: 'List assistants in the organization',
			},
			{
				name: 'Message an Assistant',
				value: 'message',
				action: 'Message an assistant',
				description: 'Send messages to an assistant',
			},
			{
				name: 'Update an Assistant',
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
