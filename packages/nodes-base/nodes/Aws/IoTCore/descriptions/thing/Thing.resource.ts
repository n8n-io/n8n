import type { INodeProperties } from 'n8n-workflow';

export const thingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['thing'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an IoT thing',
				action: 'Create a thing',
				routing: {
					request: {
						method: 'PUT',
						url: '=/things/{{$parameter["thingName"]}}',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an IoT thing',
				action: 'Delete a thing',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/things/{{$parameter["thingName"]}}',
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a thing',
				action: 'Describe a thing',
				routing: {
					request: {
						method: 'GET',
						url: '=/things/{{$parameter["thingName"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all things',
				action: 'List things',
				routing: {
					request: {
						method: 'GET',
						url: '/things',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update thing attributes',
				action: 'Update a thing',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/things/{{$parameter["thingName"]}}',
					},
				},
			},
		],
		default: 'list',
	},
];

export const thingFields: INodeProperties[] = [
	{
		displayName: 'Thing Name',
		name: 'thingName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['thing'],
				operation: ['create', 'delete', 'describe', 'update'],
			},
		},
		default: '',
		description: 'The name of the IoT thing',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['thing'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Thing Type Name',
				name: 'thingTypeName',
				type: 'string',
				default: '',
				description: 'The thing type name',
			},
			{
				displayName: 'Attributes (JSON)',
				name: 'attributePayload',
				type: 'json',
				default: '{\n  "attributes": {\n    "key1": "value1"\n  }\n}',
				description: 'Thing attributes as JSON',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['thing'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				default: 250,
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Next Token',
				name: 'nextToken',
				type: 'string',
				default: '',
				description: 'Token for pagination',
			},
			{
				displayName: 'Thing Type Name',
				name: 'thingTypeName',
				type: 'string',
				default: '',
				description: 'Filter by thing type',
			},
		],
	},
];
