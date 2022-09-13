import { INodeProperties } from 'n8n-workflow';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an account',
				action: 'Create an account',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an account',
				action: 'Delete an account',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an account',
				action: 'Get an account',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all accounts',
				action: 'Get all accounts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an account',
				action: 'Update an account',
			},
		],
		default: 'create',
	},
];

export const accountFields: INodeProperties[] = [
	// ----------------------------------------
	//             account: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the account',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Address of the account',
			},
			{
				displayName: 'Annual Revenue',
				name: 'annual_revenue',
				type: 'number',
				default: 0,
				description: 'Annual revenue of the account',
			},
			{
				displayName: 'Business Type Name or ID',
				name: 'business_type_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getBusinessTypes',
				},
				description:
					'ID of the business that the account belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'City that the account belongs to',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country that the account belongs to',
			},
			{
				displayName: 'Facebook',
				name: 'facebook',
				type: 'string',
				default: '',
				description: 'Facebook username of the account',
			},
			{
				displayName: 'Industry Type Name or ID',
				name: 'industry_type_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getIndustryTypes',
				},
				description:
					'ID of the industry that the account belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'LinkedIn',
				name: 'linkedin',
				type: 'string',
				default: '',
				description: 'LinkedIn account of the account',
			},
			{
				displayName: 'Number of Employees',
				name: 'number_of_employees',
				type: 'number',
				default: 0,
				description: 'Number of employees in the account',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user to whom the account is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Parent Sales Account ID',
				name: 'parent_sales_account_id',
				type: 'string',
				default: '',
				description: 'Parent account ID of the account',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the account',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'State that the account belongs to',
			},
			{
				displayName: 'Territory Name or ID',
				name: 'territory_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTerritories',
				},
				description:
					'ID of the territory that the account belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Twitter',
				name: 'twitter',
				type: 'string',
				default: '',
				description: 'Twitter username of the account',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'Website of the account',
			},
			{
				displayName: 'Zipcode',
				name: 'zipcode',
				type: 'string',
				default: '',
				description: 'Zipcode of the region that the account belongs to',
			},
		],
	},

	// ----------------------------------------
	//             account: delete
	// ----------------------------------------
	{
		displayName: 'Account ID',
		name: 'accountId',
		description: 'ID of the account to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               account: get
	// ----------------------------------------
	{
		displayName: 'Account ID',
		name: 'accountId',
		description: 'ID of the account to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             account: getAll
	// ----------------------------------------
	{
		displayName: 'View Name or ID',
		name: 'view',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getAccountViews',
		},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getAll'],
			},
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------------
	//             account: update
	// ----------------------------------------
	{
		displayName: 'Account ID',
		name: 'accountId',
		description: 'ID of the account to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
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
				resource: ['account'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Address of the account',
			},
			{
				displayName: 'Annual Revenue',
				name: 'annual_revenue',
				type: 'number',
				default: 0,
				description: 'Annual revenue of the account',
			},
			{
				displayName: 'Business Type Name or ID',
				name: 'business_type_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getBusinessTypes',
				},
				description:
					'ID of the business that the account belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'City that the account belongs to',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country that the account belongs to',
			},
			{
				displayName: 'Facebook',
				name: 'facebook',
				type: 'string',
				default: '',
				description: 'Facebook username of the account',
			},
			{
				displayName: 'Industry Type Name or ID',
				name: 'industry_type_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getIndustryTypes',
				},
				description:
					'ID of the industry that the account belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'LinkedIn',
				name: 'linkedin',
				type: 'string',
				default: '',
				description: 'LinkedIn account of the account',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the account',
			},
			{
				displayName: 'Number of Employees',
				name: 'number_of_employees',
				type: 'number',
				default: 0,
				description: 'Number of employees in the account',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user to whom the account is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Parent Sales Account ID',
				name: 'parent_sales_account_id',
				type: 'string',
				default: '',
				description: 'Parent account ID of the account',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the account',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'State that the account belongs to',
			},
			{
				displayName: 'Territory Name or ID',
				name: 'territory_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTerritories',
				},
				description:
					'ID of the territory that the account belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Twitter',
				name: 'twitter',
				type: 'string',
				default: '',
				description: 'Twitter username of the account',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'Website of the account',
			},
			{
				displayName: 'Zipcode',
				name: 'zipcode',
				type: 'string',
				default: '',
				description: 'Zipcode of the region that the account belongs to',
			},
		],
	},
];
