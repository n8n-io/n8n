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
				resource: ['distribution'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a distribution',
				action: 'Create a distribution',
				routing: {
					request: {
						method: 'POST',
						url: '/2020-05-31/distribution',
						headers: {
							'Content-Type': 'application/xml',
						},
						body: '={{ $parameter["distributionConfig"] }}',
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
				description: 'Delete a distribution',
				action: 'Delete a distribution',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}',
						headers: {
							'If-Match': '={{ $parameter["etag"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Disable',
				value: 'disable',
				description: 'Disable a distribution',
				action: 'Disable a distribution',
				routing: {
					request: {
						method: 'PUT',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}/config',
						headers: {
							'Content-Type': 'application/xml',
							'If-Match': '={{ $parameter["etag"] }}',
						},
						body: '={{ $parameter["distributionConfig"] }}',
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
				description: 'Get distribution details',
				action: 'Get a distribution',
				routing: {
					request: {
						method: 'GET',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get Config',
				value: 'getConfig',
				description: 'Get distribution configuration',
				action: 'Get distribution config',
				routing: {
					request: {
						method: 'GET',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}/config',
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
				description: 'List distributions',
				action: 'List distributions',
				routing: {
					request: {
						method: 'GET',
						url: '=/2020-05-31/distribution?MaxItems={{ $parameter["maxItems"] }}&Marker={{ $parameter["marker"] }}',
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
				description: 'Update a distribution',
				action: 'Update a distribution',
				routing: {
					request: {
						method: 'PUT',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}/config',
						headers: {
							'Content-Type': 'application/xml',
							'If-Match': '={{ $parameter["etag"] }}',
						},
						body: '={{ $parameter["distributionConfig"] }}',
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
				resource: ['distribution'],
				operation: ['delete', 'disable', 'get', 'getConfig', 'update'],
			},
		},
		default: '',
		description: 'CloudFront distribution ID',
	},
	// Create/Update/Disable operations
	{
		displayName: 'Distribution Config',
		name: 'distributionConfig',
		type: 'string',
		typeOptions: {
			rows: 10,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['distribution'],
				operation: ['create', 'update', 'disable'],
			},
		},
		default: '',
		description: 'Distribution configuration as XML',
	},
	// Update/Delete/Disable operations
	{
		displayName: 'ETag',
		name: 'etag',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['distribution'],
				operation: ['delete', 'update', 'disable'],
			},
		},
		default: '',
		description: 'Current ETag of the distribution (from Get Config)',
	},
	// List operation fields
	{
		displayName: 'Max Items',
		name: 'maxItems',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['distribution'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of distributions to return',
	},
	{
		displayName: 'Marker',
		name: 'marker',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['distribution'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination marker from previous response',
	},
];
