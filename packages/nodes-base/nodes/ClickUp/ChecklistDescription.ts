import {
	INodeProperties,
} from 'n8n-workflow';

export const checklistOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'checklist',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a checklist',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a checklist',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a checklist',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const checklistFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                checklist:create                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checklist',
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
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checklist',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                checklist:delete                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Checklist ID',
		name: 'checklist',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checklist',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                checklist:update                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Checklist ID',
		name: 'checklist',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checklist',
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
					'checklist',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
		],
	},
];
