import {
	INodeProperties,
} from 'n8n-workflow';

export const taskListOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a task to a list',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a task from a list',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const taskListFields = [
	/* -------------------------------------------------------------------------- */
	/*                                taskList:add                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'remove',
					'add',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'remove',
					'add',
				],
			},
		},
		required: true,
	},
] as INodeProperties[];
