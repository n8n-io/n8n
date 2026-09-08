import type { INodeProperties } from 'n8n-workflow';

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		options: [
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many events',
			},
		],
		displayOptions: {
			show: {
				resource: ['event'],
			},
		},
	},
];

export const eventFields: INodeProperties[] = [
	// ----------------------------------
	//       event: getAll
	// ----------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['getAll'],
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
		default: 10,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		options: [
			{
				displayName: 'Acting user ID',
				name: 'actingUserId',
				type: 'string',
				default: '',
				description: 'The unique identifier of the acting user',
				placeholder: '4a59c8c7-e05a-4d17-8e85-acc301343926',
			},
			{
				displayName: 'End date',
				name: 'end',
				type: 'dateTime',
				default: '',
				description: 'The end date for the search',
			},
			{
				displayName: 'Item ID',
				name: 'itemID',
				type: 'string',
				default: '',
				description: 'The unique identifier of the item that the event describes',
				placeholder: '5e59c8c7-e05a-4d17-8e85-acc301343926',
			},
			{
				displayName: 'Start date',
				name: 'start',
				type: 'dateTime',
				default: '',
				description: 'The start date for the search',
			},
		],
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['getAll'],
			},
		},
	},
];
