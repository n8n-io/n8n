import type { INodeProperties } from 'n8n-workflow';

import * as createAssistant from './createAssistant.operation';
import * as deleteAssistant from './deleteAssistant.operation';
import * as messageAssistant from './messageAssistant.operation';
import * as listAssistants from './listAssistants.operation';
import * as updateAssistant from './updateAssistant.operation';

export { createAssistant, deleteAssistant, messageAssistant, listAssistants, updateAssistant };

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
				name: 'Delete an Assistant',
				value: 'deleteAssistant',
				action: 'Delete an assistant',
				description: 'Delete an assistant from the account',
			},
			{
				name: 'List Assistants',
				value: 'listAssistants',
				action: 'List assistants',
				description: 'List assistants in the organization',
			},
			{
				name: 'Message an Assistant',
				value: 'messageAssistant',
				action: 'Message an assistant',
				description: 'Send messages to an assistant',
			},
			{
				name: 'Update an Assistant',
				value: 'updateAssistant',
				action: 'Update an assistant',
				description: 'Update an existing assistant',
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
	...deleteAssistant.description,
	...messageAssistant.description,
	...listAssistants.description,
	...updateAssistant.description,
];
