import type { INodeProperties } from 'n8n-workflow';
import { handleChimeError } from '../../helpers/errorHandler';

export const meetingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		displayOptions: {
			show: {
				resource: ['meeting'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a meeting',
				routing: {
					request: {
						method: 'POST',
						url: '/meetings',
					},
					output: {
						postReceive: [handleChimeError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a meeting',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/meetings/{{$parameter["meetingId"]}}',
					},
					output: {
						postReceive: [handleChimeError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a meeting',
				routing: {
					request: {
						method: 'GET',
						url: '=/meetings/{{$parameter["meetingId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Meeting',
								},
							},
							handleChimeError,
						],
					},
				},
			},
		],
	},
];

export const meetingFields: INodeProperties[] = [
	{
		displayName: 'Meeting ID',
		name: 'meetingId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['meeting'],
				operation: ['delete', 'get'],
			},
		},
	},
	{
		displayName: 'Client Request Token',
		name: 'clientRequestToken',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['meeting'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					ClientRequestToken: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'External Meeting ID',
		name: 'externalMeetingId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['meeting'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					ExternalMeetingId: '={{ $value }}',
				},
			},
		},
	},
];
