import type { INodeProperties } from 'n8n-workflow';
import { API_VERSION } from '../../helpers/constants';
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
				resource: ['hostedZone'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a hosted zone',
				action: 'Create a hosted zone',
				routing: {
					request: {
						method: 'POST',
						url: `/${API_VERSION}/hostedzone`,
						headers: {
							'Content-Type': 'application/xml',
						},
						body: '={{ "<CreateHostedZoneRequest xmlns=\\"https://route53.amazonaws.com/doc/2013-04-01/\\"><Name>" + $parameter["domainName"] + "</Name><CallerReference>" + $parameter["callerReference"] + "</CallerReference></CreateHostedZoneRequest>" }}',
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
				description: 'Delete a hosted zone',
				action: 'Delete a hosted zone',
				routing: {
					request: {
						method: 'DELETE',
						url: `=/${API_VERSION}/hostedzone/{{ $parameter["hostedZoneId"] }}`,
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
				description: 'Get a hosted zone',
				action: 'Get a hosted zone',
				routing: {
					request: {
						method: 'GET',
						url: `=/${API_VERSION}/hostedzone/{{ $parameter["hostedZoneId"] }}`,
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
				description: 'List hosted zones',
				action: 'List hosted zones',
				routing: {
					request: {
						method: 'GET',
						url: `/${API_VERSION}/hostedzone`,
						qs: {
							maxitems: '={{ $parameter["maxItems"] }}',
							marker: '={{ $parameter["marker"] }}',
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
	// Create operation fields
	{
		displayName: 'Domain Name',
		name: 'domainName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['hostedZone'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The domain name (e.g., example.com)',
	},
	{
		displayName: 'Caller Reference',
		name: 'callerReference',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['hostedZone'],
				operation: ['create'],
			},
		},
		default: '={{$now}}',
		description: 'Unique string to identify the request',
	},
	// Get/Delete operation fields
	{
		displayName: 'Hosted Zone ID',
		name: 'hostedZoneId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['hostedZone'],
				operation: ['get', 'delete'],
			},
		},
		default: '',
		description: 'The ID of the hosted zone',
	},
	// List operation fields
	{
		displayName: 'Max Items',
		name: 'maxItems',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['hostedZone'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of hosted zones to return',
	},
	{
		displayName: 'Marker',
		name: 'marker',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['hostedZone'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination marker from previous response',
	},
];
