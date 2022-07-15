import {
	INodeProperties,
} from 'n8n-workflow';

export const taskTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'taskTag',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a tag to a task',
				action: 'Add a task tag',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a tag from a task',
				action: 'Remove a task tag',
			},
		],
		default: 'add',
	},
];

export const taskTagFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                taskTag:add                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'taskTag',
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
		displayName: 'Tag Name',
		name: 'tagName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'taskTag',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'taskTag',
				],
				operation: [
					'remove',
					'add',
				],
			},
		},
		options: [
			{
				displayName: 'Custom Task IDs',
				name: 'custom_task_ids',
				type: 'boolean',
				default: false,
				description: 'Whether to reference a task by it\'s custom task ID',
			},
			{
				displayName: 'Team Name or ID',
				name: 'team_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				default: '',
				description: 'Only used when the parameter is set to custom_task_ids=true. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
];
