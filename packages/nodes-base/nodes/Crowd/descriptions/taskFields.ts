import { INodeProperties } from "n8n-workflow";
import { mapWith, showFor } from "./utils";

const displayOpts = showFor(['task'])

const displayFor = {
	resource: displayOpts(),
	createOrUpdate: displayOpts(['create', 'update']),
	id: displayOpts(['delete', 'find', 'update']),
}

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
			action: 'Create a task',
		},
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete a task',
		},
		{
			name: 'Find',
			value: 'find',
			action: 'Find a task',
		},
		{
			name: 'Update',
			value: 'update',
			action: 'Update a task',
		},
	]
}

const idField: INodeProperties = {
	displayName: 'ID',
	name: 'id',
	description: 'The ID of the task',
	type: 'string',
	required: true,
	default: ''
}

const commonFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		description: 'The name of the task',
		type: 'string',
		default: ''
	},
	{
		displayName: 'Body',
		name: 'body',
		description: 'The body of the task',
		type: 'string',
		typeOptions: {
			rows: 4
		},
		default: ''
	},
	{
		displayName: 'Status',
		name: 'status',
		description: 'The status of the task',
		type: 'string',
		default: ''
	},
	{
		displayName: 'Members',
		name: 'members',
		description: 'Members associated with the task. Each element in the array is the ID of the member.',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true
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
						default: ''
					}
				]
			}
		]
	},
	{
		displayName: 'Activities',
		name: 'activities',
		description: 'Activities associated with the task. Each element in the array is the ID of the activity.',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true
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
						default: ''
					}
				]
			}
		]
	},
	{
		displayName: 'Assigneess',
		name: 'assigneess',
		description: 'Users assigned with the task. Each element in the array is the ID of the user.',
		type: 'string',
		default: ''
	},
];

const taskFields: INodeProperties[] = [
	Object.assign({}, idField, displayFor.id),
	...commonFields.map(mapWith(displayFor.createOrUpdate))
];

export {
	taskOperations,
	taskFields,
}
