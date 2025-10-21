import type { INodeProperties } from 'n8n-workflow';
import { handleConnectError } from '../../helpers/errorHandler';

export const instanceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['instance'],
			},
		},
		options: [
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of an instance',
				action: 'Describe an instance',
				routing: {
					request: {
						method: 'GET',
						url: '=/instance/{{$parameter["instanceId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Instance',
								},
							},
							handleConnectError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all instances',
				action: 'List instances',
				routing: {
					request: {
						method: 'GET',
						url: '/instance',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'InstanceSummaryList',
								},
							},
							handleConnectError,
						],
					},
				},
			},
		],
	},
];

export const instanceFields: INodeProperties[] = [
	{
		displayName: 'Instance ID',
		name: 'instanceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['instance'],
				operation: ['describe'],
			},
		},
		description: 'The identifier of the instance',
	},
];
