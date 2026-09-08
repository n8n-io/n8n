import type { INodeProperties } from 'n8n-workflow';

export const checklistItemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['checklistItem'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a checklist item',
				action: 'Create a checklist item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a checklist item',
				action: 'Delete a checklist item',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a checklist item',
				action: 'Update a checklist item',
			},
		],
		default: 'create',
	},
];

export const checklistItemFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                checklistItem:create                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Checklist ID',
		name: 'checklist',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['checklistItem'],
				operation: ['create'],
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
				resource: ['checklistItem'],
				operation: ['create'],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['checklistItem'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Assignee ID',
				name: 'assignee',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                checklistItem:delete                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Checklist ID',
		name: 'checklist',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['checklistItem'],
				operation: ['delete'],
			},
		},
		required: true,
	},
	{
		displayName: 'Checklist item ID',
		name: 'checklistItem',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['checklistItem'],
				operation: ['delete'],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                checklistItem:update                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Checklist ID',
		name: 'checklist',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['checklistItem'],
				operation: ['update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Checklist item ID',
		name: 'checklistItem',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['checklistItem'],
				operation: ['update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['checklistItem'],
				operation: ['update'],
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Parent checklist item ID',
				name: 'parent',
				type: 'string',
				default: '',
				description: 'Checklist item that you want to nest the target checklist item underneath',
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
