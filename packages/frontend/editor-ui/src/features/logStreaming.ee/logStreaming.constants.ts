import type { INodeProperties } from 'n8n-workflow';

export const webhookModalDescription = [
	{
		displayName: 'Method',
		name: 'method',
		noDataExpression: true,
		type: 'options',
		options: [
			{
				name: 'GET',
				value: 'GET',
			},
			{
				name: 'POST',
				value: 'POST',
			},
			{
				name: 'PUT',
				value: 'PUT',
			},
		],
		default: 'POST',
		description: 'The request method to use',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		noDataExpression: true,
		default: '',
		placeholder: 'http://example.com/index.html',
		description: 'The URL to make the request to',
	},
	// TODO: commented out until required and implemented on backend
	// {
	// 	displayName: 'Authentication',
	// 	name: 'authentication',
	// 	noDataExpression: true,
	// 	type: 'options',
	// 	options: [
	// 		{
	// 			name: 'None',
	// 			value: 'none',
	// 		},
	// 		// {
	// 		// 	name: 'Predefined Credential Type',
	// 		// 	value: 'predefinedCredentialType',
	// 		// 	description:
	// 		// 		"We've already implemented auth for many services so that you don't have to set it up manually",
	// 		// },
	// 		{
	// 			name: 'Generic Credential Type',
	// 			value: 'genericCredentialType',
	// 			description: 'Fully customizable. Choose between basic, header, OAuth2, etc.',
	// 		},
	// 	],
	// 	default: 'none',
	// },
	// {
	// 	displayName: 'Credential Type',
	// 	name: 'nodeCredentialType',
	// 	type: 'credentialsSelect',
	// 	noDataExpression: true,
	// 	default: '',
	// 	credentialTypes: ['extends:oAuth2Api', 'extends:oAuth1Api', 'has:authenticate'],
	// 	displayOptions: {
	// 		show: {
	// 			authentication: ['predefinedCredentialType'],
	// 		},
	// 	},
	// },
	{
		displayName: 'Generic Auth Type (OAuth not supported yet)',
		name: 'genericAuthType',
		type: 'credentialsSelect',
		default: '',
		credentialTypes: ['has:genericAuth'],
		displayOptions: {
			show: {
				authentication: ['genericCredentialType'],
			},
		},
	},
	{
		displayName: 'Add Query Parameters',
		name: 'sendQuery',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description: 'Whether the request has query params or not',
	},
	{
		displayName: 'Specify Query Parameters',
		name: 'specifyQuery',
		type: 'options',
		displayOptions: {
			show: {
				sendQuery: [true],
			},
		},
		options: [
			{
				name: 'Using Fields Below',
				value: 'keypair',
			},
			{
				name: 'Using JSON',
				value: 'json',
			},
		],
		default: 'keypair',
	},
	{
		displayName: 'Add Query Parameters',
		name: 'queryParameters',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				sendQuery: [true],
				specifyQuery: ['keypair'],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Parameter',
		default: {
			parameters: [
				{
					name: '',
					value: '',
				},
			],
		},
		options: [
			{
				name: 'parameters',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'JSON',
		name: 'jsonQuery',
		type: 'json',
		displayOptions: {
			show: {
				sendQuery: [true],
				specifyQuery: ['json'],
			},
		},
		default: '',
	},
	{
		displayName: 'Add Headers',
		name: 'sendHeaders',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description: 'Whether the request has headers or not',
	},
	{
		displayName: 'Specify Headers',
		name: 'specifyHeaders',
		type: 'options',
		displayOptions: {
			show: {
				sendHeaders: [true],
			},
		},
		options: [
			{
				name: 'Using Fields Below',
				value: 'keypair',
			},
			{
				name: 'Using JSON',
				value: 'json',
			},
		],
		default: 'keypair',
	},
	{
		displayName: 'Header Parameters',
		name: 'headerParameters',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				sendHeaders: [true],
				specifyHeaders: ['keypair'],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Parameter',
		default: {
			parameters: [
				{
					name: '',
					value: '',
				},
			],
		},
		options: [
			{
				name: 'parameters',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'JSON',
		name: 'jsonHeaders',
		type: 'json',
		displayOptions: {
			show: {
				sendHeaders: [true],
				specifyHeaders: ['json'],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Ignore SSL Issues (Insecure)',
				name: 'allowUnauthorizedCerts',
				type: 'boolean',
				noDataExpression: true,
				default: false,
				description: 'Whether to ignore SSL certificate validation',
			},
			{
				displayName: 'Array Format in Query Parameters',
				name: 'queryParameterArrays',
				type: 'options',
				displayOptions: {
					show: {
						'/sendQuery': [true],
					},
				},
				options: [
					{
						name: 'No Brackets',
						value: 'repeat',
						description: 'e.g. foo=bar&foo=qux',
					},
					{
						name: 'Brackets Only',
						value: 'brackets',
						description: 'e.g. foo[]=bar&foo[]=qux',
					},
					{
						name: 'Brackets with Indices',
						value: 'indices',
						description: 'e.g. foo[0]=bar&foo[1]=qux',
					},
				],
				default: 'brackets',
			},
			{
				displayName: 'Redirects',
				name: 'redirect',
				placeholder: 'Add Redirect',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {
					redirect: {},
				},
				options: [
					{
						displayName: 'Redirect',
						name: 'redirect',
						values: [
							{
								displayName: 'Follow Redirects',
								name: 'followRedirects',
								type: 'boolean',
								default: false,
								noDataExpression: true,
								description: 'Whether to follow all redirects',
							},
							{
								displayName: 'Max Redirects',
								name: 'maxRedirects',
								type: 'number',
								displayOptions: {
									show: {
										followRedirects: [true],
									},
								},
								default: 21,
								description: 'Max number of redirects to follow',
							},
						],
					},
				],
			},
			{
				displayName: 'Proxy',
				name: 'proxy',
				description: 'Add Proxy',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {
					proxy: {},
				},
				options: [
					{
						displayName: 'Proxy',
						name: 'proxy',
						values: [
							{
								displayName: 'Protocol',
								name: 'protocol',
								type: 'options',
								default: 'https',
								options: [
									{
										name: 'HTTPS',
										value: 'https',
									},
									{
										name: 'HTTP',
										value: 'http',
									},
								],
							},
							{
								displayName: 'Host',
								name: 'host',
								type: 'string',
								default: '127.0.0.1',
								description: 'Proxy Host (without protocol or port)',
							},
							{
								displayName: 'Port',
								name: 'port',
								type: 'number',
								default: 9000,
								description: 'Proxy Port',
							},
						],
					},
				],
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 10000,
				description:
					'Time in ms to wait for the server to send response headers (and start the response body) before aborting the request',
			},
		],
	},
] as INodeProperties[];

export const syslogModalDescription = [
	{
		displayName: 'Host',
		name: 'host',
		type: 'string',
		default: '127.0.0.1',
		placeholder: '127.0.0.1',
		description: 'The IP or host name to make the request to',
		noDataExpression: true,
	},
	{
		displayName: 'Port',
		name: 'port',
		type: 'number',
		default: '514',
		placeholder: '514',
		description: 'The port number to make the request to',
		noDataExpression: true,
	},
	{
		displayName: 'Protocol',
		name: 'protocol',
		type: 'options',
		options: [
			{
				name: 'TCP',
				value: 'tcp',
			},
			{
				name: 'UDP',
				value: 'udp',
			},
		],
		default: 'udp',
		description: 'The protocol to use for the connection',
	},
	{
		displayName: 'Facility',
		name: 'facility',
		type: 'options',
		options: [
			{ name: 'Kernel', value: 0 },
			{ name: 'User', value: 1 },
			{ name: 'System', value: 3 },
			{ name: 'Audit', value: 13 },
			{ name: 'Alert', value: 14 },
			{ name: 'Local0', value: 16 },
			{ name: 'Local1', value: 17 },
			{ name: 'Local2', value: 18 },
			{ name: 'Local3', value: 19 },
			{ name: 'Local4', value: 20 },
			{ name: 'Local5', value: 21 },
			{ name: 'Local6', value: 22 },
			{ name: 'Local7', value: 23 },
		],
		default: '16',
		description: 'Syslog facility parameter',
	},
	{
		displayName: 'App Name',
		name: 'app_name',
		type: 'string',
		default: 'n8n',
		placeholder: 'n8n',
		noDataExpression: true,
		description: 'Syslog app name parameter',
	},
] as INodeProperties[];

export const sentryModalDescription = [
	{
		displayName: 'DSN',
		name: 'dsn',
		type: 'string',
		default: 'https://',
		noDataExpression: true,
		description: 'Your Sentry DSN Client Key',
	},
] as INodeProperties[];
