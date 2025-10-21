import type { INodeProperties } from 'n8n-workflow';
import { handleForecastError } from '../../helpers/errorHandler';

export const predictorOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['predictor'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new predictor',
				action: 'Create a predictor',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.CreatePredictor',
						},
					},
					output: {
						postReceive: [handleForecastError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a predictor',
				action: 'Delete a predictor',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.DeletePredictor',
						},
					},
					output: {
						postReceive: [handleForecastError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of a predictor',
				action: 'Describe a predictor',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.DescribePredictor',
						},
					},
					output: {
						postReceive: [handleForecastError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all predictors',
				action: 'List predictors',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.ListPredictors',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Predictors',
								},
							},
							handleForecastError,
						],
					},
				},
			},
		],
	},
];

export const predictorFields: INodeProperties[] = [
	{
		displayName: 'Predictor Name',
		name: 'predictorName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['predictor'],
				operation: ['create'],
			},
		},
		description: 'The name of the predictor',
		routing: {
			request: {
				body: {
					PredictorName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Predictor ARN',
		name: 'predictorArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['predictor'],
				operation: ['delete', 'describe'],
			},
		},
		description: 'The ARN of the predictor',
		routing: {
			request: {
				body: {
					PredictorArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Forecast Horizon',
		name: 'forecastHorizon',
		type: 'number',
		required: true,
		default: 1,
		displayOptions: {
			show: {
				resource: ['predictor'],
				operation: ['create'],
			},
		},
		description: 'The number of time-steps to forecast',
		routing: {
			request: {
				body: {
					ForecastHorizon: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Input Data Config',
		name: 'inputDataConfig',
		type: 'json',
		required: true,
		default: '{"DatasetGroupArn": ""}',
		displayOptions: {
			show: {
				resource: ['predictor'],
				operation: ['create'],
			},
		},
		description: 'Input data configuration (JSON format)',
		routing: {
			request: {
				body: {
					InputDataConfig: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
	{
		displayName: 'Feature Transformation',
		name: 'featurizationConfig',
		type: 'json',
		default: '{"ForecastFrequency": "D"}',
		displayOptions: {
			show: {
				resource: ['predictor'],
				operation: ['create'],
			},
		},
		description: 'Featurization configuration (JSON format)',
		routing: {
			request: {
				body: {
					FeaturizationConfig: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];
