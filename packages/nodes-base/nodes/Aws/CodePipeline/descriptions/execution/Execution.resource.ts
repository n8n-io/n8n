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
				resource: ['execution'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get pipeline execution details',
				action: 'Get pipeline execution',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodePipeline_20150709.GetPipelineExecution',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							pipelineName: '={{ $parameter["pipelineName"] }}',
							pipelineExecutionId: '={{ $parameter["pipelineExecutionId"] }}',
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
				description: 'List pipeline executions',
				action: 'List pipeline executions',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodePipeline_20150709.ListPipelineExecutions',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							pipelineName: '={{ $parameter["pipelineName"] }}',
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
				name: 'Retry',
				value: 'retry',
				description: 'Retry failed stage execution',
				action: 'Retry failed stage',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodePipeline_20150709.RetryStageExecution',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							pipelineName: '={{ $parameter["pipelineName"] }}',
							stageName: '={{ $parameter["stageName"] }}',
							pipelineExecutionId: '={{ $parameter["pipelineExecutionId"] }}',
							retryMode: '={{ $parameter["retryMode"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start pipeline execution',
				action: 'Start pipeline execution',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodePipeline_20150709.StartPipelineExecution',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							name: '={{ $parameter["pipelineName"] }}',
							clientRequestToken: '={{ $parameter["clientRequestToken"] }}',
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
				description: 'Stop pipeline execution',
				action: 'Stop pipeline execution',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'CodePipeline_20150709.StopPipelineExecution',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							pipelineName: '={{ $parameter["pipelineName"] }}',
							pipelineExecutionId: '={{ $parameter["pipelineExecutionId"] }}',
							abandon: '={{ $parameter["abandon"] }}',
							reason: '={{ $parameter["reason"] }}',
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
		displayName: 'Pipeline Name',
		name: 'pipelineName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['execution'],
			},
		},
		default: '',
		description: 'Name of the pipeline',
	},
	{
		displayName: 'Pipeline Execution ID',
		name: 'pipelineExecutionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['get', 'stop', 'retry'],
			},
		},
		default: '',
		description: 'ID of the pipeline execution',
	},
	// Start operation fields
	{
		displayName: 'Client Request Token',
		name: 'clientRequestToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['start'],
			},
		},
		default: '',
		description: 'Idempotency token (optional)',
	},
	// Stop operation fields
	{
		displayName: 'Abandon',
		name: 'abandon',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['stop'],
			},
		},
		default: false,
		description: 'Whether to abandon (true) or stop and wait (false)',
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['stop'],
			},
		},
		default: '',
		description: 'Reason for stopping execution',
	},
	// Retry operation fields
	{
		displayName: 'Stage Name',
		name: 'stageName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['retry'],
			},
		},
		default: '',
		description: 'Name of the stage to retry',
	},
	{
		displayName: 'Retry Mode',
		name: 'retryMode',
		type: 'options',
		options: [
			{ name: 'Failed Actions', value: 'FAILED_ACTIONS' },
			{ name: 'All Actions', value: 'ALL_ACTIONS' },
		],
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['retry'],
			},
		},
		default: 'FAILED_ACTIONS',
		description: 'What to retry in the stage',
	},
	// List operation fields
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['execution'],
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
				resource: ['execution'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];
