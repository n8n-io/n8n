import {
	INodeProperties,
} from 'n8n-workflow';

export const objectOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'object',
				],
			},
		},
	},
] as INodeProperties[];

export const objectFields = [
	// ----------------------------------
	//         object: create
	// ----------------------------------
	{
		displayName: 'Type Name',
		name: 'typeName',
		type: 'string',
		required: true,
		description: 'Name of data type of the object to create.',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'object',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Keys and Values',
		name: 'keysAndValues',
		placeholder: 'Add Pair',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'object',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Pairs',
				name: 'pairs',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Field to set for the object to create.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to set for the object to create.',
					},
				],
			},
		],
	},

	// ----------------------------------
	//         object: get
	// ----------------------------------
	{
		displayName: 'Type Name',
		name: 'typeName',
		type: 'string',
		required: true,
		description: 'Name of data type of the object to retrieve.',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'object',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		description: 'ID of the object to retrieve.',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'object',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------
	//         object: update
	// ----------------------------------
	{
		displayName: 'Type Name',
		name: 'typeName',
		type: 'string',
		required: true,
		description: 'Name of data type of the object to update.',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'object',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		description: 'ID of the object to update.',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'object',
				],
				operation: [
					'update',
				],
			},
		},
	},
] as INodeProperties[];
