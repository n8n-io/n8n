import type { INodeProperties } from 'n8n-workflow';
import { handleMediaConvertError } from '../../helpers/errorHandler';

export const queueOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['queue'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new queue',
				action: 'Create a queue',
				routing: {
					request: {
						method: 'POST',
						url: '/2017-08-29/queues',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Queue',
								},
							},
							handleMediaConvertError,
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a queue',
				action: 'Delete a queue',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/2017-08-29/queues/{{$parameter["queueName"]}}',
					},
					output: {
						postReceive: [handleMediaConvertError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of a queue',
				action: 'Get a queue',
				routing: {
					request: {
						method: 'GET',
						url: '=/2017-08-29/queues/{{$parameter["queueName"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Queue',
								},
							},
							handleMediaConvertError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all queues',
				action: 'List queues',
				routing: {
					request: {
						method: 'GET',
						url: '/2017-08-29/queues',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Queues',
								},
							},
							handleMediaConvertError,
						],
					},
				},
			},
		],
	},
];

export const queueFields: INodeProperties[] = [
	{
		displayName: 'Queue Name',
		name: 'queueName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['queue'],
				operation: ['create', 'delete', 'get'],
			},
		},
		description: 'The name of the queue',
		routing: {
			request: {
				body: {
					Name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Pricing Plan',
		name: 'pricingPlan',
		type: 'options',
		default: 'ON_DEMAND',
		displayOptions: {
			show: {
				resource: ['queue'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'On Demand',
				value: 'ON_DEMAND',
			},
			{
				name: 'Reserved',
				value: 'RESERVED',
			},
		],
		description: 'The pricing plan for the queue',
		routing: {
			request: {
				body: {
					PricingPlan: '={{ $value }}',
				},
			},
		},
	},
];
