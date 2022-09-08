import { INodeProperties } from 'n8n-workflow';

export const customFieldOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['customField'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a field',
				action: 'Create a custom field',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a field',
				action: 'Delete a custom field',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all fields',
				action: 'Get many custom fields',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a field',
				action: 'Update a custom field',
			},
		],
		default: 'update',
	},
];

export const customFieldFields: INodeProperties[] = [
	{
		displayName: 'Field ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['customField'],
				operation: ['update', 'delete'],
			},
		},
		default: '',
		description: 'The ID of your custom field',
	},
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['customField'],
				operation: ['update', 'create'],
			},
		},
		default: '',
		description: 'The label of the custom field',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['customField'],
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
				operation: ['getAll'],
				resource: ['customField'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
];
