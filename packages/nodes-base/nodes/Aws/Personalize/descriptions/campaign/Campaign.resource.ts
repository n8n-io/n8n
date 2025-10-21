import type { INodeProperties } from 'n8n-workflow';
import { handlePersonalizeError } from '../../helpers/errorHandler';

export const campaignOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a campaign',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.CreateCampaign',
						},
					},
					output: {
						postReceive: [handlePersonalizeError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a campaign',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.DeleteCampaign',
						},
					},
					output: {
						postReceive: [handlePersonalizeError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe a campaign',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.DescribeCampaign',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'campaign',
								},
							},
							handlePersonalizeError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				action: 'List campaigns',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.ListCampaigns',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'campaigns',
								},
							},
							handlePersonalizeError,
						],
					},
				},
			},
		],
	},
];

export const campaignFields: INodeProperties[] = [
	{
		displayName: 'Campaign Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Campaign ARN',
		name: 'campaignArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['delete', 'describe'],
			},
		},
		routing: {
			request: {
				body: {
					campaignArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Solution Version ARN',
		name: 'solutionVersionArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					solutionVersionArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Min Provisioned TPS',
		name: 'minProvisionedTPS',
		type: 'number',
		default: 1,
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					minProvisionedTPS: '={{ $value }}',
				},
			},
		},
	},
];
