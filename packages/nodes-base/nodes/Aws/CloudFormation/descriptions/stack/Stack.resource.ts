import type { INodeProperties } from 'n8n-workflow';
import { API_VERSION } from '../../helpers/constants';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		displayOptions: {
			show: {
				resource: ['stack'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new stack',
				action: 'Create a stack',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'CreateStack',
							Version: API_VERSION,
							StackName: '={{ $parameter["stackName"] }}',
							TemplateBody: '={{ $parameter["templateBody"] }}',
							TemplateURL: '={{ $parameter["templateURL"] }}',
							Parameters: '={{ $parameter["parameters"] }}',
							Capabilities: '={{ $parameter["capabilities"] }}',
							RoleARN: '={{ $parameter["roleARN"] }}',
							TimeoutInMinutes: '={{ $parameter["timeoutInMinutes"] }}',
							Tags: '={{ $parameter["tags"] }}',
							EnableTerminationProtection: '={{ $parameter["enableTerminationProtection"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a stack',
				action: 'Delete a stack',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DeleteStack',
							Version: API_VERSION,
							StackName: '={{ $parameter["stackName"] }}',
							RoleARN: '={{ $parameter["roleARN"] }}',
							RetainResources: '={{ $parameter["retainResources"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Describe stacks',
				action: 'Describe stacks',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeStacks',
							Version: API_VERSION,
							StackName: '={{ $parameter["stackName"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
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
				description: 'List all stacks',
				action: 'List stacks',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'ListStacks',
							Version: API_VERSION,
							StackStatusFilter: '={{ $parameter["stackStatusFilter"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a stack',
				action: 'Update a stack',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'UpdateStack',
							Version: API_VERSION,
							StackName: '={{ $parameter["stackName"] }}',
							TemplateBody: '={{ $parameter["templateBody"] }}',
							TemplateURL: '={{ $parameter["templateURL"] }}',
							UsePreviousTemplate: '={{ $parameter["usePreviousTemplate"] }}',
							Parameters: '={{ $parameter["parameters"] }}',
							Capabilities: '={{ $parameter["capabilities"] }}',
							RoleARN: '={{ $parameter["roleARN"] }}',
							Tags: '={{ $parameter["tags"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get Template',
				value: 'getTemplate',
				description: 'Get a stack template',
				action: 'Get stack template',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'GetTemplate',
							Version: API_VERSION,
							StackName: '={{ $parameter["stackName"] }}',
							TemplateStage: '={{ $parameter["templateStage"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Validate Template',
				value: 'validateTemplate',
				description: 'Validate a template',
				action: 'Validate template',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'ValidateTemplate',
							Version: API_VERSION,
							TemplateBody: '={{ $parameter["templateBody"] }}',
							TemplateURL: '={{ $parameter["templateURL"] }}',
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
		displayName: 'Stack Name',
		name: 'stackName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create', 'delete', 'describe', 'update', 'getTemplate'],
			},
		},
		default: '',
		description: 'The name of the stack (1-128 characters)',
	},
	// Create/Update template fields
	{
		displayName: 'Template Body',
		name: 'templateBody',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create', 'update', 'validateTemplate'],
			},
		},
		default: '',
		description: 'CloudFormation template JSON or YAML (max 51200 bytes)',
	},
	{
		displayName: 'Template URL',
		name: 'templateURL',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create', 'update', 'validateTemplate'],
			},
		},
		default: '',
		description: 'S3 URL to template file (max 1024 characters)',
	},
	{
		displayName: 'Use Previous Template',
		name: 'usePreviousTemplate',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['update'],
			},
		},
		default: false,
		description: 'Whether to reuse the existing template',
	},
	// Create/Update common fields
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create', 'update'],
			},
		},
		default: '[]',
		description: 'Array of parameter objects',
	},
	{
		displayName: 'Capabilities',
		name: 'capabilities',
		type: 'multiOptions',
		options: [
			{ name: 'CAPABILITY_IAM', value: 'CAPABILITY_IAM' },
			{ name: 'CAPABILITY_NAMED_IAM', value: 'CAPABILITY_NAMED_IAM' },
			{ name: 'CAPABILITY_AUTO_EXPAND', value: 'CAPABILITY_AUTO_EXPAND' },
		],
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create', 'update'],
			},
		},
		default: [],
		description: 'Capabilities required for the stack',
	},
	{
		displayName: 'Role ARN',
		name: 'roleARN',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create', 'update', 'delete'],
			},
		},
		default: '',
		description: 'IAM service role for CloudFormation',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create', 'update'],
			},
		},
		default: '[]',
		description: 'Array of tag objects (max 50 tags)',
	},
	// Create-specific fields
	{
		displayName: 'Timeout In Minutes',
		name: 'timeoutInMinutes',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create'],
			},
		},
		default: 0,
		description: 'Stack creation timeout (1-43200 minutes)',
	},
	{
		displayName: 'Enable Termination Protection',
		name: 'enableTerminationProtection',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['create'],
			},
		},
		default: false,
		description: 'Whether to protect the stack from deletion',
	},
	// Delete-specific fields
	{
		displayName: 'Retain Resources',
		name: 'retainResources',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['delete'],
			},
		},
		default: '[]',
		description: 'Array of logical resource IDs to retain',
	},
	// GetTemplate fields
	{
		displayName: 'Template Stage',
		name: 'templateStage',
		type: 'options',
		options: [
			{ name: 'Original', value: 'Original' },
			{ name: 'Processed', value: 'Processed' },
		],
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['getTemplate'],
			},
		},
		default: 'Original',
		description: 'Whether to get original or processed template',
	},
	// List fields
	{
		displayName: 'Stack Status Filter',
		name: 'stackStatusFilter',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['list'],
			},
		},
		default: '[]',
		description: 'Array of status values to filter by',
	},
	// Pagination fields
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['stack'],
				operation: ['describe', 'list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];
