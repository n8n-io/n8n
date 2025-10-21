import type { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a contact',
				action: 'Cancel a contact',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/contact/{{$parameter["contactId"]}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get contact details',
				action: 'Get a contact',
				routing: {
					request: {
						method: 'GET',
						url: '=/contact/{{$parameter["contactId"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List contacts',
				action: 'Get many contacts',
				routing: {
					request: {
						method: 'POST',
						url: '/contacts',
					},
				},
			},
			{
				name: 'Reserve',
				value: 'reserve',
				description: 'Reserve a contact',
				action: 'Reserve a contact',
				routing: {
					request: {
						method: 'POST',
						url: '/contact',
					},
				},
			},
		],
		default: 'get',
	},
];

export const contactFields: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get', 'cancel'],
			},
		},
		default: '',
		description: 'The unique identifier of the contact',
	},
	{
		displayName: 'Ground Station',
		name: 'groundStation',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['reserve'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					groundStation: '={{ $value }}',
				},
			},
		},
		description: 'The ground station for the contact',
	},
	{
		displayName: 'Mission Profile ARN',
		name: 'missionProfileArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['reserve'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					missionProfileArn: '={{ $value }}',
				},
			},
		},
		description: 'The ARN of the mission profile',
	},
	{
		displayName: 'Satellite ARN',
		name: 'satelliteArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['reserve'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					satelliteArn: '={{ $value }}',
				},
			},
		},
		description: 'The ARN of the satellite',
	},
	{
		displayName: 'Start Time',
		name: 'startTime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['reserve'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					startTime: '={{ new Date($value).toISOString() }}',
				},
			},
		},
		description: 'The start time of the contact',
	},
	{
		displayName: 'End Time',
		name: 'endTime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['reserve'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					endTime: '={{ new Date($value).toISOString() }}',
				},
			},
		},
		description: 'The end time of the contact',
	},
	{
		displayName: 'Status Filter',
		name: 'statusList',
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				name: 'Available',
				value: 'AVAILABLE',
			},
			{
				name: 'Scheduled',
				value: 'SCHEDULED',
			},
			{
				name: 'Cancelled',
				value: 'CANCELLED',
			},
			{
				name: 'Completed',
				value: 'COMPLETED',
			},
			{
				name: 'Failed',
				value: 'FAILED',
			},
		],
		default: [],
		routing: {
			request: {
				body: {
					statusList: '={{ $value }}',
				},
			},
		},
		description: 'Filter contacts by status',
	},
	{
		displayName: 'Start Time',
		name: 'startTime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getMany'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					startTime: '={{ new Date($value).toISOString() }}',
				},
			},
		},
		description: 'Filter contacts starting after this time',
	},
	{
		displayName: 'End Time',
		name: 'endTime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getMany'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					endTime: '={{ new Date($value).toISOString() }}',
				},
			},
		},
		description: 'Filter contacts ending before this time',
	},
];
