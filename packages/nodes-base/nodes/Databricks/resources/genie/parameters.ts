import type { INodeProperties } from 'n8n-workflow';

export const genieParameters: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the Genie space',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: [
					'startConversation',
					'getSpace',
					'createMessage',
					'getQueryResults',
					'executeMessageQuery',
					'getMessage',
				],
			},
		},
	},
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the conversation',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['createMessage', 'getQueryResults', 'executeMessageQuery', 'getMessage'],
			},
		},
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the message',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['getMessage', 'executeMessageQuery', 'getQueryResults'],
			},
		},
	},
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the message attachment',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['executeMessageQuery', 'getQueryResults'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		description: 'The message to be sent to Genie Space',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['createMessage'],
			},
		},
	},
	{
		displayName: 'Initial Message',
		name: 'initialMessage',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		description: 'The initial message to start the conversation',
		displayOptions: {
			show: {
				resource: ['genie'],
				operation: ['startConversation'],
			},
		},
	},
];
