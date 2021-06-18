import {
	INodeProperties,
} from 'n8n-workflow';

export const personTagOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'personTag',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
			},
			{
				name: 'Remove',
				value: 'remove',
			},
		],
		default: 'add',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const personTagFields = [
	// ----------------------------------------
	//             personTag: create
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
					'personTag',
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
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'personTag',
				],
				operation: [
					'create',
				],
			},
		},
	},

	// ----------------------------------------
	//             personTag: delete
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
					'personTag',
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
					'personTag',
				],
				operation: [
					'delete',
				],
			},
		},
	},
] as INodeProperties[];
