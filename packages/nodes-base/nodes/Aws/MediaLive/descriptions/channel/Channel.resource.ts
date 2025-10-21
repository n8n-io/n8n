import type { INodeProperties } from 'n8n-workflow';

export const channelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['channel'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a video channel',
				action: 'Create a channel',
				routing: {
					request: {
						method: 'POST',
						url: '/prod/channels',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a channel',
				action: 'Delete a channel',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/prod/channels/{{$parameter["channelId"]}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get information about a channel',
				action: 'Get a channel',
				routing: {
					request: {
						method: 'GET',
						url: '=/prod/channels/{{$parameter["channelId"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List all channels',
				action: 'Get many channels',
				routing: {
					request: {
						method: 'GET',
						url: '/prod/channels',
					},
				},
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start a channel',
				action: 'Start a channel',
				routing: {
					request: {
						method: 'POST',
						url: '=/prod/channels/{{$parameter["channelId"]}}/start',
					},
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop a channel',
				action: 'Stop a channel',
				routing: {
					request: {
						method: 'POST',
						url: '=/prod/channels/{{$parameter["channelId"]}}/stop',
					},
				},
			},
		],
		default: 'create',
	},
];

export const channelFields: INodeProperties[] = [
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['get', 'delete', 'start', 'stop'],
			},
		},
		default: '',
		description: 'The unique identifier of the channel',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
				},
			},
		},
		description: 'The name of the channel',
	},
	{
		displayName: 'Channel Class',
		name: 'channelClass',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Standard',
				value: 'STANDARD',
			},
			{
				name: 'Single Pipeline',
				value: 'SINGLE_PIPELINE',
			},
		],
		default: 'STANDARD',
		routing: {
			request: {
				body: {
					channelClass: '={{ $value }}',
				},
			},
		},
		description: 'The channel class',
	},
	{
		displayName: 'Input Attachments',
		name: 'inputAttachments',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['create'],
			},
		},
		default: '[{"inputId": "input-id-here", "inputSettings": {}}]',
		routing: {
			request: {
				body: {
					inputAttachments: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'Input attachments for the channel',
	},
	{
		displayName: 'Destinations',
		name: 'destinations',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['create'],
			},
		},
		default: '[{"id": "destination1", "settings": [{"url": "rtmp://example.com/live"}]}]',
		routing: {
			request: {
				body: {
					destinations: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'Output destinations for the channel',
	},
	{
		displayName: 'Encoder Settings',
		name: 'encoderSettings',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['create'],
			},
		},
		default: '{"audioDescriptions": [], "videoDescriptions": [], "outputGroups": []}',
		routing: {
			request: {
				body: {
					encoderSettings: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'Encoder settings for video processing',
	},
	{
		displayName: 'Role ARN',
		name: 'roleArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					roleArn: '={{ $value }}',
				},
			},
		},
		description: 'The IAM role ARN for the channel',
	},
];
