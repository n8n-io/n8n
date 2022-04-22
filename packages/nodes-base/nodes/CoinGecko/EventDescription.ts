import {
	INodeProperties,
} from 'n8n-workflow';

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all events',
			},
		],
		default: 'getAll',
	},
];

export const eventFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'event',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'event',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'event',
				],
			},
		},
		options: [
			{
				displayName: 'Country code',
				name: 'country_code',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEventCountryCodes',
				},
				default: '',
				description: 'Country code of event.',
			},
			{
				displayName: 'From date',
				name: 'from_date',
				type: 'dateTime',
				default: '',
				description: 'Lists events after this date.',
			},
			{
				displayName: 'To date',
				name: 'to_date',
				type: 'dateTime',
				default: '',
				description: 'Lists events before this date.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEventTypes',
				},
				default: '',
				description: 'Type of event.',
			},
			{
				displayName: 'Upcoming events only',
				name: 'upcoming_events_only',
				type: 'boolean',
				default: true,
				description: 'Lists only upcoming events.',
			},
		],
	},
];
