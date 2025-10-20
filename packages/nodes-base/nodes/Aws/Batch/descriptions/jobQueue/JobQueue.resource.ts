import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['jobQueue'],
			},
		},
		options: [
			{
				name: 'Describe',
				value: 'describe',
				description: 'Describe job queues',
				action: 'Describe job queues',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/describejobqueues',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							jobQueues: '={{ $parameter["jobQueues"] }}',
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
				name: 'List',
				value: 'list',
				description: 'List job queues (simple)',
				action: 'List job queues',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/describejobqueues',
						headers: {
							'Content-Type': 'application/json',
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
		],
	},
	// Describe operation
	{
		displayName: 'Job Queues',
		name: 'jobQueues',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['jobQueue'],
				operation: ['describe'],
			},
		},
		default: '[]',
		description: 'Array of job queue names or ARNs (optional, empty for all)',
	},
	// List/Describe operations
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['jobQueue'],
				operation: ['describe', 'list'],
			},
		},
		default: 100,
		description: 'Maximum number of job queues to return',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['jobQueue'],
				operation: ['describe', 'list'],
			},
		},
		default: '',
		description: 'Pagination token',
	},
];
