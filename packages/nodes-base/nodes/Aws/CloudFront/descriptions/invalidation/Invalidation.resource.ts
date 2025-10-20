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
				resource: ['invalidation'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an invalidation',
				action: 'Create an invalidation',
				routing: {
					request: {
						method: 'POST',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}/invalidation',
						headers: {
							'Content-Type': 'application/xml',
						},
						body: '={{ "<InvalidationBatch><Paths><Quantity>" + $parameter["paths"].length + "</Quantity><Items>" + $parameter["paths"].map(p => "<Path>" + p + "</Path>").join("") + "</Items></Paths><CallerReference>" + $parameter["callerReference"] + "</CallerReference></InvalidationBatch>" }}',
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
				description: 'Get invalidation details',
				action: 'Get an invalidation',
				routing: {
					request: {
						method: 'GET',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}/invalidation/{{ $parameter["invalidationId"] }}',
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
				description: 'List invalidations',
				action: 'List invalidations',
				routing: {
					request: {
						method: 'GET',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}/invalidation?MaxItems={{ $parameter["maxItems"] }}&Marker={{ $parameter["marker"] }}',
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
		displayName: 'Distribution ID',
		name: 'distributionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['invalidation'],
			},
		},
		default: '',
		description: 'CloudFront distribution ID',
	},
	// Create operation fields
	{
		displayName: 'Paths',
		name: 'paths',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['invalidation'],
				operation: ['create'],
			},
		},
		default: '["/index.html", "/images/*"]',
		description: 'Array of paths to invalidate (e.g., ["/index.html", "/images/*", "/*"])',
	},
	{
		displayName: 'Caller Reference',
		name: 'callerReference',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['invalidation'],
				operation: ['create'],
			},
		},
		default: '={{ $now.toISOString() }}',
		description: 'Unique identifier for this invalidation request',
	},
	// Get operation field
	{
		displayName: 'Invalidation ID',
		name: 'invalidationId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['invalidation'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Invalidation ID',
	},
	// List operation fields
	{
		displayName: 'Max Items',
		name: 'maxItems',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['invalidation'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of invalidations to return',
	},
	{
		displayName: 'Marker',
		name: 'marker',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['invalidation'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination marker from previous response',
	},
];
