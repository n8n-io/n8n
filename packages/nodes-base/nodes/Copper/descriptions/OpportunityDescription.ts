import type { INodeProperties } from 'n8n-workflow';

export const opportunityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['opportunity'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an opportunity',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an opportunity',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an opportunity',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many opportunities',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an opportunity',
			},
		],
		default: 'create',
	},
];

export const opportunityFields: INodeProperties[] = [
	// ----------------------------------------
	//           opportunity: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the opportunity to create',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Customer Source ID',
		name: 'customerSourceId',
		type: 'string',
		default: '',
		description: 'ID of the customer source that generated this opportunity',
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Primary Contact ID',
		name: 'primaryContactId',
		type: 'string',
		default: '',
		description: 'ID of the primary company associated with this opportunity',
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['create'],
			},
		},
	},

	// ----------------------------------------
	//           opportunity: delete
	// ----------------------------------------
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		description: 'ID of the opportunity to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//             opportunity: get
	// ----------------------------------------
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		description: 'ID of the opportunity to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//           opportunity: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filterFields',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Company IDs',
				name: 'company_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated IDs of the primary companies to filter by',
			},
			{
				displayName: 'Customer Source IDs',
				name: 'customer_source_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated IDs of the customer sources to filter by',
			},
		],
	},

	// ----------------------------------------
	//           opportunity: update
	// ----------------------------------------
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		description: 'ID of the opportunity to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Customer Source ID',
				name: 'customer_source_id',
				type: 'string',
				default: '',
				description: 'ID of the primary company associated with this opportunity',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name to set for the opportunity',
			},
			{
				displayName: 'Primary Contact ID',
				name: 'primary_contact_id',
				type: 'string',
				default: '',
				description: 'ID of the customer source that generated this opportunity',
			},
		],
	},
];
