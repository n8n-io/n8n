import type { INodeProperties } from 'n8n-workflow';

export const detectorOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['detector'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a GuardDuty detector',
				action: 'Create a detector',
				routing: {
					request: {
						method: 'POST',
						url: '/detector',
						body: {
							Enable: '={{ $parameter["enable"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a GuardDuty detector',
				action: 'Delete a detector',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/detector/{{$parameter["detectorId"]}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about a detector',
				action: 'Get a detector',
				routing: {
					request: {
						method: 'GET',
						url: '=/detector/{{$parameter["detectorId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all detectors',
				action: 'List detectors',
				routing: {
					request: {
						method: 'GET',
						url: '/detector',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a detector',
				action: 'Update a detector',
				routing: {
					request: {
						method: 'POST',
						url: '=/detector/{{$parameter["detectorId"]}}',
						body: {
							Enable: '={{ $parameter["enable"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const detectorFields: INodeProperties[] = [
	{
		displayName: 'Detector ID',
		name: 'detectorId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['detector'],
				operation: ['delete', 'get', 'update'],
			},
		},
		default: '',
		description: 'The unique ID of the detector',
	},
	{
		displayName: 'Enable',
		name: 'enable',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				resource: ['detector'],
				operation: ['create', 'update'],
			},
		},
		default: true,
		description: 'Whether to enable the detector',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['detector'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Finding Publishing Frequency',
				name: 'FindingPublishingFrequency',
				type: 'options',
				options: [
					{ name: 'Fifteen Minutes', value: 'FIFTEEN_MINUTES' },
					{ name: 'One Hour', value: 'ONE_HOUR' },
					{ name: 'Six Hours', value: 'SIX_HOURS' },
				],
				default: 'SIX_HOURS',
				description: 'Frequency for publishing findings',
			},
			{
				displayName: 'Data Sources (JSON)',
				name: 'DataSources',
				type: 'json',
				default: '{\n  "S3Logs": {\n    "Enable": true\n  },\n  "Kubernetes": {\n    "AuditLogs": {\n      "Enable": true\n    }\n  }\n}',
				description: 'Data sources configuration',
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
				resource: ['detector'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'MaxResults',
				type: 'number',
				default: 50,
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Next Token',
				name: 'NextToken',
				type: 'string',
				default: '',
				description: 'Token for pagination',
			},
		],
	},
];
