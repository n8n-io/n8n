import {
	INodeProperties,
} from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all users',
				action: 'Get all users',
			},
		],
		default: 'getAll',
	},
];

export const userFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 user:getAll                                */
	/* -------------------------------------------------------------------------- */
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
					'user',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
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
					'user',
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
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'If provided, you\'ll get a filtered list of users that contain the provided string in their email address',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'If provided, you\'ll get a filtered list of users that contain the provided string in their name',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'ACTIVE',
					},
					{
						name: 'Inactive',
						value: 'INACTIVE',
					},
					{
						name: 'Pending',
						value: 'PENDING',
					},
					{
						name: 'Declined',
						value: 'DECLINED',
					},
				],
				default: '',
				description: 'If provided, you\'ll get a filtered list of users with the corresponding status',
			},
			{
				displayName: 'Sort Column',
				name: 'sort-column',
				type: 'options',
				options: [
					{
						name: 'Email',
						value: 'EMAIL',
					},
					{
						name: 'Name',
						value: 'NAME',
					},
					{
						name: 'Hourly Rate',
						value: 'HOURLYRATE',
					},
				],
				default: '',
			},
			{
				displayName: 'Sort Order',
				name: 'sort-order',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'ASCENDING',
					},
					{
						name: 'Descending',
						value: 'DESCENDING',
					},
				],
				default: '',
			},
		],
	},
];
