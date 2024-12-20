import type { INodeProperties } from 'n8n-workflow';

import { getAdditionalOptions, getId, mapWith, showFor } from './utils';
import { organizationPresend } from '../GenericFunctions';

const displayOpts = showFor(['organization']);

const displayFor = {
	resource: displayOpts(),
	createOrUpdate: displayOpts(['create', 'update']),
	id: displayOpts(['delete', 'find', 'update']),
};

const organizationOperations: INodeProperties = {
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
			description: 'Create an organization',
			action: 'Create an organization',
			routing: {
				send: { preSend: [organizationPresend] },
				request: {
					method: 'POST',
					url: '/organization',
				},
			},
		},
		{
			name: 'Delete',
			value: 'delete',
			description: 'Delete an organization',
			action: 'Delete an organization',
			routing: {
				request: {
					method: 'DELETE',
					url: '=/organization',
				},
			},
		},
		{
			name: 'Find',
			value: 'find',
			description: 'Find an organization',
			action: 'Find an organization',
			routing: {
				request: {
					method: 'GET',
					url: '=/organization/{{$parameter["id"]}}',
				},
			},
		},
		{
			name: 'Update',
			value: 'update',
			description: 'Update an organization',
			action: 'Update an organization',
			routing: {
				send: { preSend: [organizationPresend] },
				request: {
					method: 'PUT',
					url: '=/organization/{{$parameter["id"]}}',
				},
			},
		},
	],
};

const commonFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		description: 'The name of the organization',
		type: 'string',
		required: true,
		default: '',
	},
];

const additionalOptions: INodeProperties[] = [
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
	{
		displayName: 'Members',
		name: 'members',
		description:
			'Members associated with the organization. Each element in the array is the ID of the member.',
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
];

const organizationFields: INodeProperties[] = [
	Object.assign(getId(), { description: 'The ID of the organization' }, displayFor.id),
	...commonFields.map(mapWith(displayFor.createOrUpdate)),
	Object.assign({}, getAdditionalOptions(additionalOptions), displayFor.createOrUpdate),
];

export { organizationOperations, organizationFields };
