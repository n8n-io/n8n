import type { INodeProperties } from 'n8n-workflow';
import { handlePersonalizeError } from '../../helpers/errorHandler';

export const solutionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['solution'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a solution',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.CreateSolution',
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
				action: 'Delete a solution',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.DeleteSolution',
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
				action: 'Describe a solution',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.DescribeSolution',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'solution',
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
				action: 'List solutions',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonPersonalize.ListSolutions',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'solutions',
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

export const solutionFields: INodeProperties[] = [
	{
		displayName: 'Solution Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['solution'],
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
		displayName: 'Solution ARN',
		name: 'solutionArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['solution'],
				operation: ['delete', 'describe'],
			},
		},
		routing: {
			request: {
				body: {
					solutionArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Dataset Group ARN',
		name: 'datasetGroupArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['solution'],
				operation: ['create', 'list'],
			},
		},
		routing: {
			request: {
				body: {
					datasetGroupArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Recipe ARN',
		name: 'recipeArn',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['solution'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					recipeArn: '={{ $value }}',
				},
			},
		},
	},
];
