import type { INodeProperties } from 'n8n-workflow';
import { handleIoTAnalyticsError } from '../../helpers/errorHandler';

export const channelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['channel'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a channel',
				routing: {
					request: {
						method: 'POST',
						url: '/channels',
					},
					output: {
						postReceive: [handleIoTAnalyticsError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a channel',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/channels/{{$parameter["channelName"]}}',
					},
					output: {
						postReceive: [handleIoTAnalyticsError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe a channel',
				routing: {
					request: {
						method: 'GET',
						url: '=/channels/{{$parameter["channelName"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'channel',
								},
							},
							handleIoTAnalyticsError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				action: 'List channels',
				routing: {
					request: {
						method: 'GET',
						url: '/channels',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'channelSummaries',
								},
							},
							handleIoTAnalyticsError,
						],
					},
				},
			},
		],
	},
];

export const channelFields: INodeProperties[] = [
	{
		displayName: 'Channel Name',
		name: 'channelName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['create', 'delete', 'describe'],
			},
		},
		routing: {
			request: {
				body: {
					channelName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Retention Period',
		name: 'retentionPeriod',
		type: 'json',
		default: '{"unlimited": true}',
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					retentionPeriod: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];
