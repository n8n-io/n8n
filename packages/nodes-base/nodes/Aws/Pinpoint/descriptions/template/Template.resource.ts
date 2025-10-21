import type { INodeProperties } from 'n8n-workflow';
import { handlePinpointError } from '../../helpers/errorHandler';

export const templateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['template'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new message template',
				action: 'Create a template',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/templates/{{$parameter["templateName"]}}/{{$parameter["templateType"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'CreateTemplateMessageBody',
								},
							},
							handlePinpointError,
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a message template',
				action: 'Delete a template',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v1/templates/{{$parameter["templateName"]}}/{{$parameter["templateType"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'MessageBody',
								},
							},
							handlePinpointError,
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of a message template',
				action: 'Get a template',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/templates/{{$parameter["templateName"]}}/{{$parameter["templateType"]}}',
					},
					output: {
						postReceive: [handlePinpointError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all message templates',
				action: 'List templates',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/templates',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'TemplatesResponse.Item',
								},
							},
							handlePinpointError,
						],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a message template',
				action: 'Update a template',
				routing: {
					request: {
						method: 'PUT',
						url: '=/v1/templates/{{$parameter["templateName"]}}/{{$parameter["templateType"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'MessageBody',
								},
							},
							handlePinpointError,
						],
					},
				},
			},
		],
	},
];

export const templateFields: INodeProperties[] = [
	{
		displayName: 'Template Name',
		name: 'templateName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['template'],
				operation: ['create', 'delete', 'get', 'update'],
			},
		},
		description: 'The name of the message template',
	},
	{
		displayName: 'Template Type',
		name: 'templateType',
		type: 'options',
		required: true,
		default: 'email',
		displayOptions: {
			show: {
				resource: ['template'],
				operation: ['create', 'delete', 'get', 'update'],
			},
		},
		options: [
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'Push',
				value: 'push',
			},
			{
				name: 'SMS',
				value: 'sms',
			},
			{
				name: 'Voice',
				value: 'voice',
			},
		],
		description: 'The type of message template',
	},
	{
		displayName: 'Template Configuration',
		name: 'templateConfiguration',
		type: 'json',
		required: true,
		default: '{}',
		displayOptions: {
			show: {
				resource: ['template'],
				operation: ['create', 'update'],
			},
		},
		description: 'Template configuration based on type (JSON format)',
		routing: {
			request: {
				body: '={{ JSON.parse($value) }}',
			},
		},
	},
	{
		displayName: 'Template Type Filter',
		name: 'templateTypeFilter',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: ['template'],
				operation: ['list'],
			},
		},
		options: [
			{
				name: 'All',
				value: '',
			},
			{
				name: 'Email',
				value: 'EMAIL',
			},
			{
				name: 'Push',
				value: 'PUSH',
			},
			{
				name: 'SMS',
				value: 'SMS',
			},
			{
				name: 'Voice',
				value: 'VOICE',
			},
		],
		description: 'Filter templates by type',
		routing: {
			request: {
				qs: {
					'template-type': '={{ $value }}',
				},
			},
		},
	},
];
