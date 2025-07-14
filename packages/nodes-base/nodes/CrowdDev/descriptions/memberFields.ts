import type { INodeProperties } from 'n8n-workflow';

import * as shared from './shared';
import { getAdditionalOptions, getId, mapWith, showFor } from './utils';
import { memberPresend } from '../GenericFunctions';

const displayOpts = showFor(['member']);

const displayFor = {
	resource: displayOpts(),
	createOrUpdate: displayOpts(['createOrUpdate', 'update']),
	id: displayOpts(['delete', 'find', 'update']),
};

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
			description: 'Create or update a member',
			action: 'Create or update a member',
			routing: {
				send: { preSend: [memberPresend] },
				request: {
					method: 'POST',
					url: '/member',
				},
			},
		},
		{
			name: 'Delete',
			value: 'delete',
			description: 'Delete a member',
			action: 'Delete a member',
			routing: {
				request: {
					method: 'DELETE',
					url: '=/member',
				},
			},
		},
		{
			name: 'Find',
			value: 'find',
			description: 'Find a member',
			action: 'Find a member',
			routing: {
				request: {
					method: 'GET',
					url: '=/member/{{$parameter["id"]}}',
				},
			},
		},
		{
			name: 'Update',
			value: 'update',
			description: 'Update a member',
			action: 'Update a member',
			routing: {
				send: { preSend: [memberPresend] },
				request: {
					method: 'PUT',
					url: '=/member/{{$parameter["id"]}}',
				},
			},
		},
	],
};

const commonFields: INodeProperties[] = [
	{
		displayName: 'Platform',
		name: 'platform',
		description: 'Platform for which to check member existence',
		type: 'string',
		required: true,
		default: '',
	},
	{
		displayName: 'Username',
		name: 'username',
		description: 'Username of the member in platform',
		type: 'string',
		required: true,
		default: '',
	},
];

const additionalOptions: INodeProperties[] = [
	{
		displayName: 'Display Name',
		name: 'displayName',
		description: 'UI friendly name of the member',
		type: 'string',
		default: '',
	},
	shared.emailsField,
	{
		displayName: 'Joined At',
		name: 'joinedAt',
		description: 'Date of joining the community',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Organizations',
		name: 'organizations',
		description:
			'Organizations associated with the member. Each element in the array is the name of the organization, or an organization object. If the organization does not exist, it will be created.',
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
						displayName: 'Name',
						name: 'name',
						description: 'The name of the organization',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Url',
						name: 'url',
						description: 'The URL of the organization',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Description',
						name: 'description',
						description: 'A short description of the organization',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						default: '',
					},
					{
						displayName: 'Logo',
						name: 'logo',
						description: 'A URL for logo of the organization',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Employees',
						name: 'employees',
						description: 'The number of employees of the organization',
						type: 'number',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Tags',
		name: 'tags',
		description: 'Tags associated with the member. Each element in the array is the ID of the tag.',
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
						displayName: 'Tag',
						name: 'tag',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Tasks',
		name: 'tasks',
		description:
			'Tasks associated with the member. Each element in the array is the ID of the task.',
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
						displayName: 'Task',
						name: 'task',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Notes',
		name: 'notes',
		description:
			'Notes associated with the member. Each element in the array is the ID of the note.',
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
						displayName: 'Note',
						name: 'note',
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
			'Activities associated with the member. Each element in the array is the ID of the activity.',
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
];

const memberFields: INodeProperties[] = [
	Object.assign(getId(), { description: 'The ID of the member' }, displayFor.id),
	...commonFields.map(mapWith(displayFor.createOrUpdate)),
	Object.assign({}, getAdditionalOptions(additionalOptions), displayFor.createOrUpdate),
];

export { memberOperations, memberFields };
