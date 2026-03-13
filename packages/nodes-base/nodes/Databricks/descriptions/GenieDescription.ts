import type { INodeProperties } from 'n8n-workflow';

export const genieOperations: INodeProperties[] = [
	{
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
				description: 'Post a follow-up message to an existing conversation',
				action: 'Create a conversation message',
			},
			{
				name: 'Execute Message SQL Query',
				value: 'executeSqlQuery',
				description: 'Execute the SQL query associated with a message',
				action: 'Execute a message SQL query',
			},
			{
				name: 'Get Conversation Message',
				value: 'getMessage',
				description: 'Get the status and content of a conversation message',
				action: 'Get a conversation message',
			},
			{
				name: 'Get Query Result',
				value: 'getQueryResult',
				description: 'Get the query result for a message attachment',
				action: 'Get a query result',
			},
			{
				name: 'Get Space',
				value: 'getSpace',
				description: 'Get information about a Genie space',
				action: 'Get a Genie space',
			},
			{
				name: 'Start Conversation',
				value: 'startConversation',
				description:
					'Start a new conversation in a Genie space with an initial message. Polls automatically until a response is ready.',
				action: 'Start a Genie conversation',
			},
		],
		default: 'startConversation',
	},
];

export const genieFields: INodeProperties[] = [
	// ----------------------------------------
	// genie: spaceId — shared across all ops
	// ----------------------------------------
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the Genie space',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: [
					'startConversation',
					'createMessage',
					'getMessage',
					'executeSqlQuery',
					'getQueryResult',
					'getSpace',
				],
			},
		},
	},

	// ----------------------------------------
	//        genie: startConversation
	// ----------------------------------------
	{
		displayName: 'Initial Message',
		name: 'initialMessage',
		type: 'string',
		required: true,
		default: '',
		description: 'The opening natural-language question or message',
		typeOptions: {
			rows: 3,
		},
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['startConversation'],
			},
		},
	},

	// ----------------------------------------
	//        genie: createMessage
	// ----------------------------------------
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the conversation to add a message to',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['createMessage'],
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		required: true,
		default: '',
		description: 'The message content to send',
		typeOptions: {
			rows: 3,
		},
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['createMessage'],
			},
		},
	},

	// ----------------------------------------
	//         genie: getMessage
	// ----------------------------------------
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the conversation',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['getMessage'],
			},
		},
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the message',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['getMessage'],
			},
		},
	},

	// ----------------------------------------
	//       genie: executeSqlQuery
	// ----------------------------------------
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the conversation',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['executeSqlQuery'],
			},
		},
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the message whose SQL query to execute',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['executeSqlQuery'],
			},
		},
	},

	// ----------------------------------------
	//        genie: getQueryResult
	// ----------------------------------------
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the conversation',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['getQueryResult'],
			},
		},
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the message',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['getQueryResult'],
			},
		},
	},
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the query attachment to retrieve results for',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['getQueryResult'],
			},
		},
	},
];
