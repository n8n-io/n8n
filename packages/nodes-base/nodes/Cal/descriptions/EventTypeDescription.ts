import type { INodeProperties } from 'n8n-workflow';

const showOnlyForEventTypes = {
	resource: ['eventType'],
};

// `/event-types` is not on the same API-version stamp as `/bookings`: it returns
// 404 for 2024-08-13 and expects 2024-06-14, which is why the header is set per
// operation rather than in `requestDefaults`.
const EVENT_TYPES_API_VERSION = '2024-06-14';

export const eventTypeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForEventTypes,
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many event types',
				description: 'Retrieve the event types that can be booked on this account',
				routing: {
					request: {
						method: 'GET',
						url: '/event-types',
						headers: { 'cal-api-version': EVENT_TYPES_API_VERSION },
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
						],
					},
				},
			},
		],
		default: 'getAll',
	},
];

const eventTypeGetAllFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				...showOnlyForEventTypes,
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		// `/event-types` returns the full set in one response and takes no
		// offset parameters, so the limit is applied to the returned items
		// rather than sent to the API.
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				...showOnlyForEventTypes,
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		default: 50,
		description: 'Max number of results to return',
		routing: {
			output: {
				postReceive: [
					{
						type: 'limit',
						properties: {
							maxResults: '={{ $value }}',
						},
					},
				],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				...showOnlyForEventTypes,
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				description: 'Only return event types belonging to this Cal.com username',
				routing: {
					send: {
						type: 'query',
						property: 'username',
					},
				},
			},
		],
	},
];

export const eventTypeFields: INodeProperties[] = [...eventTypeGetAllFields];
