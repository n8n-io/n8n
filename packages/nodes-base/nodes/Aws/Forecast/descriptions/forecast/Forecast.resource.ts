import type { INodeProperties } from 'n8n-workflow';
import { handleForecastError } from '../../helpers/errorHandler';

export const forecastOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['forecast'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new forecast',
				action: 'Create a forecast',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.CreateForecast',
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
				description: 'Delete a forecast',
				action: 'Delete a forecast',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.DeleteForecast',
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
				description: 'Get details of a forecast',
				action: 'Describe a forecast',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.DescribeForecast',
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
				description: 'List all forecasts',
				action: 'List forecasts',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'AmazonForecast.ListForecasts',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Forecasts',
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

export const forecastFields: INodeProperties[] = [
	{
		displayName: 'Forecast Name',
		name: 'forecastName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['forecast'],
				operation: ['create'],
			},
		},
		description: 'The name of the forecast',
		routing: {
			request: {
				body: {
					ForecastName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Forecast ARN',
		name: 'forecastArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['forecast'],
				operation: ['delete', 'describe'],
			},
		},
		description: 'The ARN of the forecast',
		routing: {
			request: {
				body: {
					ForecastArn: '={{ $value }}',
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
				resource: ['forecast'],
				operation: ['create'],
			},
		},
		description: 'The ARN of the predictor to use',
		routing: {
			request: {
				body: {
					PredictorArn: '={{ $value }}',
				},
			},
		},
	},
];
