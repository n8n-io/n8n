import type { INodeProperties } from 'n8n-workflow';

export const environmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['environment'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new environment',
				action: 'Create an environment',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'CreateEnvironment',
							Version: '2010-12-01',
							ApplicationName: '={{ $parameter["applicationName"] }}',
							EnvironmentName: '={{ $parameter["environmentName"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about environments',
				action: 'Describe environments',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeEnvironments',
							Version: '2010-12-01',
						},
					},
				},
			},
			{
				name: 'Terminate',
				value: 'terminate',
				description: 'Terminate an environment',
				action: 'Terminate an environment',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'TerminateEnvironment',
							Version: '2010-12-01',
							EnvironmentName: '={{ $parameter["environmentName"] }}',
						},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an environment',
				action: 'Update an environment',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'UpdateEnvironment',
							Version: '2010-12-01',
							EnvironmentName: '={{ $parameter["environmentName"] }}',
						},
					},
				},
			},
		],
		default: 'describe',
	},
];

export const environmentFields: INodeProperties[] = [
	{
		displayName: 'Application Name',
		name: 'applicationName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['environment'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the application',
	},
	{
		displayName: 'Environment Name',
		name: 'environmentName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['environment'],
				operation: ['create', 'terminate', 'update'],
			},
		},
		default: '',
		description: 'The name of the environment',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['environment'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Solution Stack Name',
				name: 'SolutionStackName',
				type: 'string',
				default: '',
				description: 'Solution stack name (e.g., "64bit Amazon Linux 2 v5.8.0 running Node.js 18")',
			},
			{
				displayName: 'Tier Name',
				name: 'Tier.Name',
				type: 'options',
				options: [
					{ name: 'WebServer', value: 'WebServer' },
					{ name: 'Worker', value: 'Worker' },
				],
				default: 'WebServer',
				description: 'Environment tier',
			},
			{
				displayName: 'Version Label',
				name: 'VersionLabel',
				type: 'string',
				default: '',
				description: 'Application version to deploy',
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
				resource: ['environment'],
				operation: ['describe'],
			},
		},
		options: [
			{
				displayName: 'Application Name',
				name: 'ApplicationName',
				type: 'string',
				default: '',
				description: 'Filter by application name',
			},
			{
				displayName: 'Environment Names',
				name: 'EnvironmentNames',
				type: 'string',
				default: '',
				description: 'Comma-separated list of environment names',
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
				resource: ['environment'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Version Label',
				name: 'VersionLabel',
				type: 'string',
				default: '',
				description: 'New application version to deploy',
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
				description: 'New environment description',
			},
		],
	},
];
