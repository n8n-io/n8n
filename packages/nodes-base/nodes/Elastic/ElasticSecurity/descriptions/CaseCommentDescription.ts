import { INodeProperties } from 'n8n-workflow';

export const caseCommentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: ['caseComment'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a comment to a case',
				action: 'Add a comment to a case',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a case comment',
				action: 'Get a case comment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve all case comments',
				action: 'Get many case comments',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a comment from a case',
				action: 'Remove a comment from a case',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a comment in a case',
				action: 'Update a comment from a case',
			},
		],
		default: 'add',
	},
];

export const caseCommentFields: INodeProperties[] = [
	// ----------------------------------------
	//             caseComment: add
	// ----------------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		description: 'ID of the case containing the comment to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['add'],
			},
		},
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['add'],
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['add'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['add'],
			},
		},
		options: [
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'string',
				description:
					'Valid application owner registered within the Cases Role Based Access Control system',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//             caseComment: get
	// ----------------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		description: 'ID of the case containing the comment to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		description: 'ID of the case comment to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//           caseComment: getAll
	// ----------------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------------
	//           caseComment: remove
	// ----------------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		description: 'ID of the case containing the comment to remove',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['remove'],
			},
		},
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['remove'],
			},
		},
	},

	// ----------------------------------------
	//           caseComment: update
	// ----------------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		description: 'ID of the case containing the comment to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Comment',
		name: 'comment',
		description: 'Text to replace current comment message',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['caseComment'],
				operation: ['update'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];
