import type { INodeProperties } from 'n8n-workflow';

export const genieOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['genie'],
		},
	},
	options: [
		{
			name: 'Create conversation message',
			value: 'createMessage',
			description: 'Create a new conversation message',
			action: 'Create a conversation message',
		},
		{
			name: 'Execute message SQL query',
			value: 'executeMessageQuery',
			description: 'Execute a SQL query from a message attachment',
			action: 'Execute a message SQL query',
		},
		{
			name: 'Get conversation message',
			value: 'getMessage',
			description: 'Get a conversation message by ID',
			action: 'Get a conversation message',
		},
		{
			name: 'Get Genie space',
			value: 'getSpace',
			description: 'Get details of a Genie space',
			action: 'Get a Genie space',
		},
		{
			name: 'Get query results',
			value: 'getQueryResults',
			description: 'Get results of a SQL query execution',
			action: 'Get query results',
		},
		{
			name: 'Start conversation',
			value: 'startConversation',
			description: 'Start a new conversation',
			action: 'Start a conversation',
		},
	],
	default: 'startConversation',
};
