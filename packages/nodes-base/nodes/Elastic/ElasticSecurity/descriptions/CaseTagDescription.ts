import {
	INodeProperties,
} from 'n8n-workflow';

export const caseTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'caseTag',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a tag to a case',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a tag from a case',
			},
		],
		default: 'add',
	},
];

export const caseTagFields: INodeProperties[] = [
	// ----------------------------------------
	//             caseTag: add
	// ----------------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'caseTag',
				],
				operation: [
					'add',
				],
			},
		},
	},
	{
		displayName: 'Tag',
		name: 'tag',
		type: 'options',
		description: 'Tag to attach to the case. Choose from the list or enter a new one with an expression.',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		displayOptions: {
			show: {
				resource: [
					'caseTag',
				],
				operation: [
					'add',
				],
			},
		},
	},

	// ----------------------------------------
	//            caseTag: remove
	// ----------------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'caseTag',
				],
				operation: [
					'remove',
				],
			},
		},
	},
	{
		displayName: 'Tag',
		name: 'tag',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		displayOptions: {
			show: {
				resource: [
					'caseTag',
				],
				operation: [
					'remove',
				],
			},
		},
	},
];
