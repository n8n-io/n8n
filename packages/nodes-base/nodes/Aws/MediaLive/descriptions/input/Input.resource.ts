import type { INodeProperties } from 'n8n-workflow';

export const inputOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['input'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an input',
				action: 'Create an input',
				routing: {
					request: {
						method: 'POST',
						url: '/prod/inputs',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an input',
				action: 'Delete an input',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/prod/inputs/{{$parameter["inputId"]}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get information about an input',
				action: 'Get an input',
				routing: {
					request: {
						method: 'GET',
						url: '=/prod/inputs/{{$parameter["inputId"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List all inputs',
				action: 'Get many inputs',
				routing: {
					request: {
						method: 'GET',
						url: '/prod/inputs',
					},
				},
			},
		],
		default: 'create',
	},
];

export const inputFields: INodeProperties[] = [
	{
		displayName: 'Input ID',
		name: 'inputId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['input'],
				operation: ['get', 'delete'],
			},
		},
		default: '',
		description: 'The unique identifier of the input',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['input'],
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
		description: 'The name of the input',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['input'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'RTMP Push',
				value: 'RTMP_PUSH',
			},
			{
				name: 'RTMP Pull',
				value: 'RTMP_PULL',
			},
			{
				name: 'URL Pull',
				value: 'URL_PULL',
			},
			{
				name: 'MP4 File',
				value: 'MP4_FILE',
			},
			{
				name: 'RTP Push',
				value: 'INPUT_DEVICE',
			},
		],
		default: 'RTMP_PUSH',
		routing: {
			request: {
				body: {
					type: '={{ $value }}',
				},
			},
		},
		description: 'The input type',
	},
	{
		displayName: 'Sources',
		name: 'sources',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['input'],
				operation: ['create'],
			},
		},
		default: '[{"url": "rtmp://example.com/live/stream"}]',
		routing: {
			request: {
				body: {
					sources: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'Input sources (URLs)',
	},
	{
		displayName: 'Destinations',
		name: 'destinations',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['input'],
				operation: ['create'],
			},
		},
		default: '[{"streamName": "stream1"}]',
		routing: {
			request: {
				body: {
					destinations: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'Input destinations for RTMP_PUSH inputs',
	},
];
