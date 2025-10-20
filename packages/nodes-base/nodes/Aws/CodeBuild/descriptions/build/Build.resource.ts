import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'start',
		displayOptions: {
			show: {
				resource: ['build'],
			},
		},
		options: [
			{
				name: 'Start',
				value: 'start',
				description: 'Start a build',
				action: 'Start a build',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodeBuild_20161006.StartBuild',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							projectName: '={{ $parameter["projectName"] }}',
							sourceVersion: '={{ $parameter["sourceVersion"] }}',
							artifactsOverride: '={{ $parameter["artifactsOverride"] }}',
							environmentVariablesOverride: '={{ $parameter["environmentVariablesOverride"] }}',
							buildspecOverride: '={{ $parameter["buildspecOverride"] }}',
							timeoutInMinutesOverride: '={{ $parameter["timeoutInMinutesOverride"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop a build',
				action: 'Stop a build',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodeBuild_20161006.StopBuild',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							id: '={{ $parameter["buildId"] }}',
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
				description: 'Get builds',
				action: 'Get builds',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodeBuild_20161006.BatchGetBuilds',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ids: '={{ $parameter["buildIds"] }}',
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
				description: 'List builds for a project',
				action: 'List builds',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodeBuild_20161006.ListBuildsForProject',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							projectName: '={{ $parameter["projectName"] }}',
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
		],
	},
	// Start operation fields
	{
		displayName: 'Project Name',
		name: 'projectName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['start', 'list'],
			},
		},
		default: '',
		description: 'Name of the build project',
	},
	{
		displayName: 'Source Version',
		name: 'sourceVersion',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['start'],
			},
		},
		default: '',
		description: 'Version of source code (e.g., commit ID, branch name)',
	},
	{
		displayName: 'Artifacts Override',
		name: 'artifactsOverride',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['start'],
			},
		},
		default: '{}',
		description: 'Override artifacts configuration',
	},
	{
		displayName: 'Environment Variables Override',
		name: 'environmentVariablesOverride',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['start'],
			},
		},
		default: '[]',
		description: 'Array of environment variable objects',
	},
	{
		displayName: 'Buildspec Override',
		name: 'buildspecOverride',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['start'],
			},
		},
		default: '',
		description: 'Override buildspec YAML content',
	},
	{
		displayName: 'Timeout In Minutes Override',
		name: 'timeoutInMinutesOverride',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['start'],
			},
		},
		default: 0,
		description: 'Override build timeout',
	},
	// Stop operation fields
	{
		displayName: 'Build ID',
		name: 'buildId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['stop'],
			},
		},
		default: '',
		description: 'ID of the build to stop',
	},
	// Get operation fields
	{
		displayName: 'Build IDs',
		name: 'buildIds',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['get'],
			},
		},
		default: '[]',
		description: 'Array of build IDs',
	},
	// List operation fields
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
				resource: ['build'],
				operation: ['list'],
			},
		},
		default: 'DESCENDING',
		description: 'Sort order',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];
