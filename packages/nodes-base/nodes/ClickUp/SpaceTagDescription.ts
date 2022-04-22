import {
	INodeProperties,
} from 'n8n-workflow';

export const spaceTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'spaceTag',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a space tag',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a space tag',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all space tags',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a space tag',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const spaceTagFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                spaceTag:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Space ID',
		name: 'space',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'spaceTag',
				],
				operation: [
					'create',
					'delete',
					'getAll',
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'spaceTag',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: [
				'space',
			],
			loadOptionsMethod: 'getTags',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'spaceTag',
				],
				operation: [
					'delete',
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'New Name',
		name: 'newName',
		type: 'string',
		description: 'New name to set for the tag.',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'spaceTag',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Foreground Color',
		name: 'foregroundColor',
		type: 'color',
		default: '#000000',
		displayOptions: {
			show: {
				resource: [
					'spaceTag',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Background Color',
		name: 'backgroundColor',
		type: 'color',
		default: '#000000',
		displayOptions: {
			show: {
				resource: [
					'spaceTag',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'spaceTag',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: true,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'spaceTag',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
];
