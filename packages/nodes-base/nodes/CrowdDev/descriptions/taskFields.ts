import type { INodeProperties } from 'n8n-workflow';

import { getAdditionalOptions, getId, showFor } from './utils';
import { taskPresend } from '../GenericFunctions';

const displayOpts = showFor(['task']);

const displayFor = {
	resource: displayOpts(),
	createOrUpdate: displayOpts(['create', 'update']),
	id: displayOpts(['delete', 'find', 'update']),
};

const taskOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	displayOptions: displayFor.resource.displayOptions,
	noDataExpression: true,
	default: 'find',
	options: [
		{
			name: 'Create',
			value: 'create',
			description: 'Create a task',
			action: 'Create a task',
			routing: {
				send: { preSend: [taskPresend] },
				request: {
					method: 'POST',
					url: '/task',
				},
			},
		},
		{
			name: 'Delete',
			value: 'delete',
			description: 'Delete a task',
			action: 'Delete a task',
			routing: {
				request: {
					method: 'DELETE',
					url: '=/task',
				},
			},
		},
		{
			name: 'Find',
			value: 'find',
			description: 'Find a task',
			action: 'Find a task',
			routing: {
				request: {
					method: 'GET',
					url: '=/task/{{$parameter["id"]}}',
				},
			},
		},
		{
			name: 'Update',
			value: 'update',
			description: 'Update a task',
			action: 'Update a task',
			routing: {
				send: { preSend: [taskPresend] },
				request: {
					method: 'PUT',
					url: '=/task/{{$parameter["id"]}}',
				},
			},
		},
	],
};

const additionalOptions: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		description: 'The name of the task',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Body',
		name: 'body',
		description: 'The body of the task',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
	},
	{
		displayName: 'Status',
		name: 'status',
		description: 'The status of the task',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Members',
		name: 'members',
		description:
			'Members associated with the task. Each element in the array is the ID of the member.',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Item Choice',
				name: 'itemChoice',
				values: [
					{
						displayName: 'Member',
						name: 'member',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Activities',
		name: 'activities',
		description:
			'Activities associated with the task. Each element in the array is the ID of the activity.',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Item Choice',
				name: 'itemChoice',
				values: [
					{
						displayName: 'Activity',
						name: 'activity',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Assigneess',
		name: 'assigneess',
		description: 'Users assigned with the task. Each element in the array is the ID of the user.',
		type: 'string',
		default: '',
	},
];

const taskFields: INodeProperties[] = [
	Object.assign(getId(), { description: 'The ID of the task' }, displayFor.id),
	Object.assign({}, getAdditionalOptions(additionalOptions), displayFor.createOrUpdate),
];

export { taskOperations, taskFields };
