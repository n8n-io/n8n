import type { INodeProperties } from 'n8n-workflow';

export const reportOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['report'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get an event report',
				action: 'Get a report',
			},
		],
		default: 'get',
	},
];

export const reportFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                   report:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Event Name or ID',
		name: 'eventId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getEvents',
		},
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
			},
		},
		default: '',
	},
	{
		displayName: 'Session Name or ID',
		name: 'dateId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getEventSessions',
			loadOptionsDependsOn: ['eventId'],
		},
		default: '',
		required: true,
		description:
			'ID of the session. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Attended',
						value: 'attended',
					},
					{
						name: 'Banned',
						value: 'banned',
					},
					{
						name: 'Completed',
						value: 'completed',
					},
					{
						name: 'Did Not Attend',
						value: 'did-not-attend',
					},
					{
						name: 'Left Early',
						value: 'left-early',
					},
				],
				default: '',
				description: 'Filter results by participation status',
			},
		],
	},
];
