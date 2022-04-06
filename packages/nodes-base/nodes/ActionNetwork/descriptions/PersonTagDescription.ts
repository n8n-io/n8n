import {
	INodeProperties,
} from 'n8n-workflow';

export const personTagOperations: INodeProperties[] = [
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
];

export const personTagFields: INodeProperties[] = [
	// ----------------------------------------
	//             personTag: add
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
					'add',
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
					'add',
				],
			},
		},
	},

	// ----------------------------------------
	//             personTag: remove
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
					'remove',
				],
			},
		},
	},
	{
		displayName: 'Tagging ID',
		name: 'taggingId',
		description: 'ID of the tagging to remove.',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: [
				'tagId',
			],
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
					'remove',
				],
			},
		},
	},
];
