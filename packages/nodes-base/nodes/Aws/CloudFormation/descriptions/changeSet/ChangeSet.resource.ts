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
				resource: ['changeSet'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a change set',
				action: 'Create a change set',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'CreateChangeSet',
							Version: API_VERSION,
							StackName: '={{ $parameter["stackName"] }}',
							ChangeSetName: '={{ $parameter["changeSetName"] }}',
							TemplateBody: '={{ $parameter["templateBody"] }}',
							TemplateURL: '={{ $parameter["templateURL"] }}',
							UsePreviousTemplate: '={{ $parameter["usePreviousTemplate"] }}',
							Parameters: '={{ $parameter["parameters"] }}',
							Capabilities: '={{ $parameter["capabilities"] }}',
							ChangeSetType: '={{ $parameter["changeSetType"] }}',
							Description: '={{ $parameter["description"] }}',
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
				name: 'Delete',
				value: 'delete',
				description: 'Delete a change set',
				action: 'Delete a change set',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DeleteChangeSet',
							Version: API_VERSION,
							ChangeSetName: '={{ $parameter["changeSetName"] }}',
							StackName: '={{ $parameter["stackName"] }}',
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
				description: 'Describe a change set',
				action: 'Describe a change set',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeChangeSet',
							Version: API_VERSION,
							ChangeSetName: '={{ $parameter["changeSetName"] }}',
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
				name: 'Execute',
				value: 'execute',
				description: 'Execute a change set',
				action: 'Execute a change set',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'ExecuteChangeSet',
							Version: API_VERSION,
							ChangeSetName: '={{ $parameter["changeSetName"] }}',
							StackName: '={{ $parameter["stackName"] }}',
							DisableRollback: '={{ $parameter["disableRollback"] }}',
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
				description: 'List change sets',
				action: 'List change sets',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'ListChangeSets',
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
				resource: ['changeSet'],
			},
		},
		default: '',
		description: 'The name of the stack',
	},
	{
		displayName: 'Change Set Name',
		name: 'changeSetName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['changeSet'],
			},
		},
		default: '',
		description: 'The name of the change set (1-128 characters)',
	},
	// Create operation fields
	{
		displayName: 'Template Body',
		name: 'templateBody',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['changeSet'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'CloudFormation template JSON or YAML',
	},
	{
		displayName: 'Template URL',
		name: 'templateURL',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['changeSet'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'S3 URL to template file',
	},
	{
		displayName: 'Use Previous Template',
		name: 'usePreviousTemplate',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['changeSet'],
				operation: ['create'],
			},
		},
		default: false,
		description: 'Whether to reuse the existing template',
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['changeSet'],
				operation: ['create'],
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
				resource: ['changeSet'],
				operation: ['create'],
			},
		},
		default: [],
		description: 'Capabilities required for the change set',
	},
	{
		displayName: 'Change Set Type',
		name: 'changeSetType',
		type: 'options',
		options: [
			{ name: 'CREATE', value: 'CREATE' },
			{ name: 'UPDATE', value: 'UPDATE' },
			{ name: 'IMPORT', value: 'IMPORT' },
		],
		displayOptions: {
			show: {
				resource: ['changeSet'],
				operation: ['create'],
			},
		},
		default: 'UPDATE',
		description: 'Type of change set',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['changeSet'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Description of the change set (max 1024 characters)',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['changeSet'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Array of tag objects',
	},
	// Execute operation fields
	{
		displayName: 'Disable Rollback',
		name: 'disableRollback',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['changeSet'],
				operation: ['execute'],
			},
		},
		default: false,
		description: 'Whether to disable rollback on failure',
	},
	// Pagination fields
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['changeSet'],
				operation: ['describe', 'list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];
