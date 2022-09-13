import { INodeProperties } from 'n8n-workflow';

export const scanOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['scan'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a scan',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all scans',
			},
			{
				name: 'Perform',
				value: 'perform',
				action: 'Perform a scan',
			},
		],
		default: 'perform',
	},
];

export const scanFields: INodeProperties[] = [
	// ----------------------------------------
	//               scan: get
	// ----------------------------------------
	{
		displayName: 'Scan ID',
		name: 'scanId',
		type: 'string',
		default: '',
		description: 'ID of the scan to retrieve',
		displayOptions: {
			show: {
				resource: ['scan'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             scan: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['scan'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['scan'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['scan'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				description:
					'Query using the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#query-dsl-query-string-query">Elastic Search Query String syntax</a>. See <a href="https://urlscan.io/docs/search/">supported fields</a> in the documentation.',
				default: '',
				placeholder: 'domain:n8n.io',
			},
		],
	},

	// ----------------------------------------
	//             scan: perform
	// ----------------------------------------
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		placeholder: 'https://n8n.io',
		description: 'URL to scan',
		displayOptions: {
			show: {
				resource: ['scan'],
				operation: ['perform'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['scan'],
				operation: ['perform'],
			},
		},
		options: [
			{
				displayName: 'Custom Agent',
				name: 'customAgent',
				description:
					'<code>User-Agent</code> header to set for this scan. Defaults to <code>n8n</code>',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Override Safety',
				name: 'overrideSafety',
				description: 'Disable reclassification of URLs with potential PII in them',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Referer',
				name: 'referer',
				description: 'HTTP referer to set for this scan',
				type: 'string',
				placeholder: 'https://n8n.io',
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				description:
					'Comma-separated list of user-defined tags to add to this scan. Limited to 10 tags.',
				placeholder: 'phishing, malicious',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Visibility',
				name: 'visibility',
				type: 'options',
				default: 'private',
				options: [
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Public',
						value: 'public',
					},
					{
						name: 'Unlisted',
						value: 'unlisted',
					},
				],
			},
		],
	},
];
