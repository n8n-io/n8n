import { INodeProperties } from 'n8n-workflow';

export const reportOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'report',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get an event report',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const reportFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                   report:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getEvents',
		},
		displayOptions: {
			show: {
				resource: [
					'report',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Event ID',
	},
	{
		displayName: 'Session ID',
		name: 'dateId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getEventSessions',
			loadOptionsDependsOn: [
				'eventId',
			],
		},
		default: '',
		required: true,
		description: 'ID of the session',
		displayOptions: {
			show: {
				resource: [
					'report',
				],
				operation: [
					'get',
				],
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
				resource: [
					'report',
				],
				operation: [
					'get',
				],
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
