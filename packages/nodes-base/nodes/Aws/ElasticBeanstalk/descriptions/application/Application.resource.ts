import type { INodeProperties } from 'n8n-workflow';

export const applicationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['application'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new application',
				action: 'Create an application',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'CreateApplication',
							Version: '2010-12-01',
							ApplicationName: '={{ $parameter["applicationName"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an application',
				action: 'Delete an application',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DeleteApplication',
							Version: '2010-12-01',
							ApplicationName: '={{ $parameter["applicationName"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about applications',
				action: 'Describe applications',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeApplications',
							Version: '2010-12-01',
						},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an application',
				action: 'Update an application',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'UpdateApplication',
							Version: '2010-12-01',
							ApplicationName: '={{ $parameter["applicationName"] }}',
						},
					},
				},
			},
		],
		default: 'describe',
	},
];

export const applicationFields: INodeProperties[] = [
	{
		displayName: 'Application Name',
		name: 'applicationName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['application'],
				operation: ['create', 'delete', 'update'],
			},
		},
		default: '',
		description: 'The name of the application',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['application'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
				description: 'Description of the application',
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
				resource: ['application'],
				operation: ['describe'],
			},
		},
		options: [
			{
				displayName: 'Application Names',
				name: 'ApplicationNames',
				type: 'string',
				default: '',
				description: 'Comma-separated list of application names to describe',
			},
		],
	},
];
