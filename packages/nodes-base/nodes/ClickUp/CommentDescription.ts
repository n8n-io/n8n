import {
	INodeProperties,
} from 'n8n-workflow';

export const commentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a comment',
				action: 'Create a comment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a comment',
				action: 'Delete a comment',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all comments',
				action: 'Get all comments',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a comment',
				action: 'Update a comment',
			},
		],
		default: 'create',
	},
];

export const commentFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                comment:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Comment On',
		name: 'commentOn',
		type: 'options',
		options: [
			{
				name: 'List',
				value: 'list',
			},
			{
				name: 'Task',
				value: 'task',
			},
			{
				name: 'View',
				value: 'view',
			},
		],
		default: '',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Comment Text',
		name: 'commentText',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Assignee ID',
				name: 'assignee',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Notify All',
				name: 'notifyAll',
				type: 'boolean',
				default: false,
				description: 'Whether creation notifications will be sent to everyone including the creator of the comment',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                comment:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Comment ID',
		name: 'comment',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                comment:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Comments On',
		name: 'commentsOn',
		type: 'options',
		options: [
			{
				name: 'List',
				value: 'list',
			},
			{
				name: 'Task',
				value: 'task',
			},
			{
				name: 'View',
				value: 'view',
			},
		],
		default: '',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'getAll',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'getAll',
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                comment:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Comment ID',
		name: 'comment',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Assignee ID',
				name: 'assignee',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Comment Text',
				name: 'commentText',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Resolved',
				name: 'resolved',
				type: 'boolean',
				default: false,
			},
		],
	},
];
