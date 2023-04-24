import { INodeProperties } from "n8n-workflow";
import { mapWith, showFor } from "./utils";
import * as shared from "./shared";

const displayOpts = showFor(['member'])

const displayFor = {
	resource: displayOpts(),
	createOrUpdate: displayOpts(['createOrUpdate', 'update']),
	id: displayOpts(['delete', 'find', 'update']),
}

const memberOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	displayOptions: displayFor.resource.displayOptions,
	noDataExpression: true,
	default: 'find',
	options: [
		{
			name: 'Create or Update',
			value: 'createOrUpdate',
			action: 'Create or update a member',
		},
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete a member',
		},
		{
			name: 'Find',
			value: 'find',
			action: 'Find a member',
		},
		{
			name: 'Update',
			value: 'update',
			action: 'Update a member',
		},
	]
}

const idField: INodeProperties = {
	displayName: 'ID',
	name: 'id',
	description: 'The ID of the member',
	type: 'string',
	required: true,
	default: ''
}

const commonFields: INodeProperties[] = [
	{
		displayName: 'Platform',
		name: 'platform',
		description: 'Platform for which to check member existence',
		type: 'string',
		required: true,
		default: ''
	},
	shared.usernameField,
	{
		displayName: 'Display Name',
		name: 'displayName',
		description: 'UI friendly name of the member',
		type: 'string',
		default: ''
	},
	shared.emailsField,
	{
		displayName: 'Joined At',
		name: 'joinedAt',
		description: 'Date of joining the community',
		type: 'dateTime',
		default: ''
	},
	{
		displayName: 'Organizations',
		name: 'organizations',
		description: 'Organizations associated with the member. Each element in the array is the name of the organization, or an organization object. If the organization does not exist, it will be created.',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true
		},
		default: {},
		options: [
			{
				displayName: 'Item Choice',
				name: 'itemChoice',
				values: shared.organizationFields
			}
		]
	},
	{
		displayName: 'Tags',
		name: 'tags',
		description: 'Tags associated with the member. Each element in the array is the ID of the tag.',
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
						displayName: 'Tag',
						name: 'tag',
						type: 'string',
						default: ''
					}
				]
			}
		]
	},
	{
		displayName: 'Tasks',
		name: 'tasks',
		description: 'Tasks associated with the member. Each element in the array is the ID of the task.',
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
						displayName: 'Task',
						name: 'task',
						type: 'string',
						default: ''
					}
				]
			}
		]
	},
	{
		displayName: 'Notes',
		name: 'notes',
		description: 'Notes associated with the member. Each element in the array is the ID of the note.',
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
						displayName: 'Note',
						name: 'note',
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
		description: 'Activities associated with the member. Each element in the array is the ID of the activity.',
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
];

const memberFields: INodeProperties[] = [
	Object.assign({}, idField, displayFor.id),
	...commonFields.map(mapWith(displayFor.createOrUpdate))
];

export {
	memberOperations,
	memberFields
}
