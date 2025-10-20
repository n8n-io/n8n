import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'send',
		displayOptions: {
			show: {
				resource: ['command'],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a command',
				action: 'Cancel a command',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonSSM.CancelCommand',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							CommandId: '={{ $parameter["commandId"] }}',
							InstanceIds: '={{ $parameter["instanceIds"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get command invocation details',
				action: 'Get command invocation',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonSSM.GetCommandInvocation',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							CommandId: '={{ $parameter["commandId"] }}',
							InstanceId: '={{ $parameter["instanceId"] }}',
							PluginName: '={{ $parameter["pluginName"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List commands',
				action: 'List commands',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonSSM.ListCommands',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							CommandId: '={{ $parameter["commandId"] }}',
							InstanceId: '={{ $parameter["instanceId"] }}',
							MaxResults: '={{ $parameter["maxResults"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
							Filters: '={{ $parameter["filters"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'List Invocations',
				value: 'listInvocations',
				description: 'List command invocations',
				action: 'List command invocations',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonSSM.ListCommandInvocations',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							CommandId: '={{ $parameter["commandId"] }}',
							InstanceId: '={{ $parameter["instanceId"] }}',
							MaxResults: '={{ $parameter["maxResults"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
							Filters: '={{ $parameter["filters"] }}',
							Details: '={{ $parameter["details"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send a command to instances',
				action: 'Send a command',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonSSM.SendCommand',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							DocumentName: '={{ $parameter["documentName"] }}',
							InstanceIds: '={{ $parameter["instanceIds"] }}',
							Targets: '={{ $parameter["targets"] }}',
							Parameters: '={{ $parameter["parameters"] }}',
							Comment: '={{ $parameter["comment"] }}',
							TimeoutSeconds: '={{ $parameter["timeoutSeconds"] }}',
							MaxConcurrency: '={{ $parameter["maxConcurrency"] }}',
							MaxErrors: '={{ $parameter["maxErrors"] }}',
							OutputS3BucketName: '={{ $parameter["outputS3BucketName"] }}',
							OutputS3KeyPrefix: '={{ $parameter["outputS3KeyPrefix"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
		],
	},
	// Common fields
	{
		displayName: 'Command ID',
		name: 'commandId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['cancel', 'get'],
			},
		},
		default: '',
		description: 'ID of the command',
	},
	{
		displayName: 'Instance ID',
		name: 'instanceId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'EC2 instance ID',
	},
	// Send operation fields
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['send'],
			},
		},
		default: 'AWS-RunShellScript',
		description: 'SSM document name (e.g., AWS-RunShellScript, AWS-RunPowerShellScript)',
	},
	{
		displayName: 'Instance IDs',
		name: 'instanceIds',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['send', 'cancel'],
			},
		},
		default: '[]',
		description: 'Array of EC2 instance IDs',
	},
	{
		displayName: 'Targets',
		name: 'targets',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['send'],
			},
		},
		default: '[]',
		description: 'Targets as array of {Key, Values} objects for tag-based targeting',
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['send'],
			},
		},
		default: '{}',
		description: 'Document parameters (e.g., {"commands": ["echo hello"]})',
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['send'],
			},
		},
		default: '',
		description: 'User-specified comment',
	},
	{
		displayName: 'Timeout Seconds',
		name: 'timeoutSeconds',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['send'],
			},
		},
		default: 3600,
		description: 'Command timeout in seconds',
	},
	{
		displayName: 'Max Concurrency',
		name: 'maxConcurrency',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['send'],
			},
		},
		default: '50',
		description: 'Maximum instances to run command concurrently',
	},
	{
		displayName: 'Max Errors',
		name: 'maxErrors',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['send'],
			},
		},
		default: '0',
		description: 'Maximum errors allowed before stopping',
	},
	{
		displayName: 'Output S3 Bucket Name',
		name: 'outputS3BucketName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['send'],
			},
		},
		default: '',
		description: 'S3 bucket for command output',
	},
	{
		displayName: 'Output S3 Key Prefix',
		name: 'outputS3KeyPrefix',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['send'],
			},
		},
		default: '',
		description: 'S3 key prefix for command output',
	},
	// Get operation fields
	{
		displayName: 'Plugin Name',
		name: 'pluginName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Plugin name (optional)',
	},
	// List operation fields
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['list', 'listInvocations'],
			},
		},
		default: 50,
		description: 'Maximum number of results',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['list', 'listInvocations'],
			},
		},
		default: '',
		description: 'Pagination token',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['list', 'listInvocations'],
			},
		},
		default: '[]',
		description: 'Filters as array of {key, value} objects',
	},
	{
		displayName: 'Details',
		name: 'details',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['command'],
				operation: ['listInvocations'],
			},
		},
		default: false,
		description: 'Whether to include full command details',
	},
];
