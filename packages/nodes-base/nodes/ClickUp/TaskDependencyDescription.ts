import {
	INodeProperties,
 } from 'n8n-workflow';

export const taskDependencyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'taskDependency',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a task dependency',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task dependency',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const taskDependencyFields = [

/* -------------------------------------------------------------------------- */
/*                                taskDependency:create                        */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'taskDependency',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Is',
		name: 'is',
		type: 'options',
		default: '',
		options: [
			{
				name: 'Bloking',
				value: 'blocking',
				description: `Tasks that can't start until the task above is completed`,
			},
			{
				name: 'Waiting On',
				value: 'waitingOn',
				description: `Tasks that must be completed before the task above`,
			},
		],
		displayOptions: {
			show: {
				resource: [
					'taskDependency',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Dependency type between the two tasks',
		required: true,
	},
	{
		displayName: 'The Task ID',
		name: 'theTaskId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'taskDependency',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                taskDependency:delete                        */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'taskDependency',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Is',
		name: 'is',
		type: 'options',
		default: '',
		options: [
			{
				name: 'Bloking',
				value: 'blocking',
				description: `Tasks that can't start until the task above is completed`,
			},
			{
				name: 'Waiting On',
				value: 'waitingOn',
				description: `Tasks that must be completed before the task above`,
			},
		],
		displayOptions: {
			show: {
				resource: [
					'taskDependency',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'Dependency type between the two tasks',
		required: true,
	},
	{
		displayName: 'The Task ID',
		name: 'theTaskId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'taskDependency',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},
] as INodeProperties[];
