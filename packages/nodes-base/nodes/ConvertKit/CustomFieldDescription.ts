import {
	INodeProperties,
} from 'n8n-workflow';

export const customFieldOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'customField',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a field',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a field',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all fields',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a field',
			},
		],
		default: 'update',
		description: 'The operation to perform.',
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
				resource: [
					'customField',
				],
				operation: [
					'update',
					'delete',
				],
			},
		},
		default: '',
		description: 'The ID of your custom field.',
	},
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'customField',
				],
				operation: [
					'update',
					'create',
				],
			},
		},
		default: '',
		description: 'The label of the custom field.',
	},
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
					'customField',
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
					'customField',
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
];
