import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleCloudWatchLogsError } from './helpers/errorHandler';

import {
	logGroupOperations,
	logGroupFields,
	logStreamOperations,
	logStreamFields,
} from './descriptions';

export class AwsCloudWatchLogs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS CloudWatch Logs',
		name: 'awsCloudWatchLogs',
		icon: 'file:cloudwatchlogs.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS CloudWatch Logs service',
		defaults: {
			name: 'AWS CloudWatch Logs',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/x-amz-json-1.1',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Log Group',
						value: 'logGroup',
					},
					{
						name: 'Log Stream',
						value: 'logStream',
					},
				],
				default: 'logGroup',
			},
			...logGroupOperations,
			...logGroupFields,
			...logStreamOperations,
			...logStreamFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				let response: IDataObject | IDataObject[];

				const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

				if (Object.keys(additionalFields).length > 0) {
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!requestOptions.body) {
						requestOptions.body = {};
					}
					Object.assign(requestOptions.body, additionalFields);
				}

				if (resource === 'logStream' && operation === 'putEvents') {
					const logEvents = this.getNodeParameter('logEvents', itemIndex) as string;
					try {
						const parsedEvents = JSON.parse(logEvents);
						const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
						if (!requestOptions.body) {
							requestOptions.body = {};
						}
						(requestOptions.body as IDataObject).logEvents = parsedEvents;
					} catch (error) {
						throw new Error('Log Events must be valid JSON array');
					}
				}

				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleCloudWatchLogsError.call(this, response, itemIndex);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response as IDataObject[]),
					{ itemData: { item: itemIndex } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
