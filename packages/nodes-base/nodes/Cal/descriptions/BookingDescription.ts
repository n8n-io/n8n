import type { INodeProperties } from 'n8n-workflow';

const showOnlyForBookings = {
	resource: ['booking'],
};

// The Cal.com API v2 pins breaking changes to a date-stamped header rather than
// the URL, and the stamp differs per endpoint, so it is set per operation
// instead of in `requestDefaults`. `/bookings` requires 2024-08-13; sending the
// event-type stamp here returns the pre-2024-08-13 response shape.
const BOOKINGS_API_VERSION = '2024-08-13';

export const bookingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForBookings,
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a booking',
				description: 'Cancel an existing booking',
				routing: {
					request: {
						method: 'POST',
						url: '=/bookings/{{ $parameter.bookingUid }}/cancel',
						headers: { 'cal-api-version': BOOKINGS_API_VERSION },
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
			{
				name: 'Get',
				value: 'get',
				action: 'Get a booking',
				description: 'Retrieve a single booking by its UID',
				routing: {
					request: {
						method: 'GET',
						url: '=/bookings/{{ $parameter.bookingUid }}',
						headers: { 'cal-api-version': BOOKINGS_API_VERSION },
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
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many bookings',
				description: 'Retrieve many bookings',
				routing: {
					request: {
						method: 'GET',
						url: '/bookings',
						headers: { 'cal-api-version': BOOKINGS_API_VERSION },
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
					operations: {
						pagination: {
							type: 'offset',
							properties: {
								limitParameter: 'take',
								offsetParameter: 'skip',
								pageSize: 100,
								type: 'query',
							},
						},
					},
				},
			},
		],
		default: 'getAll',
	},
];

const bookingGetAllFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				...showOnlyForBookings,
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		routing: {
			send: {
				paginate: '={{ $value }}',
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				...showOnlyForBookings,
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		default: 50,
		description: 'Max number of results to return',
		routing: {
			send: {
				type: 'query',
				property: 'take',
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
				...showOnlyForBookings,
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Attendee Email',
				name: 'attendeeEmail',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Only return bookings whose attendee has this email address',
				routing: {
					send: {
						type: 'query',
						property: 'attendeeEmail',
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Cancelled',
						value: 'cancelled',
					},
					{
						name: 'Past',
						value: 'past',
					},
					{
						name: 'Upcoming',
						value: 'upcoming',
					},
				],
				default: 'upcoming',
				description: 'Only return bookings with this status',
				routing: {
					send: {
						type: 'query',
						property: 'status',
					},
				},
			},
		],
	},
];

const bookingGetFields: INodeProperties[] = [
	{
		displayName: 'Booking UID',
		name: 'bookingUid',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForBookings,
				operation: ['get'],
			},
		},
		default: '',
		description: 'UID of the booking to retrieve',
	},
];

const bookingCancelFields: INodeProperties[] = [
	{
		displayName: 'Booking UID',
		name: 'bookingUid',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForBookings,
				operation: ['cancel'],
			},
		},
		default: '',
		description: 'UID of the booking to cancel',
	},
	{
		displayName: 'Cancellation Reason',
		name: 'cancellationReason',
		type: 'string',
		displayOptions: {
			show: {
				...showOnlyForBookings,
				operation: ['cancel'],
			},
		},
		default: '',
		description: 'Reason for the cancellation, shown to the attendee',
		routing: {
			send: {
				type: 'body',
				property: 'cancellationReason',
			},
		},
	},
];

export const bookingFields: INodeProperties[] = [
	...bookingGetAllFields,
	...bookingGetFields,
	...bookingCancelFields,
];
