import type { INodeProperties } from 'n8n-workflow';
import { cronNodeOptions } from 'n8n-workflow';

export const CUSTOM_NODES_CATEGORY = 'Custom Nodes';

export const commonPollingParameters: INodeProperties[] = [
	{
		displayName: 'Poll Times',
		name: 'pollTimes',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Poll Time',
		},
		default: { item: [{ mode: 'everyMinute' }] },
		description: 'Time at which polling should occur',
		placeholder: 'Add Poll Time',
		options: cronNodeOptions,
	},
];

export const commonCORSParameters: INodeProperties[] = [
	{
		displayName: 'Allowed Origins (CORS)',
		name: 'allowedOrigins',
		type: 'string',
		default: '*',
		description:
			'Comma-separated list of URLs allowed for cross-origin non-preflight requests. Use * (default) to allow all origins.',
	},
];

export const commonDeclarativeNodeOptionParameters: INodeProperties = {
	displayName: 'Request Options',
	name: 'requestOptions',
	type: 'collection',
	isNodeSetting: true,
	placeholder: 'Add Option',
	default: {},
	options: [
		{
			displayName: 'Batching',
			name: 'batching',
			placeholder: 'Add Batching',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: false,
			},
			default: {
				batch: {},
			},
			options: [
				{
					displayName: 'Batching',
					name: 'batch',
					values: [
						{
							displayName: 'Items per Batch',
							name: 'batchSize',
							type: 'number',
							typeOptions: {
								minValue: -1,
							},
							default: 50,
							description:
								'Input will be split in batches to throttle requests. -1 for disabled. 0 will be treated as 1.',
						},
						{
							displayName: 'Batch Interval (ms)',
							name: 'batchInterval',
							type: 'number',
							typeOptions: {
								minValue: 0,
							},
							default: 1000,
							description: 'Time (in milliseconds) between each batch of requests. 0 for disabled.',
						},
					],
				},
			],
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			noDataExpression: true,
			default: false,
			description:
				'Whether to accept the response even if SSL certificate validation is not possible',
		},
		{
			displayName: 'Proxy',
			name: 'proxy',
			type: 'string',
			default: '',
			placeholder: 'e.g. http://myproxy:3128',
			description:
				'HTTP proxy to use. If authentication is required it can be defined as follow: http://username:password@myproxy:3128',
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
};
