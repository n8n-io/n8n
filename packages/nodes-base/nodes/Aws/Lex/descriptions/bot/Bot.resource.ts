import type { INodeProperties } from 'n8n-workflow';
import { handleLexError } from '../../helpers/errorHandler';

export const botOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['bot'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new bot',
				action: 'Create a bot',
				routing: {
					request: {
						method: 'PUT',
						url: '=/bots/{{$parameter["botName"]}}',
					},
					output: {
						postReceive: [handleLexError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a bot',
				action: 'Delete a bot',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/bots/{{$parameter["botName"]}}',
					},
					output: {
						postReceive: [handleLexError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of a bot',
				action: 'Get a bot',
				routing: {
					request: {
						method: 'GET',
						url: '=/bots/{{$parameter["botName"]}}',
					},
					output: {
						postReceive: [handleLexError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all bots',
				action: 'List bots',
				routing: {
					request: {
						method: 'GET',
						url: '/bots',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'bots',
								},
							},
							handleLexError,
						],
					},
				},
			},
		],
	},
];

export const botFields: INodeProperties[] = [
	{
		displayName: 'Bot Name',
		name: 'botName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['bot'],
				operation: ['create', 'delete', 'get'],
			},
		},
		description: 'The name of the bot',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['bot'],
				operation: ['create'],
			},
		},
		description: 'A description of the bot',
		routing: {
			request: {
				body: {
					description: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Locale',
		name: 'locale',
		type: 'options',
		required: true,
		default: 'en_US',
		displayOptions: {
			show: {
				resource: ['bot'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'English (US)',
				value: 'en_US',
			},
			{
				name: 'English (GB)',
				value: 'en_GB',
			},
			{
				name: 'Spanish (US)',
				value: 'es_US',
			},
			{
				name: 'French (FR)',
				value: 'fr_FR',
			},
			{
				name: 'German (DE)',
				value: 'de_DE',
			},
		],
		description: 'The locale for the bot',
		routing: {
			request: {
				body: {
					locale: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Child Directed',
		name: 'childDirected',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['bot'],
				operation: ['create'],
			},
		},
		description: 'Whether the bot is directed toward children under 13',
		routing: {
			request: {
				body: {
					childDirected: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Idle Session TTL',
		name: 'idleSessionTTLInSeconds',
		type: 'number',
		default: 300,
		displayOptions: {
			show: {
				resource: ['bot'],
				operation: ['create'],
			},
		},
		description: 'The time in seconds that a session remains active after last use',
		routing: {
			request: {
				body: {
					idleSessionTTLInSeconds: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Voice ID',
		name: 'voiceId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['bot'],
				operation: ['create'],
			},
		},
		description: 'The Amazon Polly voice ID to use for voice interaction',
		routing: {
			request: {
				body: {
					voiceId: '={{ $value }}',
				},
			},
		},
	},
];
