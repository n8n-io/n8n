import type { INodeProperties } from 'n8n-workflow';

export const distributionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['distribution'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about a distribution',
				action: 'Get a distribution',
				routing: {
					request: {
						method: 'GET',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all distributions',
				action: 'List distributions',
				routing: {
					request: {
						method: 'GET',
						url: '/2020-05-31/distribution',
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
						method: 'GET',
						url: '=/2020-05-31/distribution/{{ $parameter["distributionId"] }}/config',
					},
					send: {
						preSend: [
							async function(this, requestOptions) {
								const response = await this.helpers.httpRequest(requestOptions);
								const etag = response.headers?.etag || '';
								
								requestOptions.method = 'PUT';
								requestOptions.url = requestOptions.url.replace('/config', '');
								requestOptions.headers = requestOptions.headers || {};
								requestOptions.headers['If-Match'] = etag;
								
								let config = response.body;
								if (typeof config === 'string') {
									config = JSON.parse(config);
								}
								config.Enabled = false;
								requestOptions.body = config;
								
								return requestOptions;
							},
						],
					},
				},
			},
		],
		default: 'list',
	},
];

export const distributionFields: INodeProperties[] = [
	{
		displayName: 'Distribution ID',
		name: 'distributionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['distribution'],
				operation: ['get', 'disable'],
			},
		},
		default: '',
		description: 'The distribution identifier',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['distribution'],
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
