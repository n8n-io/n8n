import type { INodeProperties } from 'n8n-workflow';
import { handleChimeError } from '../../helpers/errorHandler';

export const attendeeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		displayOptions: {
			show: {
				resource: ['attendee'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an attendee',
				routing: {
					request: {
						method: 'POST',
						url: '=/meetings/{{$parameter["meetingId"]}}/attendees',
					},
					output: {
						postReceive: [handleChimeError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an attendee',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/meetings/{{$parameter["meetingId"]}}/attendees/{{$parameter["attendeeId"]}}',
					},
					output: {
						postReceive: [handleChimeError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an attendee',
				routing: {
					request: {
						method: 'GET',
						url: '=/meetings/{{$parameter["meetingId"]}}/attendees/{{$parameter["attendeeId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Attendee',
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

export const attendeeFields: INodeProperties[] = [
	{
		displayName: 'Meeting ID',
		name: 'meetingId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['attendee'],
			},
		},
	},
	{
		displayName: 'Attendee ID',
		name: 'attendeeId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['attendee'],
				operation: ['delete', 'get'],
			},
		},
	},
	{
		displayName: 'External User ID',
		name: 'externalUserId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['attendee'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					ExternalUserId: '={{ $value }}',
				},
			},
		},
	},
];
