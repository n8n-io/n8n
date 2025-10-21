import type { INodeProperties } from 'n8n-workflow';

export const shadowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['shadow'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a thing shadow',
				action: 'Delete a shadow',
				routing: {
					request: {
						method: 'DELETE',
						baseURL: '=https://data.iot.{{$credentials.region}}.amazonaws.com',
						url: '=/things/{{$parameter["thingName"]}}/shadow',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a thing shadow',
				action: 'Get a shadow',
				routing: {
					request: {
						method: 'GET',
						baseURL: '=https://data.iot.{{$credentials.region}}.amazonaws.com',
						url: '=/things/{{$parameter["thingName"]}}/shadow',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a thing shadow',
				action: 'Update a shadow',
				routing: {
					request: {
						method: 'POST',
						baseURL: '=https://data.iot.{{$credentials.region}}.amazonaws.com',
						url: '=/things/{{$parameter["thingName"]}}/shadow',
						body: {
							state: '={{ $parameter["state"] }}',
						},
					},
				},
			},
		],
		default: 'get',
	},
];

export const shadowFields: INodeProperties[] = [
	{
		displayName: 'Thing Name',
		name: 'thingName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the IoT thing',
	},
	{
		displayName: 'State (JSON)',
		name: 'state',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['shadow'],
				operation: ['update'],
			},
		},
		default: '{\n  "desired": {\n    "color": "red",\n    "temperature": 20\n  },\n  "reported": {\n    "color": "blue"\n  }\n}',
		description: 'The desired and/or reported state',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['shadow'],
				operation: ['get', 'delete'],
			},
		},
		options: [
			{
				displayName: 'Shadow Name',
				name: 'shadowName',
				type: 'string',
				default: '',
				description: 'The name of the shadow (for named shadows)',
			},
		],
	},
];
