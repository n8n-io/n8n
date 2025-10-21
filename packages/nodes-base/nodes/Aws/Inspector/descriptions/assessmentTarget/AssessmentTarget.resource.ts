import type { INodeProperties } from 'n8n-workflow';
import { handleInspectorError } from '../../helpers/errorHandler';

export const assessmentTargetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'enable',
		displayOptions: {
			show: {
				resource: ['assessmentTarget'],
			},
		},
		options: [
			{
				name: 'Disable',
				value: 'disable',
				description: 'Disable Amazon Inspector scans',
				action: 'Disable inspector',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Inspector2.Disable',
						},
					},
					output: {
						postReceive: [handleInspectorError],
					},
				},
			},
			{
				name: 'Enable',
				value: 'enable',
				description: 'Enable Amazon Inspector scans',
				action: 'Enable inspector',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Inspector2.Enable',
						},
					},
					output: {
						postReceive: [handleInspectorError],
					},
				},
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				description: 'Get the status of Amazon Inspector',
				action: 'Get status',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Inspector2.BatchGetAccountStatus',
						},
					},
					output: {
						postReceive: [handleInspectorError],
					},
				},
			},
		],
	},
];

export const assessmentTargetFields: INodeProperties[] = [
	// Enable fields
	{
		displayName: 'Resource Types',
		name: 'resourceTypes',
		type: 'multiOptions',
		required: true,
		default: ['EC2'],
		displayOptions: {
			show: {
				resource: ['assessmentTarget'],
				operation: ['enable', 'disable'],
			},
		},
		options: [
			{
				name: 'EC2',
				value: 'EC2',
			},
			{
				name: 'ECR',
				value: 'ECR',
			},
			{
				name: 'Lambda',
				value: 'LAMBDA',
			},
			{
				name: 'Lambda Code',
				value: 'LAMBDA_CODE',
			},
		],
		description: 'The resource types to enable or disable scanning for',
		routing: {
			request: {
				body: {
					resourceTypes: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Account IDs',
		name: 'accountIds',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['assessmentTarget'],
				operation: ['enable', 'disable'],
			},
		},
		description: 'Comma-separated list of AWS account IDs. Leave empty for current account.',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const accountIds = this.getNodeParameter('accountIds', 0) as string;
						if (accountIds) {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as any).accountIds = accountIds.split(',').map((id) => id.trim());
						}
						return requestOptions;
					},
				],
			},
		},
	},

	// Get Status fields
	{
		displayName: 'Account IDs',
		name: 'accountIds',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['assessmentTarget'],
				operation: ['getStatus'],
			},
		},
		description: 'Comma-separated list of AWS account IDs to check status for',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const accountIds = this.getNodeParameter('accountIds', 0) as string;
						if (accountIds) {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as any).accountIds = accountIds.split(',').map((id) => id.trim());
						}
						return requestOptions;
					},
				],
			},
		},
	},
];
