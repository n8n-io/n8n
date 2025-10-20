import type { INodeProperties } from 'n8n-workflow';

export const invalidationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['invalidation'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a cache invalidation',
				action: 'Create an invalidation',
				routing: {
					request: {
						method: 'POST',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}/invalidation',
						body: {
							InvalidationBatch: {
								CallerReference: '={{ $parameter["callerReference"] }}',
								Paths: {
									Quantity: '={{ $parameter["paths"].split(",").length }}',
									Items: '={{ $parameter["paths"].split(",") }}',
								},
							},
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about an invalidation',
				action: 'Get an invalidation',
				routing: {
					request: {
						method: 'GET',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}/invalidation/{{ $parameter["invalidationId"] }}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List invalidations for a distribution',
				action: 'List invalidations',
				routing: {
					request: {
						method: 'GET',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}/invalidation',
					},
				},
			},
		],
		default: 'list',
	},
];

export const invalidationFields: INodeProperties[] = [
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
		description: 'The distribution identifier',
	},
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
		description: 'The invalidation identifier',
	},
	{
		displayName: 'Paths',
		name: 'paths',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['invalidation'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Comma-separated list of paths to invalidate (e.g., /images/*,/css/*)',
		placeholder: '/images/*,/css/style.css',
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
		default: '={{ $now.toISO() }}',
		description: 'Unique identifier for this invalidation request',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['invalidation'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Items',
				name: 'MaxItems',
				type: 'number',
				default: 100,
				description: 'Maximum number of items to return',
			},
			{
				displayName: 'Marker',
				name: 'Marker',
				type: 'string',
				default: '',
				description: 'Marker for pagination',
			},
		],
	},
];
