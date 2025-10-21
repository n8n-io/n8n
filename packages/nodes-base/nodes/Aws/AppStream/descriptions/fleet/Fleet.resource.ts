import type { INodeProperties } from 'n8n-workflow';
import { handleAppStreamError } from '../../helpers/errorHandler';

export const fleetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['fleet'],
			},
		},
		options: [
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe fleets',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'PhotonAdminProxyService.DescribeFleets',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Fleets',
								},
							},
							handleAppStreamError,
						],
					},
				},
			},
			{
				name: 'Start',
				value: 'start',
				action: 'Start fleet',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'PhotonAdminProxyService.StartFleet',
						},
					},
					output: {
						postReceive: [handleAppStreamError],
					},
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				action: 'Stop fleet',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'PhotonAdminProxyService.StopFleet',
						},
					},
					output: {
						postReceive: [handleAppStreamError],
					},
				},
			},
		],
	},
];

export const fleetFields: INodeProperties[] = [
	{
		displayName: 'Fleet Name',
		name: 'fleetName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['fleet'],
				operation: ['start', 'stop'],
			},
		},
		routing: {
			request: {
				body: {
					Name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Fleet Names',
		name: 'fleetNames',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['fleet'],
				operation: ['describe'],
			},
		},
		routing: {
			request: {
				body: {
					Names: '={{ $value ? $value.split(",").map(s => s.trim()) : undefined }}',
				},
			},
		},
	},
];
