import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { WRITE_BASE_URL, QUERY_BASE_URL } from './helpers/constants';
import { handleTimestreamError } from './helpers/errorHandler';

import {
	databaseOperations,
	databaseFields,
	tableOperations,
	tableFields,
	queryOperations,
	queryFields,
} from './descriptions';

export class AwsTimestream implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Timestream',
		name: 'awsTimestream',
		icon: 'file:timestream.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Timestream time series database',
		defaults: {
			name: 'AWS Timestream',
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
			baseURL: WRITE_BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/x-amz-json-1.0',
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
						name: 'Database',
						value: 'database',
					},
					{
						name: 'Query',
						value: 'query',
					},
					{
						name: 'Table',
						value: 'table',
					},
				],
				default: 'database',
			},
			...databaseOperations,
			...databaseFields,
			...tableOperations,
			...tableFields,
			...queryOperations,
			...queryFields,
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

				const requestOptions: IDataObject = { returnFullResponse: false, ignoreHttpStatusErrors: true };

				if (resource === 'query') {
					requestOptions.baseURL = QUERY_BASE_URL;
				}

				const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

				if (Object.keys(additionalFields).length > 0) {
					const nodeParams = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!nodeParams.body) {
						nodeParams.body = {};
					}

					if (additionalFields.Tags && typeof additionalFields.Tags === 'string') {
						try {
							additionalFields.Tags = JSON.parse(additionalFields.Tags as string);
						} catch (error) {
							throw new Error('Tags must be valid JSON array');
						}
					}

					if (additionalFields.RetentionProperties && typeof additionalFields.RetentionProperties === 'string') {
						try {
							additionalFields.RetentionProperties = JSON.parse(additionalFields.RetentionProperties as string);
						} catch (error) {
							throw new Error('RetentionProperties must be valid JSON object');
						}
					}

					if (additionalFields.CommonAttributes && typeof additionalFields.CommonAttributes === 'string') {
						try {
							additionalFields.CommonAttributes = JSON.parse(additionalFields.CommonAttributes as string);
						} catch (error) {
							throw new Error('CommonAttributes must be valid JSON object');
						}
					}

					Object.assign(nodeParams.body, additionalFields);
				}

				if (resource === 'table' && operation === 'writeRecords') {
					const recordsParam = this.getNodeParameter('records', itemIndex) as string;
					try {
						const nodeParams = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
						if (!nodeParams.body) {
							nodeParams.body = {};
						}
						(nodeParams.body as IDataObject).Records = JSON.parse(recordsParam);
					} catch (error) {
						throw new Error('Records must be valid JSON array');
					}
				}

				response = await this.helpers.requestWithAuthentication.call(this, 'aws', requestOptions);

				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleTimestreamError.call(this, response, itemIndex);
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
