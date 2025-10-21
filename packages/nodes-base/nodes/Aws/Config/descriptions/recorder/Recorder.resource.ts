import type { INodeProperties } from 'n8n-workflow';

export const recorderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['recorder'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a configuration recorder',
				action: 'Create a recorder',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'StarlingDoveService.PutConfigurationRecorder',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a configuration recorder',
				action: 'Delete a recorder',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'StarlingDoveService.DeleteConfigurationRecorder',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get recorder details',
				action: 'Get a recorder',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'StarlingDoveService.DescribeConfigurationRecorders',
						},
					},
				},
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				description: 'Get recorder status',
				action: 'Get recorder status',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'StarlingDoveService.DescribeConfigurationRecorderStatus',
						},
					},
				},
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start configuration recorder',
				action: 'Start recorder',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'StarlingDoveService.StartConfigurationRecorder',
						},
					},
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop configuration recorder',
				action: 'Stop recorder',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'StarlingDoveService.StopConfigurationRecorder',
						},
					},
				},
			},
		],
		default: 'create',
	},
];

export const recorderFields: INodeProperties[] = [
	{
		displayName: 'Recorder Name',
		name: 'ConfigurationRecorderName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['recorder'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					ConfigurationRecorderName: '={{ $value }}',
				},
			},
		},
		description: 'The name of the configuration recorder',
	},
	{
		displayName: 'Role ARN',
		name: 'roleARN',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['recorder'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					ConfigurationRecorder: {
						name: '={{$parameter["ConfigurationRecorderName"]}}',
						roleARN: '={{ $value }}',
					},
				},
			},
		},
		description: 'IAM role ARN for Config',
	},
	{
		displayName: 'Record All Resources',
		name: 'allSupported',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['recorder'],
				operation: ['create'],
			},
		},
		default: true,
		routing: {
			request: {
				body: {
					ConfigurationRecorder: {
						recordingGroup: {
							allSupported: '={{ $value }}',
						},
					},
				},
			},
		},
		description: 'Whether to record all supported resources',
	},
];
