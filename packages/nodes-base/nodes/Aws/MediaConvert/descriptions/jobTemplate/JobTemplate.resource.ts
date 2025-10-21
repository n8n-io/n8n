import type { INodeProperties } from 'n8n-workflow';
import { handleMediaConvertError } from '../../helpers/errorHandler';

export const jobTemplateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['jobTemplate'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new job template',
				action: 'Create a job template',
				routing: {
					request: {
						method: 'POST',
						url: '/2017-08-29/jobTemplates',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'JobTemplate',
								},
							},
							handleMediaConvertError,
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a job template',
				action: 'Delete a job template',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/2017-08-29/jobTemplates/{{$parameter["templateName"]}}',
					},
					output: {
						postReceive: [handleMediaConvertError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of a job template',
				action: 'Get a job template',
				routing: {
					request: {
						method: 'GET',
						url: '=/2017-08-29/jobTemplates/{{$parameter["templateName"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'JobTemplate',
								},
							},
							handleMediaConvertError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all job templates',
				action: 'List job templates',
				routing: {
					request: {
						method: 'GET',
						url: '/2017-08-29/jobTemplates',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'JobTemplates',
								},
							},
							handleMediaConvertError,
						],
					},
				},
			},
		],
	},
];

export const jobTemplateFields: INodeProperties[] = [
	{
		displayName: 'Template Name',
		name: 'templateName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['jobTemplate'],
				operation: ['create', 'delete', 'get'],
			},
		},
		description: 'The name of the job template',
		routing: {
			request: {
				body: {
					Name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Settings',
		name: 'settings',
		type: 'json',
		required: true,
		default: '{}',
		displayOptions: {
			show: {
				resource: ['jobTemplate'],
				operation: ['create'],
			},
		},
		description: 'Template settings (JSON format)',
		routing: {
			request: {
				body: {
					Settings: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];
