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
			name: 'Create Conversation Message',
			value: 'createMessage',
			description: 'Create a new conversation message',
			action: 'Create a conversation message',
		},
		{
			name: 'Execute Message SQL Query',
			value: 'executeMessageQuery',
			description: 'Execute a SQL query from a message attachment',
			action: 'Execute a message SQL query',
		},
		{
			name: 'Get Conversation Message',
			value: 'getMessage',
			description: 'Get a conversation message by ID',
			action: 'Get a conversation message',
		},
		{
			name: 'Get Genie Space',
			value: 'getSpace',
			description: 'Get details of a Genie space',
			action: 'Get a Genie space',
		},
		{
			name: 'Get Query Results',
			value: 'getQueryResults',
			description: 'Get results of a SQL query execution',
			action: 'Get query results',
		},
		{
			name: 'Start Conversation',
			value: 'startConversation',
			description: 'Start a new conversation',
			action: 'Start a conversation',
		},
	],
	default: 'startConversation',
};
