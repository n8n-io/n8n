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
		name: 'taskId',
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
		displayName: 'Depends On',
		name: 'dependsOn',
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
	},
	{
		displayName: 'Dependency Of',
		name: 'dependencyOf',
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
	},
/* -------------------------------------------------------------------------- */
/*                                taskDependency:delete                        */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'taskId',
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
		displayName: 'Depends On',
		name: 'dependsOn',
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
	},
	{
		displayName: 'Dependency Of',
		name: 'dependencyOf',
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
	},
] as INodeProperties[];
