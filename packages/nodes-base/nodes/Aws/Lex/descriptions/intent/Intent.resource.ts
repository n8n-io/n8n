import type { INodeProperties } from 'n8n-workflow';
import { handleLexError } from '../../helpers/errorHandler';

export const intentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['intent'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new intent',
				action: 'Create an intent',
				routing: {
					request: {
						method: 'PUT',
						url: '=/bots/{{$parameter["botName"]}}/intents/{{$parameter["intentName"]}}',
					},
					output: {
						postReceive: [handleLexError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an intent',
				action: 'Delete an intent',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/bots/{{$parameter["botName"]}}/intents/{{$parameter["intentName"]}}',
					},
					output: {
						postReceive: [handleLexError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of an intent',
				action: 'Get an intent',
				routing: {
					request: {
						method: 'GET',
						url: '=/bots/{{$parameter["botName"]}}/intents/{{$parameter["intentName"]}}',
					},
					output: {
						postReceive: [handleLexError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all intents for a bot',
				action: 'List intents',
				routing: {
					request: {
						method: 'GET',
						url: '=/bots/{{$parameter["botName"]}}/intents',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'intents',
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

export const intentFields: INodeProperties[] = [
	{
		displayName: 'Bot Name',
		name: 'botName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['intent'],
			},
		},
		description: 'The name of the bot that contains the intent',
	},
	{
		displayName: 'Intent Name',
		name: 'intentName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['intent'],
				operation: ['create', 'delete', 'get'],
			},
		},
		description: 'The name of the intent',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['intent'],
				operation: ['create'],
			},
		},
		description: 'A description of the intent',
		routing: {
			request: {
				body: {
					description: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Sample Utterances',
		name: 'sampleUtterances',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['intent'],
				operation: ['create'],
			},
		},
		description: 'Comma-separated list of sample utterances',
		routing: {
			request: {
				body: {
					sampleUtterances: '={{ $value.split(",").map(s => s.trim()) }}',
				},
			},
		},
	},
	{
		displayName: 'Fulfillment Activity',
		name: 'fulfillmentActivity',
		type: 'json',
		default: '{"type": "ReturnIntent"}',
		displayOptions: {
			show: {
				resource: ['intent'],
				operation: ['create'],
			},
		},
		description: 'Fulfillment activity configuration (JSON format)',
		routing: {
			request: {
				body: {
					fulfillmentActivity: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];
