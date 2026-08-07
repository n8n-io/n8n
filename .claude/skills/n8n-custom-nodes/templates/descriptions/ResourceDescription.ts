/**
 * TEMPLATE: Separated Resource Description
 *
 * For complex nodes, separate operation and field definitions into their own
 * files. This keeps the main node file clean and makes it easy to add new
 * resources. Import and spread these into the node's properties array.
 *
 * Usage in main node file:
 *   import { itemOperations, itemFields } from './descriptions/ItemDescription';
 *   properties: [
 *     resourceSelector,
 *     ...itemOperations,
 *     ...itemFields,
 *   ]
 *
 * Replace __resource__ / __Resource__ with your resource name.
 */
import type { INodeProperties } from 'n8n-workflow';

export const __resource__Operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['__resource__'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new __resource__',
				action: 'Create a __resource__',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a __resource__',
				action: 'Delete a __resource__',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a __resource__',
				action: 'Get a __resource__',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve multiple __resource__s',
				action: 'Get many __resource__s',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a __resource__',
				action: 'Update a __resource__',
			},
		],
		default: 'create',
	},
];

export const __resource__Fields: INodeProperties[] = [
	// ============================================================
	// CREATE
	// ============================================================
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['__resource__'],
				operation: ['create'],
			},
		},
		description: 'The name of the __resource__',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['__resource__'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A description of the __resource__',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Comma-separated list of tags',
			},
		],
	},

	// ============================================================
	// GET / UPDATE / DELETE (shared ID field)
	// ============================================================
	{
		displayName: '__Resource__ ID',
		name: '__resource__Id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['__resource__'],
				operation: ['get', 'update', 'delete'],
			},
		},
		description: 'The unique identifier of the __resource__',
	},

	// ============================================================
	// GET MANY
	// ============================================================
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['__resource__'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['__resource__'],
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
				resource: ['__resource__'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Archived', value: 'archived' },
					{ name: 'All', value: '' },
				],
				default: '',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search term to filter results',
			},
		],
	},

	// ============================================================
	// UPDATE
	// ============================================================
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['__resource__'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
			},
		],
	},
];
