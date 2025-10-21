import type { INodeProperties } from 'n8n-workflow';
import { handleGameLiftError } from '../../helpers/errorHandler';

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
				name: 'Create',
				value: 'create',
				action: 'Create a fleet',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'GameLift.CreateFleet',
						},
					},
					output: {
						postReceive: [handleGameLiftError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a fleet',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'GameLift.DeleteFleet',
						},
					},
					output: {
						postReceive: [handleGameLiftError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe a fleet',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'GameLift.DescribeFleetAttributes',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'FleetAttributes',
								},
							},
							handleGameLiftError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				action: 'List fleets',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'GameLift.ListFleets',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'FleetIds',
								},
							},
							handleGameLiftError,
						],
					},
				},
			},
		],
	},
];

export const fleetFields: INodeProperties[] = [
	{
		displayName: 'Fleet Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['fleet'],
				operation: ['create'],
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
		displayName: 'Fleet ID',
		name: 'fleetId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['fleet'],
				operation: ['delete', 'describe'],
			},
		},
		routing: {
			request: {
				body: {
					FleetId: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Build ID',
		name: 'buildId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['fleet'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					BuildId: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'EC2 Instance Type',
		name: 'ec2InstanceType',
		type: 'options',
		required: true,
		default: 'c5.large',
		displayOptions: {
			show: {
				resource: ['fleet'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'c5.large',
				value: 'c5.large',
			},
			{
				name: 'c5.xlarge',
				value: 'c5.xlarge',
			},
			{
				name: 'c5.2xlarge',
				value: 'c5.2xlarge',
			},
			{
				name: 'c5.4xlarge',
				value: 'c5.4xlarge',
			},
		],
		routing: {
			request: {
				body: {
					EC2InstanceType: '={{ $value }}',
				},
			},
		},
	},
];
