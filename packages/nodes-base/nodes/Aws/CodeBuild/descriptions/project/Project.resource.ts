import type { INodeProperties } from 'n8n-workflow';
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
				resource: ['project'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a build project',
				action: 'Create a build project',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodeBuild_20161006.CreateProject',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							name: '={{ $parameter["projectName"] }}',
							description: '={{ $parameter["description"] }}',
							source: '={{ $parameter["source"] }}',
							artifacts: '={{ $parameter["artifacts"] }}',
							environment: '={{ $parameter["environment"] }}',
							serviceRole: '={{ $parameter["serviceRole"] }}',
							timeoutInMinutes: '={{ $parameter["timeoutInMinutes"] }}',
							queuedTimeoutInMinutes: '={{ $parameter["queuedTimeoutInMinutes"] }}',
							tags: '={{ $parameter["tags"] }}',
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
				description: 'Delete a build project',
				action: 'Delete a build project',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodeBuild_20161006.DeleteProject',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							name: '={{ $parameter["projectName"] }}',
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
				description: 'Get build projects',
				action: 'Get build projects',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodeBuild_20161006.BatchGetProjects',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							names: '={{ $parameter["projectNames"] }}',
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
				description: 'List build projects',
				action: 'List build projects',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodeBuild_20161006.ListProjects',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							sortBy: '={{ $parameter["sortBy"] }}',
							sortOrder: '={{ $parameter["sortOrder"] }}',
							nextToken: '={{ $parameter["nextToken"] }}',
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
				description: 'Update a build project',
				action: 'Update a build project',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodeBuild_20161006.UpdateProject',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							name: '={{ $parameter["projectName"] }}',
							description: '={{ $parameter["description"] }}',
							source: '={{ $parameter["source"] }}',
							artifacts: '={{ $parameter["artifacts"] }}',
							environment: '={{ $parameter["environment"] }}',
							serviceRole: '={{ $parameter["serviceRole"] }}',
							timeoutInMinutes: '={{ $parameter["timeoutInMinutes"] }}',
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
	// Common field
	{
		displayName: 'Project Name',
		name: 'projectName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create', 'delete', 'update'],
			},
		},
		default: '',
		description: 'Name of the build project',
	},
	// Create/Update operation fields
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'Description of the build project',
	},
	{
		displayName: 'Source',
		name: 'source',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create', 'update'],
			},
		},
		default: '{"type": "GITHUB", "location": "https://github.com/user/repo"}',
		description: 'Source code configuration',
	},
	{
		displayName: 'Artifacts',
		name: 'artifacts',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create', 'update'],
			},
		},
		default: '{"type": "NO_ARTIFACTS"}',
		description: 'Build output artifacts configuration',
	},
	{
		displayName: 'Environment',
		name: 'environment',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create', 'update'],
			},
		},
		default: '{"type": "LINUX_CONTAINER", "image": "aws/codebuild/standard:5.0", "computeType": "BUILD_GENERAL1_SMALL"}',
		description: 'Build environment configuration',
	},
	{
		displayName: 'Service Role',
		name: 'serviceRole',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'IAM service role ARN for CodeBuild',
	},
	{
		displayName: 'Timeout In Minutes',
		name: 'timeoutInMinutes',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create', 'update'],
			},
		},
		default: 60,
		description: 'Build timeout in minutes (5-480)',
	},
	{
		displayName: 'Queued Timeout In Minutes',
		name: 'queuedTimeoutInMinutes',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		default: 480,
		description: 'How long builds can be queued (5-480 minutes)',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Array of tag objects',
	},
	// Get operation fields
	{
		displayName: 'Project Names',
		name: 'projectNames',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['get'],
			},
		},
		default: '[]',
		description: 'Array of project names',
	},
	// List operation fields
	{
		displayName: 'Sort By',
		name: 'sortBy',
		type: 'options',
		options: [
			{ name: 'NAME', value: 'NAME' },
			{ name: 'CREATED_TIME', value: 'CREATED_TIME' },
			{ name: 'LAST_MODIFIED_TIME', value: 'LAST_MODIFIED_TIME' },
		],
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['list'],
			},
		},
		default: 'NAME',
		description: 'Field to sort by',
	},
	{
		displayName: 'Sort Order',
		name: 'sortOrder',
		type: 'options',
		options: [
			{ name: 'ASCENDING', value: 'ASCENDING' },
			{ name: 'DESCENDING', value: 'DESCENDING' },
		],
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['list'],
			},
		},
		default: 'ASCENDING',
		description: 'Sort order',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];
