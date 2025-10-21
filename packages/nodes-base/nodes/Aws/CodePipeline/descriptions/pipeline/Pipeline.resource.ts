import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		displayOptions: {
			show: {
				resource: ['pipeline'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a pipeline',
				action: 'Create a pipeline',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodePipeline_20150709.CreatePipeline',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							pipeline: '={{ $parameter["pipeline"] }}',
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
				description: 'Delete a pipeline',
				action: 'Delete a pipeline',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodePipeline_20150709.DeletePipeline',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							name: '={{ $parameter["pipelineName"] }}',
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
				description: 'Get pipeline details',
				action: 'Get a pipeline',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodePipeline_20150709.GetPipeline',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							name: '={{ $parameter["pipelineName"] }}',
							version: '={{ $parameter["version"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get State',
				value: 'getState',
				description: 'Get pipeline state',
				action: 'Get pipeline state',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodePipeline_20150709.GetPipelineState',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							name: '={{ $parameter["pipelineName"] }}',
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
				description: 'List pipelines',
				action: 'List pipelines',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodePipeline_20150709.ListPipelines',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							maxResults: '={{ $parameter["maxResults"] }}',
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
				description: 'Update a pipeline',
				action: 'Update a pipeline',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodePipeline_20150709.UpdatePipeline',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							pipeline: '={{ $parameter["pipeline"] }}',
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
		displayName: 'Pipeline Name',
		name: 'pipelineName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['pipeline'],
				operation: ['delete', 'get', 'getState'],
			},
		},
		default: '',
		description: 'Name of the pipeline',
	},
	// Create/Update operation fields
	{
		displayName: 'Pipeline Configuration',
		name: 'pipeline',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['pipeline'],
				operation: ['create', 'update'],
			},
		},
		default: '{"name": "MyPipeline", "roleArn": "arn:aws:iam::account:role/service-role", "artifactStore": {"type": "S3", "location": "my-bucket"}, "stages": []}',
		description: 'Pipeline configuration as JSON object',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['pipeline'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Tags for the pipeline as array of {key, value} objects',
	},
	// Get operation fields
	{
		displayName: 'Version',
		name: 'version',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['pipeline'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Pipeline version number (optional)',
	},
	// List operation fields
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['pipeline'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of results to return',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['pipeline'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];
