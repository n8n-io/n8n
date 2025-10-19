import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { awsApiRequestSOAP, awsApiRequestREST } from '../GenericFunctions';

export class AwsCloudWatch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS CloudWatch',
		name: 'awsCloudWatch',
		icon: 'file:cloudwatch.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Monitor AWS resources and applications with CloudWatch',
		defaults: {
			name: 'AWS CloudWatch',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Put Metric Data',
						value: 'putMetricData',
						description: 'Publish custom metric data to CloudWatch',
						action: 'Put metric data',
					},
					{
						name: 'Get Metric Statistics',
						value: 'getMetricStatistics',
						description: 'Get statistics for a specific metric',
						action: 'Get metric statistics',
					},
					{
						name: 'List Metrics',
						value: 'listMetrics',
						description: 'List available metrics in CloudWatch',
						action: 'List metrics',
					},
					{
						name: 'Put Log Events',
						value: 'putLogEvents',
						description: 'Upload log events to CloudWatch Logs',
						action: 'Put log events',
					},
					{
						name: 'Create Log Group',
						value: 'createLogGroup',
						description: 'Create a new CloudWatch Logs log group',
						action: 'Create log group',
					},
					{
						name: 'Get Log Events',
						value: 'getLogEvents',
						description: 'Retrieve log events from CloudWatch Logs',
						action: 'Get log events',
					},
				],
				default: 'putMetricData',
			},
			// Put Metric Data
			{
				displayName: 'Namespace',
				name: 'namespace',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['putMetricData'],
					},
				},
				default: '',
				required: true,
				placeholder: 'MyApplication/Performance',
				description: 'Custom namespace for metrics (must not start with "AWS/")',
			},
			{
				displayName: 'Metric Name',
				name: 'metricName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['putMetricData'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the metric',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['putMetricData'],
					},
				},
				default: 0,
				required: true,
				description: 'Metric value',
			},
			{
				displayName: 'Unit',
				name: 'unit',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['putMetricData'],
					},
				},
				options: [
					{ name: 'None', value: 'None' },
					{ name: 'Seconds', value: 'Seconds' },
					{ name: 'Microseconds', value: 'Microseconds' },
					{ name: 'Milliseconds', value: 'Milliseconds' },
					{ name: 'Bytes', value: 'Bytes' },
					{ name: 'Kilobytes', value: 'Kilobytes' },
					{ name: 'Megabytes', value: 'Megabytes' },
					{ name: 'Gigabytes', value: 'Gigabytes' },
					{ name: 'Count', value: 'Count' },
					{ name: 'Percent', value: 'Percent' },
				],
				default: 'None',
				description: 'Unit of measurement',
			},
			// Get Metric Statistics
			{
				displayName: 'Namespace',
				name: 'namespace',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getMetricStatistics', 'listMetrics'],
					},
				},
				default: '',
				required: true,
				description: 'Metric namespace',
			},
			{
				displayName: 'Metric Name',
				name: 'metricName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getMetricStatistics'],
					},
				},
				default: '',
				required: true,
				description: 'Metric name',
			},
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				displayOptions: {
					show: {
						operation: ['getMetricStatistics'],
					},
				},
				default: '',
				required: true,
				description: 'Start of time range',
			},
			{
				displayName: 'End Time',
				name: 'endTime',
				type: 'dateTime',
				displayOptions: {
					show: {
						operation: ['getMetricStatistics'],
					},
				},
				default: '',
				required: true,
				description: 'End of time range',
			},
			{
				displayName: 'Period',
				name: 'period',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getMetricStatistics'],
					},
				},
				default: 300,
				required: true,
				description: 'Period in seconds (multiple of 60)',
			},
			{
				displayName: 'Statistics',
				name: 'statistics',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: ['getMetricStatistics'],
					},
				},
				options: [
					{ name: 'Sample Count', value: 'SampleCount' },
					{ name: 'Average', value: 'Average' },
					{ name: 'Sum', value: 'Sum' },
					{ name: 'Minimum', value: 'Minimum' },
					{ name: 'Maximum', value: 'Maximum' },
				],
				default: ['Average'],
				required: true,
				description: 'Statistics to retrieve',
			},
			// Put Log Events
			{
				displayName: 'Log Group Name',
				name: 'logGroupName',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['putLogEvents', 'getLogEvents'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getLogGroups',
				},
				default: '',
				required: true,
				description: 'Log group name',
			},
			{
				displayName: 'Log Stream Name',
				name: 'logStreamName',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['putLogEvents', 'getLogEvents'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getLogStreams',
					loadOptionsDependsOn: ['logGroupName'],
				},
				default: '',
				required: true,
				description: 'Log stream name',
			},
			{
				displayName: 'Log Events',
				name: 'logEvents',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['putLogEvents'],
					},
				},
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'Log messages (one per line)',
			},
			// Create Log Group
			{
				displayName: 'Log Group Name',
				name: 'logGroupName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createLogGroup'],
					},
				},
				default: '',
				required: true,
				description: 'Name for the log group',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['createLogGroup', 'getLogEvents'],
					},
				},
				options: [
					{
						displayName: 'Retention In Days',
						name: 'retentionInDays',
						type: 'options',
						options: [
							{ name: '1 day', value: 1 },
							{ name: '3 days', value: 3 },
							{ name: '7 days', value: 7 },
							{ name: '14 days', value: 14 },
							{ name: '30 days', value: 30 },
							{ name: '60 days', value: 60 },
							{ name: '90 days', value: 90 },
							{ name: '120 days', value: 120 },
							{ name: '365 days', value: 365 },
						],
						default: 30,
						description: 'Log retention period',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 100,
						typeOptions: {
							minValue: 1,
							maxValue: 10000,
						},
						description: 'Max events to return',
					},
				],
			},
			// List Metrics
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['listMetrics'],
					},
				},
				default: true,
				description: 'Whether to return all results',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['listMetrics'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},
		],
	};

	methods = {
		loadOptions: {
			async getLogGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const body = { limit: 50 };
					const data = await awsApiRequestREST.call(
						this,
						'logs',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'Logs_20140328.DescribeLogGroups',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					if (!data.logGroups) return [];

					return data.logGroups.map((lg: any) => ({
						name: lg.logGroupName,
						value: lg.logGroupName,
					}));
				} catch (error) {
					return [];
				}
			},

			async getLogStreams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const logGroupName = this.getNodeParameter('logGroupName') as string;

					const body = { logGroupName, limit: 50 };
					const data = await awsApiRequestREST.call(
						this,
						'logs',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'Logs_20140328.DescribeLogStreams',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					if (!data.logStreams) return [];

					return data.logStreams.map((ls: any) => ({
						name: ls.logStreamName,
						value: ls.logStreamName,
					}));
				} catch (error) {
					return [];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i);
				let responseData: any;

				if (operation === 'putMetricData') {
					const namespace = this.getNodeParameter('namespace', i) as string;
					const metricName = this.getNodeParameter('metricName', i) as string;
					const value = this.getNodeParameter('value', i) as number;
					const unit = this.getNodeParameter('unit', i) as string;

					let path = `/?Action=PutMetricData&Version=2010-08-01&Namespace=${encodeURIComponent(namespace)}`;
					path += `&MetricData.member.1.MetricName=${encodeURIComponent(metricName)}`;
					path += `&MetricData.member.1.Value=${value}`;
					path += `&MetricData.member.1.Unit=${unit}`;
					path += `&MetricData.member.1.Timestamp=${new Date().toISOString()}`;

					responseData = await awsApiRequestSOAP.call(this, 'monitoring', 'POST', path);
					responseData = { success: true, namespace, metricName, value };
				} else if (operation === 'getMetricStatistics') {
					const namespace = this.getNodeParameter('namespace', i) as string;
					const metricName = this.getNodeParameter('metricName', i) as string;
					const startTime = this.getNodeParameter('startTime', i) as string;
					const endTime = this.getNodeParameter('endTime', i) as string;
					const period = this.getNodeParameter('period', i) as number;
					const statistics = this.getNodeParameter('statistics', i) as string[];

					let path = `/?Action=GetMetricStatistics&Version=2010-08-01`;
					path += `&Namespace=${encodeURIComponent(namespace)}`;
					path += `&MetricName=${encodeURIComponent(metricName)}`;
					path += `&StartTime=${new Date(startTime).toISOString()}`;
					path += `&EndTime=${new Date(endTime).toISOString()}`;
					path += `&Period=${period}`;

					statistics.forEach((stat, index) => {
						path += `&Statistics.member.${index + 1}=${stat}`;
					});

					responseData = await awsApiRequestSOAP.call(this, 'monitoring', 'GET', path);

					const datapoints =
						responseData?.GetMetricStatisticsResponse?.GetMetricStatisticsResult
							?.Datapoints?.member || [];
					responseData = Array.isArray(datapoints) ? datapoints : [datapoints];
				} else if (operation === 'listMetrics') {
					const namespace = this.getNodeParameter('namespace', i, '') as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					let path = '/?Action=ListMetrics&Version=2010-08-01';

					if (namespace) {
						path += `&Namespace=${encodeURIComponent(namespace)}`;
					}

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						path += `&MaxResults=${limit}`;
					}

					responseData = await awsApiRequestSOAP.call(this, 'monitoring', 'GET', path);

					const metrics =
						responseData?.ListMetricsResponse?.ListMetricsResult?.Metrics?.member || [];
					responseData = Array.isArray(metrics) ? metrics : [metrics];
				} else if (operation === 'putLogEvents') {
					const logGroupName = this.getNodeParameter('logGroupName', i) as string;
					const logStreamName = this.getNodeParameter('logStreamName', i) as string;
					const logEvents = this.getNodeParameter('logEvents', i) as string;

					const events = logEvents.split('\n').map((message) => ({
						message: message.trim(),
						timestamp: Date.now(),
					}));

					const body = {
						logGroupName,
						logStreamName,
						logEvents: events,
					};

					responseData = await awsApiRequestREST.call(
						this,
						'logs',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'Logs_20140328.PutLogEvents',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);
				} else if (operation === 'createLogGroup') {
					const logGroupName = this.getNodeParameter('logGroupName', i) as string;

					const body: IDataObject = {
						logGroupName,
					};

					responseData = await awsApiRequestREST.call(
						this,
						'logs',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'Logs_20140328.CreateLogGroup',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					responseData = { success: true, logGroupName };
				} else if (operation === 'getLogEvents') {
					const logGroupName = this.getNodeParameter('logGroupName', i) as string;
					const logStreamName = this.getNodeParameter('logStreamName', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const body: IDataObject = {
						logGroupName,
						logStreamName,
						startFromHead: true,
						limit: additionalFields.limit || 100,
					};

					responseData = await awsApiRequestREST.call(
						this,
						'logs',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'Logs_20140328.GetLogEvents',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					responseData = responseData.events || [];
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
