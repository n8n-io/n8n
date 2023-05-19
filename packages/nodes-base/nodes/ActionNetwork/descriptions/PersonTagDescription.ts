import type { INodeProperties } from 'n8n-workflow';

export const personTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['personTag'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add a person tag',
			},
			{
				name: 'Remove',
				value: 'remove',
				action: 'Remove a person tag',
			},
		],
		default: 'add',
	},
];

export const personTagFields: INodeProperties[] = [
	// ----------------------------------------
	//             personTag: add
	// ----------------------------------------
	{
		displayName: 'Tag Name or ID',
		name: 'tagId',
		description:
			'ID of the tag to add. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: ['personTag'],
				operation: ['add'],
			},
		},
	},
	{
		displayName: 'Person ID',
		name: 'personId',
		description: 'ID of the person to add the tag to',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['personTag'],
				operation: ['add'],
			},
		},
	},

	// ----------------------------------------
	//             personTag: remove
	// ----------------------------------------
	{
		displayName: 'Tag Name or ID',
		name: 'tagId',
		description:
			'ID of the tag whose tagging to delete. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: ['personTag'],
				operation: ['remove'],
			},
		},
	},
	{
		displayName: 'Tagging Name or ID',
		name: 'taggingId',
		description:
			'ID of the tagging to remove. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['tagId'],
			loadOptionsMethod: 'getTaggings',
		},
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: ['personTag'],
				operation: ['remove'],
			},
		},
	},
];
