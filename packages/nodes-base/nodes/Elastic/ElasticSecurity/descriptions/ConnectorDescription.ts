import {
	INodeProperties,
} from 'n8n-workflow';

export const connectorOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'connector',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a connector',
			},
		],
		default: 'create',
	},
];

export const connectorFields: INodeProperties[] = [
	{
		displayName: 'Connector Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'connector',
				],
				operation: [
					'create',
				],
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
				resource: [
					'connector',
				],
				operation: [
					'create',
				],
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
				resource: [
					'connector',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'connector',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.jira',
				],
			},
		},
	},
	{
		displayName: 'API Token',
		name: 'apiToken',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'connector',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.jira',
				],
			},
		},
	},
	{
		displayName: 'Project Key',
		name: 'projectKey',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'connector',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.jira',
				],
			},
		},
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'connector',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.servicenow',
				],
			},
		},
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'connector',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.servicenow',
				],
			},
		},
	},
	{
		displayName: 'API Key ID',
		name: 'apiKeyId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'connector',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.resilient',
				],
			},
		},
	},
	{
		displayName: 'API Key Secret',
		name: 'apiKeySecret',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'connector',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.resilient',
				],
			},
		},
	},
	{
		displayName: 'Organization ID',
		name: 'orgId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'connector',
				],
				operation: [
					'create',
				],
				connectorType: [
					'.resilient',
				],
			},
		},
	},
];
