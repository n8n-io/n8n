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
			routing: {
				request: {
					method: 'POST',
					url: '=/api/2.0/genie/spaces/{{$parameter.spaceId}}/conversations/{{$parameter.conversationId}}/messages',
					body: {
						content: '={{$parameter.message}}',
					},
				},
			},
		},
		{
			name: 'Get Conversation Message',
			value: 'getMessage',
			description: 'Get a conversation message by ID',
			action: 'Get a conversation message',
			routing: {
				request: {
					method: 'GET',
					url: '=/api/2.0/genie/spaces/{{$parameter.spaceId}}/conversations/{{$parameter.conversationId}}/messages/{{$parameter.messageId}}',
				},
			},
		},
		{
			name: 'Start Conversation',
			value: 'startConversation',
			description: 'Start a new conversation',
			action: 'Start a conversation',
			routing: {
				request: {
					method: 'POST',
					url: '=/api/2.0/genie/spaces/{{$parameter.spaceId}}/conversations',
					body: {
						initial_message: '={{$parameter.initialMessage}}',
					},
				},
			},
		},
		{
			name: 'Execute Message SQL Query',
			value: 'executeMessageQuery',
			description: 'Execute a SQL query from a message attachment',
			action: 'Execute a message SQL query',
			routing: {
				request: {
					method: 'POST',
					url: '=/api/2.0/genie/spaces/{{$parameter.spaceId}}/conversations/{{$parameter.conversationId}}/messages/{{$parameter.messageId}}/attachments/{{$parameter.attachmentId}}/execute-query',
				},
			},
		},
		{
			name: 'Get Query Results',
			value: 'getQueryResults',
			description: 'Get results of a SQL query execution',
			action: 'Get query results',
			routing: {
				request: {
					method: 'GET',
					url: '=/api/2.0/genie/spaces/{{$parameter.spaceId}}/conversations/{{$parameter.conversationId}}/messages/{{$parameter.messageId}}/attachments/{{$parameter.attachmentId}}/query-result',
				},
			},
		},
		{
			name: 'Get Genie Space',
			value: 'getSpace',
			description: 'Get details of a Genie space',
			action: 'Get a Genie space',
			routing: {
				request: {
					method: 'GET',
					url: '=/api/2.0/genie/spaces/{{$parameter.spaceId}}',
				},
			},
		},
	],
	default: 'startConversation',
};
