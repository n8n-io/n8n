import { INodeProperties } from 'n8n-workflow';

export const departmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['department'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a department',
				action: 'Create a department',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a department',
				action: 'Delete a department',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a department',
				action: 'Get a department',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all departments',
				action: 'Get all departments',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a department',
				action: 'Update a department',
			},
		],
		default: 'create',
	},
];

export const departmentFields: INodeProperties[] = [
	// ----------------------------------------
	//            department: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['department'],
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
				resource: ['department'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Domains',
				name: 'domains',
				type: 'string',
				default: '',
				description: 'Comma-separated email domains associated with the department',
			},
		],
	},

	// ----------------------------------------
	//            department: delete
	// ----------------------------------------
	{
		displayName: 'Department ID',
		name: 'departmentId',
		description: 'ID of the department to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['department'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//             department: get
	// ----------------------------------------
	{
		displayName: 'Department ID',
		name: 'departmentId',
		description: 'ID of the department to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['department'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//            department: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['department'],
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
				resource: ['department'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['department'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the department',
			},
		],
	},

	// ----------------------------------------
	//            department: update
	// ----------------------------------------
	{
		displayName: 'Department ID',
		name: 'departmentId',
		description: 'ID of the department to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['department'],
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
				resource: ['department'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Domains',
				name: 'domains',
				type: 'string',
				default: '',
				description: 'Comma-separated email domains associated with the department',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
		],
	},
];
