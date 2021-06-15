import {
	INodeProperties,
} from 'n8n-workflow';

export const taggingOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'tagging',
				],
			},
		},
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
				name: 'Get All',
				value: 'getAll',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const taggingFields = [
	// ----------------------------------------
	//             tagging: create
	// ----------------------------------------
	{
		displayName: 'Tag ID',
		name: 'tagId',
		description: 'ID of the tag to add.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: [
					'tagging',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Person ID',
		name: 'personId',
		description: 'ID of the person to add the tag to.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPersons',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'tagging',
				],
				operation: [
					'create',
				],
			},
		},
	},

	// ----------------------------------------
	//             tagging: delete
	// ----------------------------------------
	{
		displayName: 'Tag ID',
		name: 'tagId',
		description: 'ID of the tag whose tagging to delete.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'tagging',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Tagging ID',
		name: 'taggingId',
		description: 'ID of the tagging to delete.',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: 'tagId',
			loadOptionsMethod: 'getTaggings',
		},
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: [
					'tagging',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//             tagging: getAll
	// ----------------------------------------
	{
		displayName: 'Tag ID',
		name: 'tagId',
		description: 'ID of the tag whose taggings to retrieve.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'tagging',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'tagging',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'tagging',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
] as INodeProperties[];
