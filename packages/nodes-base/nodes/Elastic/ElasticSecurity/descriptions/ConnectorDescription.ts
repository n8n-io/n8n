import type { INodeProperties } from 'n8n-workflow';

export const connectorOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: ['connector'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a connector',
				action: 'Create a connector',
			},
		],
		default: 'create',
	},
];

export const connectorFields: INodeProperties[] = [
	// ----------------------------------------
	//           connector: create
	// ----------------------------------------
	{
		displayName: 'Connector Name',
		name: 'name',
		description:
			'Connectors allow you to send Elastic Security cases into other systems (only ServiceNow, Jira, or IBM Resilient)',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['connector'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Connector Type',
		name: 'connectorType',
		type: 'options',
		required: true,
		default: '.jira',
		options: [
			{
				name: 'IBM Resilient',
				value: '.resilient',
			},
			{
				name: 'Jira',
				value: '.jira',
			},
			{
				name: 'ServiceNow ITSM',
				value: '.servicenow',
			},
		],
		displayOptions: {
			show: {
				resource: ['connector'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'API URL',
		name: 'apiUrl',
		type: 'string',
		description: 'URL of the third-party instance',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['connector'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		description: 'Jira-registered email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['connector'],
				operation: ['create'],
				connectorType: ['.jira'],
			},
		},
	},
	{
		displayName: 'API Token',
		name: 'apiToken',
		description: 'Jira API token',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['connector'],
				operation: ['create'],
				connectorType: ['.jira'],
			},
		},
	},
	{
		displayName: 'Project Key',
		name: 'projectKey',
		description: 'Jira Project Key',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['connector'],
				operation: ['create'],
				connectorType: ['.jira'],
			},
		},
	},
	{
		displayName: 'Username',
		name: 'username',
		description: 'ServiceNow ITSM username',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['connector'],
				operation: ['create'],
				connectorType: ['.servicenow'],
			},
		},
	},
	{
		displayName: 'Password',
		name: 'password',
		description: 'ServiceNow ITSM password',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['connector'],
				operation: ['create'],
				connectorType: ['.servicenow'],
			},
		},
	},
	{
		displayName: 'API Key ID',
		name: 'apiKeyId',
		description: 'IBM Resilient API key ID',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['connector'],
				operation: ['create'],
				connectorType: ['.resilient'],
			},
		},
	},
	{
		displayName: 'API Key Secret',
		name: 'apiKeySecret',
		description: 'IBM Resilient API key secret',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['connector'],
				operation: ['create'],
				connectorType: ['.resilient'],
			},
		},
	},
	{
		displayName: 'Organization ID',
		name: 'orgId',
		description: 'IBM Resilient organization ID',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['connector'],
				operation: ['create'],
				connectorType: ['.resilient'],
			},
		},
	},
];
